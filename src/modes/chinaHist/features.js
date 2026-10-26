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
//   行军方向 = PathLayer 走线 + 队头一个**骑马小人图钉**（同样走 MapLibre Marker，
//   按 bearing 旋转、跑动时有起伏动画）。两军接触后小人消失，原地换成"交战"图标。
//   旧版用 PolygonLayer 画三角箭头，被骑马的图钉取代（箭头方向再准也不如一个会转身
//   的小人直观）。
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PASSES, passById } from './passes.js';
import { citiesAtYear, cityNameAt, cityAliasText, cityById } from './cities.js';
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
  if (!route || route.length < 2) {
    return { coordinates: [], head: route ? route[0] : null, headAngle: 0 };
  }
  if (frac <= 0) {
    // 还没起步：停在起点，但朝向要指向第一段的方向（否则小人一直朝北，起步瞬间会"甩头"）
    return { coordinates: [], head: route[0], headAngle: bearingOf(route[0], route[1]) };
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

// 路线总长（度，只用于"是否原地驻守"的判据，不需要精确）
function routeLength(route) {
  let len = 0;
  for (let i = 1; i < (route || []).length; i++) {
    len += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
  }
  return len;
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
// 三重筛选，避免 68 个点在全国视野下糊成一片：
//   ① 年份：早于建城年的不显示（战国才立的城不该出现在西周地图上）
//   ② rank：1 永远显示，2 在 zoom≥3.5（中国全图就是 3.6），3 在 zoom≥4.8
//   ③ 名称：按当前年份取别名（长安 → 大兴 → 西安）
const RANK_MIN_ZOOM = { 1: 0, 2: 3.5, 3: 4.8 };

export function visibleCities(year, zoom) {
  const z = Number.isFinite(zoom) ? zoom : 4;
  return citiesAtYear(year)
    .filter((c) => z >= (RANK_MIN_ZOOM[c.rank || 2] ?? 0))
    .map((c) => ({ ...c, label: cityNameAt(c, year) }));
}

export function buildCityLayers(o = {}) {
  const data = visibleCities(o.year, o.zoom);
  const layers = [];
  layers.push(
    new ScatterplotLayer({
      id: 'chinahist-city',
      data,
      getPosition: (d) => d.coord,
      radiusUnits: 'pixels',
      getRadius: (d) => (d.rank === 1 ? 7 : d.rank === 2 ? 6 : 5),
      radiusMinPixels: 3,
      getFillColor: (d) => (d.rank === 1 ? [196, 120, 40, 245] : [178, 122, 58, 210]),
      stroked: true,
      getLineColor: [255, 245, 225, 245],
      lineWidthMinPixels: 1.4,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 220, 120, 150],
      onClick: (info) => { if (info.object && o.onPick) o.onPick(info.object); },
    })
  );
  layers.push(
    new TextLayer({
      id: 'chinahist-city-label',
      data,
      getPosition: (d) => d.coord,
      getText: (d) => d.label,
      getSize: (d) => (d.rank === 1 ? 17 : d.rank === 2 ? 14.5 : 12.5),
      getColor: (d) => (d.rank === 1 ? [126, 66, 12, 255] : [138, 96, 48, 245]),
      // 标签错行：一级城名放点的下方，二/三级放上方并缩小。江南、中原一带城市密集
      // （杭州与绍兴只差 0.4°），全部压在点下方会叠成一坨；上下错开能救回来不少。
      getPixelOffset: (d) => (d.rank === 1 ? [0, 15] : d.rank === 2 ? [0, -13] : [0, -11]),
      stroke: true,
      getStrokeColor: [255, 250, 240, 225],
      strokeWidth: 3,
      pickable: false,
      ...labelOpts(o),
    })
  );
  return layers;
}

// —— 战争图钉：行军中的人马 / 接触后的交战图标 ——
// 一支部队一个"骑马小人"，位置 = 队头、朝向 = 行进方位角；
// 两支（或以上）部队都抵达战场后，小人全部撤下，原地换成一个"交战"图标。
// 点击小人或交战图标都能弹出整场战争的背景卡。
const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

export function warPins(year, progress, o = {}) {
  if (!o.focusWarId) return [];
  const ws = activeWars(year, o.focusWarId);
  if (!ws.length) return [];
  const p = clamp01(progress);
  const out = [];
  for (const w of ws) {
    const loc = w.battles?.[0]?.loc || (w.forces?.[0]?.route || []).slice(-1)[0];
    if (!loc) continue;
    // 接触时刻 = 所有"会移动"的部队都到位时的最大进度（原地驻守的不参与，
    // 否则守军的 p1 会把它自己也算成一个"未到位"的部队）
    const movers = (w.forces || []).filter((f) => routeLength(f.route) >= 1e-6);
    const meetAt = movers.length ? Math.max(...movers.map((f) => (f.p1 ?? 1))) : 0.7;
    if (p >= meetAt - 1e-6) {
      out.push({
        id: `clash-${w.id}`,
        kind: 'clash',
        coord: loc,
        label: w.meta.title,
        selected: false,
        payload: { ...(w.battles?.[0] || {}), warId: w.id },
      });
      continue;
    }
    for (const f of w.forces || []) {
      const party = w.parties.find((x) => x.id === f.party) || {};
      const p0 = f.p0 ?? 0;
      const p1 = f.p1 ?? 1;
      const frac = p1 > p0 ? clamp01((p - p0) / (p1 - p0)) : 1;
      const { head, headAngle } = traveledPath(f.route, frac);
      if (!head) continue;
      out.push({
        id: `rider-${w.id}-${f.party}`,
        kind: 'rider',
        coord: head,
        rot: headAngle,
        color: party.color,
        idle: routeLength(f.route) < 1e-6, // 守军原地不动 → 关掉跑动动画
        label: '',
        selected: false,
        payload: { warId: w.id },
      });
    }
  }
  return out;
}

// —— 战争动画图层（军队演进）——
// 淡色完整路线 + 已行进粗线 + 军队名。
// 队头不再是三角箭头/圆点，而是由 warPins() 给出的**骑马小人图钉**（DOM Marker）。
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
      const { coordinates: traveled, head } = traveledPath(f.route, frac);
      // 出发点与战场重合（例：张巡守睢阳，守军本就在城里）→ 视为**驻守不动**：
      // 不画路线，只留军队名。
      routes.push({
        id: `${w.id}-${f.party}`,
        color: hexToRgb(party.color),
        full: f.route,
        traveled,
        head,
        static: routeLength(f.route) < 1e-6,
        label: party.short || party.name,
      });
    }
  }

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

// 城市卡：标题用当前年份的城名（长安/大兴/西安随年份变），并列出全部曾用名
export function cityCard(c, year) {
  if (!c) return null;
  const now = cityNameAt(c, year);
  const lines = [];
  if (now !== c.name) lines.push(['今名', c.name]);
  lines.push(['始建', c.founded], ['鼎盛', c.peak], ['曾用名', cityAliasText(c)]);
  lines.push(['位置', `${c.coord[0].toFixed(2)}, ${c.coord[1].toFixed(2)}`]);
  return {
    name: now,
    kind: '城市',
    desc: c.desc,
    lines,
  };
}

// 年（可带小数，表月/季）
// 年份显示：史料里"同年内的一两个月"会被写成 -1046.05 这样的数（用于排序与时间轴），
// 显示时不应变成"前1046.1"。零头小于 0.15 年就按整数年显示，其余保留一位小数。
const fy = (y) => {
  const a = Math.abs(y);
  const frac = a % 1;
  const n = frac < 0.15 || frac > 0.85 ? Math.round(a) : Math.round(a * 10) / 10;
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
