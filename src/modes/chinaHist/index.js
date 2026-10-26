// 第三幅地图「中国历史地图」核心闭环模块（自包含，不改动 world/china 模式逻辑）
// 职责：根据年份渲染汉/唐/明 + 三国/南北朝/五代十国 的政权疆域（含关键帧交叉淡入），
//       政权都城点、政权名标签，并提供信息卡数据与年份事件。
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { POLITIES, polityById } from './polities.js';

export const CHINA_HIST_MIN = -210;
export const CHINA_HIST_MAX = 1644;

const FADE = 4; // 政权边界处淡入/淡出年数（近似"扩张/更迭"过渡）

// 由 buildChinaHistLayers 注入，供 getPolityInfo 解析中央王朝轮廓几何
let _chinaOutlines = null;

function fy(y) {
  return y < 0 ? `前${-y}` : `${y}`;
}

// 跨政权交叉淡入：存续边界年附近把不透明度从 0 渐变到目标值
function alphaFor(start, end, year, base) {
  if (year < start + FADE) return Math.round(base * Math.max(0, (year - start) / FADE));
  if (year > end - FADE) return Math.round(base * Math.max(0, (end - year) / FADE));
  return base;
}

// 把并立政权的手绘 ring 或中央王朝复用的 outline 轮廓解析成 GeoJSON geometry
function resolveGeometry(p, chinaOutlines) {
  if (p.geom.outline) {
    if (!chinaOutlines || !chinaOutlines.length) return null;
    const cands = chinaOutlines.filter((f) => f.properties?.dynasty === p.geom.outline);
    if (!cands.length) return null;
    // 取年份最接近该政权中点的那一片轮廓
    const mid = (p.start + p.end) / 2;
    const best = cands.reduce((a, b) =>
      Math.abs((b.properties?.year ?? 0) - mid) < Math.abs((a.properties?.year ?? 0) - mid) ? b : a
    );
    return best.geometry;
  }
  if (p.geom.ring) {
    return { type: 'Polygon', coordinates: [p.geom.ring] };
  }
  return null;
}

function centroidOf(geometry) {
  let pts = [];
  if (geometry.type === 'Polygon') pts = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') pts = geometry.coordinates[0][0];
  if (!pts.length) return null;
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}

// 该年份生效（含淡入淡出区间）的政权
function activePolities(year) {
  return POLITIES.filter((p) => year >= p.start && year <= p.end);
}

// 供 main.js 在面板信息卡展示：把政权数据整理成卡片所需结构
export function getPolityInfo(id, year) {
  const p = polityById(id);
  if (!p) return null;
  const geometry = resolveGeometry(p, _chinaOutlines);
  const a = alphaFor(p.start, p.end, year, 235);
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: p.type === 'central' ? '中央王朝' : '并立政权',
    start: p.start,
    end: p.end,
    capital: p.capital,
    capitalCoord: p.capitalCoord,
    desc: p.desc,
    events: (p.events || []).filter((e) => e.year <= year),
    alpha: a,
    centroid: geometry ? (p.labelCoord || centroidOf(geometry)) : p.capitalCoord,
  };
}

// 年份事件（时间轴年份读数点击时展示）
export function getChinaHistYearEvents(year) {
  const acts = activePolities(year);
  if (!acts.length) {
    return { title: `📜 ${fy(year)} · 暂无对应政权`, items: [] };
  }
  const items = acts.map((p) => ({
    t: `${p.name}（${p.type === 'central' ? '中央' : '并立'}）`,
    d: `都城：${p.capital}｜存续 ${fy(p.start)} – ${fy(p.end)}`,
  }));
  const central = acts.find((p) => p.type === 'central');
  return {
    title: `📜 ${fy(year)} · ${central ? central.name + '朝' : '分裂时期'}（共 ${acts.length} 个政权）`,
    items,
  };
}

// 构建本模式全部 deck.gl 图层（main.js 只负责把公共底图图层拼在前面）
export function buildChinaHistLayers(opts) {
  const {
    year,
    chinaOutlines,
    labelChars,
    labelFontSettings,
    labelFontFamily,
    onPolityPick,
  } = opts || {};

  _chinaOutlines = chinaOutlines || null; // 缓存供 getPolityInfo 使用

  const acts = activePolities(year);
  const polityFeatures = [];
  const capitals = [];
  const labels = [];
  for (const p of acts) {
    const geometry = resolveGeometry(p, chinaOutlines);
    if (!geometry) continue;
    const a = alphaFor(p.start, p.end, year, 235);
    if (a <= 0) continue;
    polityFeatures.push({
      type: 'Feature',
      properties: { id: p.id, name: p.name, type: p.type, color: p.color },
      geometry,
    });
    if (p.capitalCoord) capitals.push({ coords: p.capitalCoord, text: p.capital, name: p.name });
    const c = p.labelCoord || centroidOf(geometry);
    if (c) labels.push({ coordinates: c, text: p.name });
  }

  const layers = [];

  // 政权疆域填充层（可点击 → 信息卡）
  if (polityFeatures.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'chinahist-polity',
        data: { type: 'FeatureCollection', features: polityFeatures },
        stroked: true,
        filled: true,
        getFillColor: (f) => {
          const c = f.properties.color;
          const p = polityById(f.properties.id);
          const a = p ? alphaFor(p.start, p.end, year, 235) : 200;
          return [c[0], c[1], c[2], a];
        },
        getLineColor: [60, 25, 15, 235],
        getLineWidth: 1.2,
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        onClick: (info) => {
          if (info.object && onPolityPick) onPolityPick(info.object.properties.id);
        },
      })
    );
  }

  // 都城点 + 名称
  if (capitals.length) {
    layers.push(
      new ScatterplotLayer({
        id: 'chinahist-capital',
        data: capitals,
        getPosition: (o) => o.coords,
        radiusUnits: 'pixels',
        getRadius: 5.5,
        radiusMinPixels: 4,
        getFillColor: [220, 30, 30, 240],
        stroked: true,
        getLineColor: [255, 255, 255, 220],
        lineWidthMinPixels: 1,
        pickable: false,
      })
    );
    layers.push(
      new TextLayer({
        id: 'chinahist-capital-label',
        data: capitals,
        getPosition: (o) => o.coords,
        getText: (o) => o.text,
        getSize: 13,
        getColor: [120, 20, 20, 255],
        getPixelOffset: [0, -10],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
      })
    );
  }

  // 政权名标签（盖在疆域之上）
  if (labels.length) {
    layers.push(
      new TextLayer({
        id: 'chinahist-polity-label',
        data: labels,
        getPosition: (d) => d.coordinates,
        getText: (d) => d.text,
        getSize: 15,
        getColor: [40, 25, 20, 250],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
      })
    );
  }

  return layers;
}

// 「历史疆域」开关在第三模式下的底图：仅绘制**中央王朝**的疆域填充（轻量、无交互），
// 作为政权疆域层的背景。分裂时期（三国/南北朝/五代十国）无中央王朝，此层为空，
// 此时由「政权疆域」层呈现各并立政权。与政权疆域层分工：底图=大一统王朝轮廓，
// 政权层=全部政权（含并立）+ 都城 + 标签 + 点击交互。
export function buildChinaHistBaseLayers(opts) {
  const { year, chinaOutlines } = opts || {};
  const acts = activePolities(year).filter((p) => p.type === 'central');
  if (!acts.length) return [];
  const feats = [];
  for (const p of acts) {
    const geometry = resolveGeometry(p, chinaOutlines);
    if (!geometry) continue;
    feats.push({ type: 'Feature', properties: { id: p.id, name: p.name, color: p.color }, geometry });
  }
  if (!feats.length) return [];
  return [
    new GeoJsonLayer({
      id: 'chinahist-base',
      data: { type: 'FeatureCollection', features: feats },
      stroked: true,
      filled: true,
      getFillColor: (f) => {
        const p = polityById(f.properties.id);
        const a = p ? alphaFor(p.start, p.end, year, 70) : 60;
        return [f.properties.color[0], f.properties.color[1], f.properties.color[2], a];
      },
      getLineColor: [90, 40, 25, 160],
      getLineWidth: 1.1,
      lineWidthMinPixels: 0.8,
      pickable: false,
    }),
  ];
}
