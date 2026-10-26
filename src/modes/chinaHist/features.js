// 第三模式附加图层：关隘 / 城市 / 战争（自包含，独立于政权疆域逻辑）
// 每个 builder 只依赖自己的数据集，互不 import，便于单独增删。
//
// 图标全部走 IconLayer + src/lib/iconAtlas.js（canvas 现画）：
//   关隘 = 小城楼 · 交战点 = 红叉 · 行军方向 = 箭头
import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { iconImage, iconMapping } from '../../lib/iconAtlas.js';
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

// 取路线从起点到「已行进比例 frac」的一段（按累计距离插值），用于绘制部队已走过的路径。
// 返回 {coordinates, head, headAngle}，headAngle 为队头行进方向（正北为 0，顺时针度数）。
function traveledPath(route, frac) {
  if (!route || route.length < 2 || frac <= 0) return { coordinates: [], head: route ? route[0] : null, headAngle: 0 };
  if (frac >= 1) {
    const n = route.length;
    return { coordinates: route.slice(), head: route[n - 1], headAngle: bearingOf(route[n - 2], route[n - 1]) };
  }
  const seg = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
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
  const n = route.length;
  return { coordinates: out, head: route[n - 1], headAngle: bearingOf(route[n - 2], route[n - 1]) };
}

// 方位角（正北 0°，顺时针，归一化到 0~360）。经度差按纬度做余弦修正，
// 否则高纬度方向会明显偏。这个值直接喂给 IconLayer 的 getAngle。
function bearingOf(a, b) {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(lat);
  const dy = b[1] - a[1];
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

function pathLen(route) {
  let t = 0;
  for (let i = 1; i < route.length; i++) t += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
  return t;
}

// 沿路径等距取点 → 箭头链（"粗箭头"路线的骨架）
function arrowHeads(route, count) {
  if (!route || route.length < 2) return [];
  const segs = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const d = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total <= 0) return [];
  const out = [];
  for (let k = 1; k <= count; k++) {
    const target = (total * k) / (count + 1);
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= target) {
        const t = segs[i] ? (target - acc) / segs[i] : 0;
        const a = route[i];
        const b = route[i + 1];
        out.push({
          pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
          angle: bearingOf(a, b),
        });
        break;
      }
      acc += segs[i];
    }
  }
  return out;
}

const labelOpts = (o) => ({
  fontFamily: o.labelFontFamily || 'sans-serif',
  fontSettings: o.labelFontSettings,
  characterSet: o.labelChars,
  fontWeight: 700,
});

// —— 关隘图层（城楼图标，可点选看背景）——
export function buildPassLayers(o = {}) {
  const layers = [];
  // 选中光环
  const sel = PASSES.filter((p) => p.id === o.selectedId);
  if (sel.length) {
    layers.push(
      new ScatterplotLayer({
        id: 'chinahist-pass-selected',
        data: sel,
        getPosition: (d) => d.coord,
        radiusUnits: 'pixels',
        getRadius: 21,
        filled: false,
        stroked: true,
        getLineColor: [255, 176, 48, 255],
        lineWidthMinPixels: 2.5,
        pickable: false,
      })
    );
  }
  layers.push(
    new IconLayer({
      id: 'chinahist-pass',
      data: PASSES,
      iconAtlas: iconImage('tower'),
      iconMapping: iconMapping('tower'),
      getIcon: () => 'tower',
      sizeUnits: 'pixels',
      getSize: 30,
      getColor: [255, 255, 255, 255],
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 235, 150, 120],
      onClick: (info) => { if (info.object && o.onPick) o.onPick(info.object); },
    })
  );
  layers.push(
    new TextLayer({
      id: 'chinahist-pass-label',
      data: PASSES,
      getPosition: (d) => d.coord,
      getText: (d) => d.name,
      getSize: 15,
      getColor: [74, 42, 18, 255],
      getPixelOffset: [0, -24],
      stroke: true,
      getStrokeColor: [255, 250, 240, 235],
      strokeWidth: 3,
      pickable: false,
      ...labelOpts(o),
    })
  );
  return layers;
}

// —— 城市图层 ——
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

// 当前年份进行中的战争的时间跨度（供 main.js 驱动动画循环）
export function activeWarSpan(year, focusId) {
  const ws = activeWars(year, focusId);
  if (!ws.length) return null;
  let start = Infinity, end = -Infinity;
  for (const w of ws) {
    if (w.meta.start < start) start = w.meta.start;
    if (w.meta.end > end) end = w.meta.end;
  }
  return { start, end };
}

// —— 战争图层（军队演进）——
// 淡色完整路线（示意整体走向）+ 已行进段粗箭头链 + 行军队头 + 军队名 + 交战点红叉
export function buildWarLayers(year, time, o = {}) {
  const ws = activeWars(year, o.focusWarId);
  if (!ws.length) return [];
  const routes = [];
  const battles = [];
  for (const w of ws) {
    const showLabels = !!o.focusWarId || ws.length <= 1; // 单场回放时标注军队名，多场叠加时避免糊成一片
    for (const f of w.forces) {
      const party = w.parties.find((p) => p.id === f.party) || { color: '#888888', name: f.party, short: f.party };
      const t0 = f.t0 ?? w.meta.start;
      const t1 = f.t1 ?? w.meta.end;
      const frac = t1 > t0 ? Math.max(0, Math.min(1, (time - t0) / (t1 - t0))) : 1;
      const { coordinates: traveled, head, headAngle } = traveledPath(f.route, frac);
      const color = hexToRgb(party.color);
      const len = pathLen(traveled);
      const nArrow = len > 0.4 ? Math.max(2, Math.min(6, Math.round(len / 2.2))) : 0;
      routes.push({
        id: `${w.id}-${f.party}`,
        color,
        full: f.route,
        traveled,
        head,
        headAngle,
        arrows: nArrow ? arrowHeads(traveled, nArrow) : [],
        label: showLabels ? (party.short || party.name) : '',
      });
    }
    for (const b of w.battles || []) {
      const winner = w.parties.find((p) => p.id === b.winner) || {};
      battles.push({ ...b, warId: w.id, color: hexToRgb(winner.color || '#c81e1e') });
    }
  }

  const allArrows = routes.flatMap((r) => r.arrows.map((a) => ({ ...a, color: r.color })));

  const layers = [
    // 完整行军路线（淡色虚线感：细、低透明，示意整体走向）
    new PathLayer({
      id: 'chinahist-war-route-full',
      data: routes,
      getPath: (d) => d.full,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 70],
      getWidth: 2.4,
      widthMinPixels: 1.5,
      capRounded: true,
      jointRounded: true,
    }),
    // 已行进路段（加粗主干）
    new PathLayer({
      id: 'chinahist-war-route-traveled',
      data: routes.filter((r) => r.traveled.length > 1),
      getPath: (d) => d.traveled,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 245],
      getWidth: 7,
      widthMinPixels: 5,
      widthMaxPixels: 14,
      capRounded: true,
      jointRounded: true,
    }),
    // 箭头链（沿已行进段，按行进方向旋转）→ 视觉上成"粗箭头"
    new IconLayer({
      id: 'chinahist-war-arrow',
      data: allArrows,
      iconAtlas: iconImage('arrow'),
      iconMapping: iconMapping('arrow'),
      getIcon: () => 'arrow',
      getPosition: (d) => d.pos,
      getAngle: (d) => d.angle,
      sizeUnits: 'pixels',
      getSize: 26,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 255],
      pickable: false,
    }),
    // 行军队头
    new ScatterplotLayer({
      id: 'chinahist-war-head',
      data: routes.filter((r) => r.head),
      getPosition: (d) => d.head,
      radiusUnits: 'pixels',
      getRadius: 8,
      radiusMinPixels: 6,
      getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 250],
      stroked: true,
      getLineColor: [255, 255, 255, 245],
      lineWidthMinPixels: 2,
      pickable: false,
    }),
  ];

  // 军队/政权名（跟在队头旁，随时间移动）
  if (routes.some((r) => r.label && r.head)) {
    layers.push(
      new TextLayer({
        id: 'chinahist-war-force-label',
        data: routes.filter((r) => r.label && r.head),
        getPosition: (d) => d.head,
        getText: (d) => d.label,
        getSize: 17,
        getColor: (d) => darken(d.color, 0.72),
        getPixelOffset: [0, -30],
        stroke: true,
        getStrokeColor: [255, 253, 245, 245],
        strokeWidth: 4,
        pickable: false,
        ...labelOpts(o),
      })
    );
  }

  if (battles.length) {
    layers.push(
      new IconLayer({
        id: 'chinahist-war-battle',
        data: battles,
        iconAtlas: iconImage('cross'),
        iconMapping: iconMapping('cross'),
        getIcon: () => 'cross',
        getPosition: (d) => d.loc,
        sizeUnits: 'pixels',
        getSize: 30,
        getColor: [255, 255, 255, 255],
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 220, 120, 140],
        onClick: (info) => { if (info.object && o.onBattlePick) o.onBattlePick(info.object); },
      })
    );
    layers.push(
      new TextLayer({
        id: 'chinahist-war-battle-label',
        data: battles,
        getPosition: (d) => d.loc,
        getText: (d) => d.name,
        getSize: 17,
        getColor: [150, 16, 16, 255],
        getPixelOffset: [0, -28],
        stroke: true,
        getStrokeColor: [255, 250, 245, 245],
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

// 战争背景卡：点交战点红叉、或从战争列表页选中都走这里
export function warCard(w) {
  if (!w) return null;
  const m = w.meta || {};
  const parties = (w.parties || [])
    .map((p) => `${p.name}${p.troops ? `（${p.troops}）` : ''}`)
    .join('　vs　');
  const battles = (w.battles || [])
    .map((b) => `${b.name}（${fy(b.at)}）${b.desc ? '：' + b.desc : ''}`)
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
