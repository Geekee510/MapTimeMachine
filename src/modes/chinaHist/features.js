// 第三模式附加图层：关隘 / 城市 / 战争（自包含，独立于政权疆域逻辑）
// 每个 builder 只依赖自己的数据集，互不 import，便于单独增删。
//
// 图标方案（重要）：
//   关隘 / 交战点这类"固定像素 + 带文字 + 可点击"的标记，走 **MapLibre DOM Marker**
//   （见 ui/pinLayer.js + lib/icons.js），不再用 deck.gl IconLayer。
//   原因：IconLayer 的 iconAtlas 是异步道具，图集用 dataURL 时在"多图层 + 逐帧重建"
//   （战争动画每帧新建图层）场景下加载会失败；失败后 deck 退回自动打包模式，而
//   getIcon 返回的是图集键名而非图片地址 → 图标静默不显示（实测关隘只剩个别出现）。
//
//   行军方向 = PathLayer 走线 + 末端一个**地理坐标三角箭头**（按 zoom 换算像素大小），
//   方向由 bearing 直接算出，不再依赖图标旋转。
import { PathLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PASSES, passById } from './passes.js';
import { CITIES, cityById } from './cities.js';
import { WARS, activeWars, warById } from './wars.js';

function hexToRgb(hex) {
  const h = String(hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 描边/文字用：把颜色压暗，保证在浅底图上够对比
function darken(c, k = 0.62) {
  return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
}

// 方位角（正北 0°，顺时针）。经度差按纬度做余弦修正，否则高纬度方向会明显偏。
function bearingOf(a, b) {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(lat);
  const dy = b[1] - a[1];
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

// 取路线从起点到「已行进比例 frac」的一段（按累计距离插值）。
// 返回 {coordinates, head, headAngle}，headAngle 为队头行进方向（正北 0°，顺时针）。
function traveledPath(route, frac) {
  if (!route || route.length < 2 || frac <= 0) {
    return { coordinates: [], head: route ? route[0] : null, headAngle: 0 };
  }
  const n = route.length;
  if (frac >= 1) {
    return { coordinates: route.slice(), head: route[n - 1], headAngle: bearingOf(route[n - 2], route[n - 1]) };
  }
  const seg = [];
  let total = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    seg.push(d);
    total += d;
  }
  const target = total * frac;
  const out = [route[0]];
  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target) {
      const t = seg[i] ? (target - acc) / seg[i] : 0;
      const head = [
        route[i][0] + (route[i + 1][0] - route[i][0]) * t,
        route[i][1] + (route[i + 1][1] - route[i][1]) * t,
      ];
      out.push(head);
      return { coordinates: out, head, headAngle: bearingOf(route[i], route[i + 1]) };
    }
    acc += seg[i];
    out.push(route[i + 1]);
  }
  return { coordinates: out, head: route[n - 1], headAngle: bearingOf(route[n - 2], route[n - 1]) };
}

// 末端箭头三角（地理坐标，但尺寸按当前 zoom 折算成固定像素）
// 屏幕像素 → 经纬度：经度 360/(256·2^z)；纬度再乘 cos(lat)（墨卡托的纵向拉伸）。
function arrowTriangle(head, bearingDeg, zoom, lenPx = 14, widePx = 5.5) {
  const z = Number.isFinite(zoom) ? zoom : 4;
  const lat = (head[1] * Math.PI) / 180;
  const cos = Math.max(0.25, Math.cos(lat));
  const degPerPx = 360 / (256 * Math.pow(2, z));
  const ax = degPerPx / cos; // 每像素对应经度
  const ay = degPerPx * cos; // 每像素对应纬度
  const th = (bearingDeg * Math.PI) / 180;
  const ux = Math.sin(th);
  const uy = Math.cos(th);
  const base = [head[0] - ux * lenPx * ax, head[1] - uy * lenPx * ay];
  const nx = -Math.cos(th);
  const ny = Math.sin(th);
  return [
    head,
    [base[0] + nx * widePx * ax, base[1] + ny * widePx * ay],
    [base[0] - nx * widePx * ax, base[1] - ny * widePx * ay],
  ];
}

const labelOpts = (o) => ({
  fontFamily: o.labelFontFamily || 'sans-serif',
  fontSettings: o.labelFontSettings,
  characterSet: o.labelChars,
  fontWeight: 700,
});

// —— 关隘：返回地图图钉描述（渲染由 ui/pinLayer.js 负责）——
export function passPins(o = {}) {
  return PASSES.map((p) => ({
    id: `pass-${p.id}`,
    kind: 'pass',
    coord: p.coord,
    label: p.name,
    selected: p.id === o.selectedId,
    payload: p,
  }));
}

// —— 城市图层（圆点 + 名称）——
export function buildCityLayers(o = {}) {
  const layers = [];
  layers.push(
    new ScatterplotLayer({
      id: 'chinahist-city',
      data: CITIES,
      getPosition: (d) => d.coord,
      radiusUnits: 'pixels',
      getRadius: 7,
      radiusMinPixels: 5,
      getFillColor: [196, 120, 40, 240],
      stroked: true,
      getLineColor: [255, 245, 225, 245],
      lineWidthMinPixels: 1.6,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 220, 120, 150],
      onClick: (info) => { if (info.object && o.onPick) o.onPick(info.object); },
    })
  );
  layers.push(
    new TextLayer({
      id: 'chinahist-city-label',
      data: CITIES,
      getPosition: (d) => d.coord,
      getText: (d) => d.name,
      getSize: 16,
      getColor: [126, 66, 12, 255],
      getPixelOffset: [0, 15],
      stroke: true,
      getStrokeColor: [255, 250, 240, 225],
      strokeWidth: 3,
      pickable: false,
      ...labelOpts(o),
    })
  );
  return layers;
}

// 交战点图钉（只在回放某一场战争时出现）
export function warBattlePins(year, focusId) {
  if (!focusId) return [];
  const out = [];
  for (const w of activeWars(year, focusId)) {
    for (const b of w.battles || []) {
      out.push({
        id: `battle-${w.id}-${b.name}`,
        kind: 'battle',
        coord: b.loc,
        label: b.name,
        selected: false,
        payload: { ...b, warId: w.id },
      });
    }
  }
  return out;
}

// —— 战争动画图层（军队演进）——
// 淡色完整路线 + 已行进粗线 + 末端箭头 + 队头点 + 军队名（交战点由图钉层画）
// progress = 0..1 的**动画进度**（不再是年份）。按进度驱动的好处：无论一场战争
// 在史料上只占 1 个月还是 3 年，回放时长都恒定，且不会因"年份跨度 < 最小跨度"
// 让军队卡在半路（旧版就是因此停在中途）。
export function buildWarLayers(year, progress, o = {}) {
  const ws = activeWars(year, o.focusWarId);
  if (!ws.length) return [];
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const routes = [];
  for (const w of ws) {
    for (const f of w.forces) {
      const party = w.parties.find((x) => x.id === f.party) || { color: '#888888', name: f.party, short: f.party };
      const p0 = f.p0 ?? 0;
      const p1 = f.p1 ?? 1;
      const frac = p1 > p0 ? Math.max(0, Math.min(1, (p - p0) / (p1 - p0))) : 1;
      const { coordinates: traveled, head, headAngle } = traveledPath(f.route, frac);
      const color = hexToRgb(party.color);
      // 出发点与战场重合（例：张巡守睢阳，守军本就在城里）→ 视为**驻守不动**：
      // 不画路线、不画箭头，只留队头点与军队名。否则三个重合点会生成零长路线，
      // 方位角退化成"正北"，在地图上留下一个莫名其妙的三角形。
      let len = 0;
      for (let i = 1; i < f.route.length; i++) {
        len += Math.hypot(f.route[i][0] - f.route[i - 1][0], f.route[i][1] - f.route[i - 1][1]);
      }
      routes.push({
        id: `${w.id}-${f.party}`,
        color,
        full: f.route,
        traveled,
        head,
        headAngle,
        static: len < 1e-6,
        label: party.short || party.name,
      });
    }
  }

  const heads = routes
    .filter((r) => r.head && !r.static && r.traveled.length > 1)
    .map((r) => ({ poly: arrowTriangle(r.head, r.headAngle, o.zoom), color: r.color }));

  const layers = [
    // 完整行军路线（淡色，示意整体走向）
    new PathLayer({
      id: 'chinahist-war-route-full',
      data: routes.filter((r) => !r.static),
      getPath: (d) => d.full,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 90],
      getWidth: 2.2,
      widthMinPixels: 1.4,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),
    // 已行进路段（粗主干）
    new PathLayer({
      id: 'chinahist-war-route-traveled',
      data: routes.filter((r) => !r.static && r.traveled.length > 1),
      getPath: (d) => d.traveled,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 240],
      getWidth: 5,
      widthMinPixels: 4,
      widthMaxPixels: 12,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),
    // 末端箭头（三角，尺寸按 zoom 折算 → 屏幕上恒为 ~22px）
    new PolygonLayer({
      id: 'chinahist-war-arrowhead',
      data: heads,
      getPolygon: (d) => d.poly,
      getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 250],
      stroked: true,
      getLineColor: (d) => [Math.round(d.color[0] * 0.55), Math.round(d.color[1] * 0.55), Math.round(d.color[2] * 0.55), 200],
      getLineWidth: 1,
      lineWidthMinPixels: 0.8,
      pickable: false,
    }),
    // 行军队头
    new ScatterplotLayer({
      id: 'chinahist-war-head',
      data: routes.filter((r) => r.head),
      getPosition: (d) => d.head,
      radiusUnits: 'pixels',
      getRadius: 5,
      radiusMinPixels: 4,
      getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 250],
      stroked: true,
      getLineColor: [255, 255, 255, 245],
      lineWidthMinPixels: 1.4,
      pickable: false,
    }),
  ];

  // 军队/政权名（跟在队头旁）
  if (routes.some((r) => r.label && r.head)) {
    layers.push(
      new TextLayer({
        id: 'chinahist-war-force-label',
        data: routes.filter((r) => r.label && r.head),
        getPosition: (d) => d.head,
        getText: (d) => d.label,
        getSize: 17,
        getColor: (d) => darken(d.color, 0.72),
        getPixelOffset: [0, -26],
        stroke: true,
        getStrokeColor: [255, 253, 245, 245],
        strokeWidth: 4,
        pickable: false,
        ...labelOpts(o),
      })
    );
  }
  return layers;
}

// —— 卡片数据（供 panel.showPlace 统一渲染）——
export function passCard(p) {
  if (!p) return null;
  return {
    name: p.name,
    kind: '关隘',
    desc: p.desc,
    lines: [
      ['设置年代', p.since],
      ['战略地位', p.role],
      ['相关朝代', (p.dynasties || []).join(' / ')],
      ['位置', `${p.coord[0].toFixed(2)}, ${p.coord[1].toFixed(2)}`],
    ],
  };
}

export function cityCard(c) {
  if (!c) return null;
  return {
    name: c.name,
    kind: '城市',
    desc: c.desc,
    lines: [
      ['始建', c.founded],
      ['鼎盛', c.peak],
      ['位置', `${c.coord[0].toFixed(2)}, ${c.coord[1].toFixed(2)}`],
    ],
  };
}

// 年（可带小数，表月/季）
const fy = (y) => {
  const n = Math.round(Math.abs(y) * 10) / 10;
  return y < 0 ? `前${n}` : `${n}`;
};

// 战争背景卡：点交战点图钉、或从战争列表页选中都走这里
export function warCard(w) {
  if (!w) return null;
  const m = w.meta || {};
  const parties = (w.parties || [])
    .map((p) => `${p.name}${p.troops ? `（${p.troops}）` : ''}`)
    .join('　vs　');
  const battles = (w.battles || [])
    .map((b) => `${b.name}（${fy(b.at)}）`)
    .join('；');
  return {
    name: m.title,
    kind: `${m.era || '战争'} · ${fy(m.start)} – ${fy(m.end)}`,
    desc: m.desc,
    lines: [
      ['时间', `${fy(m.start)} – ${fy(m.end)}`],
      ['战场', m.place],
      ['参战方', parties],
      ['结果', m.result],
      ['关键战役', battles],
    ],
  };
}

// 交战点点击：展示该场战争的完整背景
export function battleCard(b) {
  if (!b) return null;
  return warCard(warById(b.warId)) || { name: b.name, kind: '战役', desc: b.desc, lines: [] };
}

// 便于外部按 id 取（编辑器/其他模块可能用）
export { passById, cityById, warById, WARS };
