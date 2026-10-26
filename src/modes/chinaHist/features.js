// 第三模式附加图层：关隘 / 城市 / 战争（自包含，独立于政权疆域逻辑）
// 每个 builder 只依赖自己的数据集，互不 import，便于单独增删。
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PASSES, passById } from './passes.js';
import { CITIES, cityById } from './cities.js';
import { WARS, warsAtYear } from './wars.js';

function hexToRgb(hex) {
  const h = String(hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 取路线从起点到「已行进比例 frac」的一段（按累计距离插值），用于绘制部队已走过的路径。
// 返回 [{coordinates, head}]，head 为当前队头坐标。
function traveledPath(route, frac) {
  if (!route || route.length < 2 || frac <= 0) return { coordinates: [], head: route ? route[0] : null };
  if (frac >= 1) return { coordinates: route.slice(), head: route[route.length - 1] };
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
      return { coordinates: out, head };
    }
    acc += seg[i];
    out.push(route[i + 1]);
  }
  return { coordinates: out, head: route[route.length - 1] };
}

const labelOpts = (o) => ({
  fontFamily: o.labelFontFamily || 'sans-serif',
  fontSettings: o.labelFontSettings,
  characterSet: o.labelChars,
  fontWeight: 600,
});

// —— 关隘图层 ——
export function buildPassLayers(o = {}) {
  const layers = [];
  layers.push(
    new ScatterplotLayer({
      id: 'chinahist-pass',
      data: PASSES,
      getPosition: (d) => d.coord,
      radiusUnits: 'pixels',
      getRadius: 4,
      radiusMinPixels: 3,
      getFillColor: [120, 84, 40, 235],
      stroked: true,
      getLineColor: [255, 240, 210, 240],
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 235, 150, 140],
      onClick: (info) => { if (info.object && o.onPick) o.onPick(info.object); },
    })
  );
  layers.push(
    new TextLayer({
      id: 'chinahist-pass-label',
      data: PASSES,
      getPosition: (d) => d.coord,
      getText: (d) => d.name,
      getSize: 11,
      getColor: [92, 60, 30, 235],
      getPixelOffset: [0, -9],
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
      getRadius: 4.5,
      radiusMinPixels: 3.5,
      getFillColor: [196, 120, 40, 235],
      stroked: true,
      getLineColor: [255, 245, 225, 240],
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 220, 120, 140],
      onClick: (info) => { if (info.object && o.onPick) o.onPick(info.object); },
    })
  );
  layers.push(
    new TextLayer({
      id: 'chinahist-city-label',
      data: CITIES,
      getPosition: (d) => d.coord,
      getText: (d) => d.name,
      getSize: 11,
      getColor: [140, 80, 20, 235],
      getPixelOffset: [0, 10],
      pickable: false,
      ...labelOpts(o),
    })
  );
  return layers;
}

// 当前年份进行中的战争的时间跨度（供 main.js 驱动动画循环）
export function activeWarSpan(year) {
  const ws = warsAtYear(year);
  if (!ws.length) return null;
  let start = Infinity, end = -Infinity;
  for (const w of ws) {
    if (w.meta.start < start) start = w.meta.start;
    if (w.meta.end > end) end = w.meta.end;
  }
  return { start, end };
}

// —— 战争图层（军队演进：淡色完整路线 + 高亮已行进段 + 行军队头 + 战役点）——
// 用 PathLayer 实现，无需 TripsLayer（@deck.gl/geo-layers 未安装）。
// time 为当前战争时间（年，可小数）；每支军队按 (time - t0)/(t1 - t0) 比例推进。
export function buildWarLayers(year, time, o = {}) {
  const ws = warsAtYear(year);
  if (!ws.length) return [];
  const routes = []; // {id,color,full:[...],traveled:[...],head:[...]}
  const battles = [];
  for (const w of ws) {
    for (const f of w.forces) {
      const party = w.parties.find((p) => p.id === f.party) || { color: '#888888', name: f.party };
      const t0 = f.t0 ?? w.meta.start;
      const t1 = f.t1 ?? w.meta.end;
      const frac = t1 > t0 ? Math.max(0, Math.min(1, (time - t0) / (t1 - t0))) : 1;
      const { coordinates: traveled, head } = traveledPath(f.route, frac);
      routes.push({ id: `${w.id}-${f.party}`, color: hexToRgb(party.color), full: f.route, traveled, head });
    }
    for (const b of w.battles || []) {
      battles.push({ ...b, warId: w.id, color: hexToRgb((w.parties.find((p) => p.id === b.winner) || {}).color || '#c81e1e') });
    }
  }

  const layers = [
    // 完整行军路线（淡色，示意整体走向）
    new PathLayer({
      id: 'chinahist-war-route-full',
      data: routes,
      getPath: (d) => d.full,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 55],
      getWidth: 2,
      widthMinPixels: 1,
      capRounded: true,
      jointRounded: true,
    }),
    // 已行进路段（高亮，随 time 增长）
    new PathLayer({
      id: 'chinahist-war-route-traveled',
      data: routes.filter((r) => r.traveled.length > 1),
      getPath: (d) => d.traveled,
      getColor: (d) => [d.color[0], d.color[1], d.color[2], 235],
      getWidth: 3.4,
      widthMinPixels: 2.4,
      capRounded: true,
      jointRounded: true,
    }),
    // 行军队头（发光点）
    new ScatterplotLayer({
      id: 'chinahist-war-head',
      data: routes.filter((r) => r.head),
      getPosition: (d) => d.head,
      radiusUnits: 'pixels',
      getRadius: 6.5,
      radiusMinPixels: 5,
      getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 245],
      stroked: true,
      getLineColor: [255, 255, 255, 235],
      lineWidthMinPixels: 1.5,
      pickable: false,
    }),
  ];

  if (battles.length) {
    layers.push(
      new ScatterplotLayer({
        id: 'chinahist-war-battle',
        data: battles,
        getPosition: (d) => d.loc,
        radiusUnits: 'pixels',
        getRadius: 7,
        radiusMinPixels: 6,
        getFillColor: (d) => [...d.color, 235],
        stroked: true,
        getLineColor: [255, 255, 255, 245],
        lineWidthMinPixels: 1.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 180, 150],
        onClick: (info) => { if (info.object && o.onBattlePick) o.onBattlePick(info.object); },
      })
    );
    layers.push(
      new TextLayer({
        id: 'chinahist-war-battle-label',
        data: battles,
        getPosition: (d) => d.loc,
        getText: (d) => d.name,
        getSize: 12,
        getColor: [150, 20, 20, 255],
        getPixelOffset: [0, -13],
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

export function battleCard(b) {
  if (!b) return null;
  return {
    name: b.name,
    kind: '战役',
    desc: b.desc,
    lines: [
      ['时间', b.at < 0 ? `前${Math.abs(Math.round(b.at * 10) / 10)}` : `${Math.round(b.at * 10) / 10}`],
      ['地点', `${b.loc[0].toFixed(2)}, ${b.loc[1].toFixed(2)}`],
    ],
  };
}

// 便于外部按 id 取（编辑器/其他模块可能用）
export { passById, cityById };
