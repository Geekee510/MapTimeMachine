// 第三幅地图「中国历史地图」核心模块（自包含，不改动 world/china 模式逻辑）
// 职责：按年份渲染各政权疆域、都城点、政权名标签，并提供信息卡数据与年份事件。
//
// 数据来自统一模型 src/data/polities（以 src/data/china.js 为唯一数据源，
// 与第二幅图「中国疆域」共用同一批朝代/政权数据，不再各存一份）。
// 疆域由 territoryGen 依据「现代省界并集 + Chaikin 补丁 + 极点内缩标签」生成。
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { politiesAtYear, polityById, eraAtYear } from '../../data/polities/index.js';
import { buildPolityGeometries } from './territoryGen.js';

// 时间轴范围：夏（约前 2070）至明末清初前夜。
// 清代及以后的近代史由单独的地图承载，不在此模式内。
export const CHINA_HIST_MIN = -2070;
export const CHINA_HIST_MAX = 1644;

const FADE = 4; // 政权存续边界处的淡入/淡出年数（近似"扩张/更迭"过渡）

function fy(y) {
  return y < 0 ? `前${-y}` : `${y}`;
}

// 跨政权交叉淡入：存续边界年附近把不透明度从 0 渐变到目标值
function alphaFor(start, end, year, base) {
  if (year < start + FADE) return Math.round(base * Math.max(0, (year - start) / FADE));
  if (year > end - FADE) return Math.round(base * Math.max(0, (end - year) / FADE));
  return base;
}

function geomCtx(opts) {
  return {
    provinceFeatures: opts.chinaProvinces,
    preqinFeatures: opts.chinaPreqin,
  };
}

// 供 main.js 在面板信息卡展示：把政权数据整理成卡片所需结构
export function getPolityInfo(id, year, opts = {}) {
  const p = polityById(id);
  if (!p) return null;
  // 该年生效的切片（信息卡需要显示"这一年"的疆域形态与都城）
  const active = politiesAtYear(year).find((x) => x.id === id);
  const seg = active ? active.seg : p.segs[p.segs.length - 1];
  const geo = opts.chinaProvinces ? buildPolityGeometries(p, seg, geomCtx(opts)) : null;
  const a = alphaFor(p.start, p.end, year, 235);
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: p.type === 'central' ? '中央王朝' : '并立政权',
    eraName: p.eraName,
    start: p.start,
    end: p.end,
    capital: seg.capital || p.capital,
    capitalCoord: seg.capitalCoord || p.capitalCoord,
    desc: p.desc,
    events: (p.events || []).filter((e) => e.year <= year),
    alpha: a,
    centroid: geo ? geo.labelPoint : (seg.capitalCoord || p.capitalCoord),
  };
}

// 年份事件（时间轴年份读数点击时展示）
export function getChinaHistYearEvents(year) {
  const acts = politiesAtYear(year);
  if (!acts.length) {
    return { title: `📜 ${fy(year)} · 暂无对应政权`, items: [] };
  }
  const items = acts.map((p) => ({
    t: `${p.name}（${p.type === 'central' ? '中央' : '并立'}）`,
    d: `都城：${p.seg.capital || p.capital || '—'}｜存续 ${fy(p.start)} – ${fy(p.end)}`,
  }));
  const central = acts.find((p) => p.type === 'central');
  const era = eraAtYear(year);
  const head = central ? `${central.name}朝` : (era ? era.name : '分裂时期');
  return {
    title: `📜 ${fy(year)} · ${head}（共 ${acts.length} 个政权）`,
    items,
  };
}

// 构建本模式全部 deck.gl 图层（main.js 只负责把公共底图图层拼在前面）
export function buildChinaHistLayers(opts) {
  const {
    year,
    labelChars,
    labelFontSettings,
    labelFontFamily,
    onPolityPick,
  } = opts || {};

  const acts = politiesAtYear(year);
  const ctx = geomCtx(opts);
  const polityFeatures = [];
  const capitals = [];
  const labels = [];
  for (const p of acts) {
    if (!ctx.provinceFeatures && !ctx.preqinFeatures) continue;
    const geo = buildPolityGeometries(p, p.seg, ctx);
    if (!geo || !geo.features.length) continue;
    const a = alphaFor(p.start, p.end, year, 235);
    if (a <= 0) continue;
    // 每个省界/补丁多边形作为独立要素，但同色渲染（描边=填充）即视觉合并为一片疆域，
    // 内部省界因同色而隐形，只留外轮廓 —— 无需昂贵的几何并集运算。
    for (const f of geo.features) {
      polityFeatures.push({
        type: 'Feature',
        properties: { polityId: p.id, color: p.color, alpha: a },
        geometry: f.geometry,
      });
    }
    const cap = p.seg.capitalCoord || p.capitalCoord;
    const capName = p.seg.capital || p.capital;
    if (cap && capName) capitals.push({ coords: cap, text: capName, name: p.name });
    if (geo.labelPoint) labels.push({ coordinates: geo.labelPoint, text: p.name, id: p.id });
  }

  const layers = [];

  // 政权疆域填充层（可点击 → 信息卡）。描边色=填充色 → 内部省界隐形、只显外轮廓。
  if (polityFeatures.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'chinahist-polity',
        data: { type: 'FeatureCollection', features: polityFeatures },
        stroked: true,
        filled: true,
        getFillColor: (f) => {
          const c = f.properties.color;
          return [c[0], c[1], c[2], f.properties.alpha];
        },
        // 描边与填充同色：内部省界被"吃掉"，只剩外轮廓
        getLineColor: (f) => {
          const c = f.properties.color;
          return [c[0], c[1], c[2], 255];
        },
        getLineWidth: 1.4,
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 70],
        onClick: (info) => {
          if (info.object && onPolityPick) onPolityPick(info.object.properties.polityId);
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

  // 政权名标签（极点内缩定位，永远落在疆域内部、不靠边）
  if (labels.length) {
    layers.push(
      new TextLayer({
        id: 'chinahist-polity-label',
        data: labels,
        getPosition: (d) => d.coordinates,
        getText: (d) => d.text,
        getSize: 16,
        getColor: [255, 255, 255, 250],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        getPixelOffset: [0, 0],
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [40, 25, 20, 220],
        strokeWidth: 2.2,
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
  const { year } = opts || {};
  const acts = politiesAtYear(year).filter((p) => p.type === 'central');
  if (!acts.length) return [];
  const ctx = geomCtx(opts);
  const feats = [];
  for (const p of acts) {
    const geo = buildPolityGeometries(p, p.seg, ctx);
    const a = alphaFor(p.start, p.end, year, 70);
    for (const f of geo.features) {
      feats.push({
        type: 'Feature',
        properties: { polityId: p.id, color: p.color, alpha: a },
        geometry: f.geometry,
      });
    }
  }
  if (!feats.length) return [];
  return [
    new GeoJsonLayer({
      id: 'chinahist-base',
      data: { type: 'FeatureCollection', features: feats },
      stroked: true,
      filled: true,
      getFillColor: (f) => {
        const c = f.properties.color;
        return [c[0], c[1], c[2], f.properties.alpha];
      },
      getLineColor: (f) => {
        const c = f.properties.color;
        return [c[0], c[1], c[2], 255];
      },
      getLineWidth: 1.1,
      lineWidthMinPixels: 0.8,
      pickable: false,
    }),
  ];
}
