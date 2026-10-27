// 第三幅地图「中国古代史」核心模块（自包含，不改动 world/china 模式逻辑）
// 职责：按年份渲染各政权疆域、都城点、政权名标签，并提供信息卡数据与年份事件。
//
// 数据来自统一模型 src/data/polities（以 src/data/china.js 为唯一数据源，
// 与第二幅图「中国疆域」共用同一批朝代/政权数据，不再各存一份）。
// 疆域由 territoryGen 依据「现代省界并集 + Chaikin 补丁 + 极点内缩标签」生成。
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { politiesAtYear, polityById, eraAtYear } from '../../data/polities/index.js';
import { buildPolityGeometries } from './territoryGen.js';

// 时间轴范围：**先秦传说上限（约前 2700）** 至清亡前夜（1911）。
// 下限不再卡在夏（前 2070）：战争库里"涿鹿之战"记在前 2600（上古传说），
// 若下限是前 2070，跳转时年份会被夹到 -2070，超出该战 [前2600, 前2600] 的窗口，
// → onYear 里"拖离战场年份就结束回放"的守卫立刻把回放踢掉，表现为"点了没演示"，
// 而战争面板仍挂着"回放中"，于是退出按钮点了没反应。多给的 630 年没有政权数据，
// 地图上只有底图与行军路线，正好用来放这一场传说战役。
//
// 上限从 1644 延到 1911：清（1644–1912）是"中国古代史"的最后一朝，此前时间轴停在
// 明末，清只在 1644 那一年露一下就等于没有。1912 起进入民国（polities 里标了 modern，
// 由本模块过滤），所以上限取 1911——帝制最后一年，史段自然收口。
export const CHINA_HIST_MIN = -2700;
export const CHINA_HIST_MAX = 1911;

const FADE = 4; // 政权存续边界处的淡入/淡出年数（近似"扩张/更迭"过渡）
const FADE_HALF = FADE / 2;

// 疆域填充不透明度：刻意压低（235→105），让压在下面的当代省界参考线透出来；
// 疆域边界改由 dissolve 外轮廓单独描边，所以"淡"不等于"糊"。
const POLITY_FILL_ALPHA = 105;

// 描边色 = 属性色压暗（保留色相，边界比填充更实）
function shade(c, k = 0.66) {
  return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
}

function fy(y) {
  return y < 0 ? `前${-y}` : `${y}`;
}

// 跨政权交叉淡入：存续边界年附近把不透明度从 0 渐变到目标值。
//
// 两个必须处理的边界：
//   ① 交界年只有**新朝**被返回（currentEra 取最后一个命中的朝代，如 1644 只出清、
//      不出明），若新朝在这一年 alpha=0，地图会整片空白一格。故淡入窗口以
//      start 为中心（start-2 … start+2），交界年正好 50%。
//   ② 时间轴上边界（清）不是"灭亡"而是"史段到此为止"：若照常淡出，
//      1909–1911 会几乎全透明、1911 年直接 0，清朝等于看不见。故 end ≥ 上限时
//      不做淡出，一律按满不透明度绘制。
function alphaFor(start, end, year, base) {
  if (end < CHINA_HIST_MAX && year > end - FADE_HALF) {
    return Math.round(base * Math.max(0, (end + FADE_HALF - year) / FADE));
  }
  if (year < start + FADE_HALF) {
    // 交界年以 0.7 起步（而非 0）：这一年只画新朝，0 会让整幅地图空一格。
    return Math.round(base * Math.min(1, 0.7 + (year - start) / FADE));
  }
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
  const outlineFeatures = [];
  const capitals = [];
  const labels = [];
  for (const p of acts) {
    if (!ctx.provinceFeatures && !ctx.preqinFeatures) continue;
    const geo = buildPolityGeometries(p, p.seg, ctx);
    if (!geo || !geo.features.length) continue;
    const a = alphaFor(p.start, p.end, year, POLITY_FILL_ALPHA);
    if (a <= 0) continue;
    // 每个省界/补丁多边形作为独立要素；填充层不描边 → 内部省界不显形、不透出杂线。
    for (const f of geo.features) {
      polityFeatures.push({
        type: 'Feature',
        properties: { polityId: p.id, color: p.color, alpha: a },
        geometry: f.geometry,
      });
    }
    // 外轮廓（dissolve 并集边界）：与填充分开画，颜色更实、线条清晰
    for (const f of geo.outline || []) {
      outlineFeatures.push({
        type: 'Feature',
        properties: { polityId: p.id, color: p.color },
        geometry: f.geometry,
      });
    }
    const cap = p.seg.capitalCoord || p.capitalCoord;
    const capName = p.seg.capital || p.capital;
    if (cap && capName) capitals.push({ coords: cap, text: capName, name: p.name });
    if (geo.labelPoint) {
      // 政权名与都城名会撞在一起（标签点通常落在都城所在省的极点，离都城很近）：
      // 靠得近时把政权名下移一点，让"国名"和"都城"各占一行。
      const nearCap = cap && Math.hypot(geo.labelPoint[0] - cap[0], geo.labelPoint[1] - cap[1]) < 1.8;
      labels.push({
        coordinates: geo.labelPoint,
        text: p.name,
        id: p.id,
        offset: nearCap ? [0, 30] : [0, 0],
      });
    }
  }

  const layers = [];

  // 政权疆域填充层（可点击 → 信息卡）。
  // stroked:false 是关键：逐省描边会在低不透明度下把内部省界"描"出来，破坏整片感。
  if (polityFeatures.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'chinahist-polity',
        data: { type: 'FeatureCollection', features: polityFeatures },
        stroked: false,
        filled: true,
        getFillColor: (f) => {
          const c = f.properties.color;
          return [c[0], c[1], c[2], f.properties.alpha];
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 90],
        onClick: (info) => {
          if (info.object && onPolityPick) onPolityPick(info.object.properties.polityId);
        },
      })
    );
  }

  // 疆域外轮廓层（dissolve 后的真实边界，清晰而不压暗内部）
  if (outlineFeatures.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'chinahist-polity-outline',
        data: { type: 'FeatureCollection', features: outlineFeatures },
        stroked: true,
        filled: false,
        getLineColor: (f) => {
          const c = shade(f.properties.color);
          return [c[0], c[1], c[2], 235];
        },
        getLineWidth: 2.6,
        lineWidthMinPixels: 1.8,
        pickable: false,
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
        getRadius: 7,
        radiusMinPixels: 5,
        getFillColor: [220, 30, 30, 245],
        stroked: true,
        getLineColor: [255, 255, 255, 235],
        lineWidthMinPixels: 1.6,
        pickable: false,
      })
    );
    layers.push(
      new TextLayer({
        id: 'chinahist-capital-label',
        data: capitals,
        getPosition: (o) => o.coords,
        getText: (o) => o.text,
        getSize: 19,
        getColor: [128, 20, 20, 255],
        getPixelOffset: [0, -14],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [255, 250, 240, 235],
        strokeWidth: 3,
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
        getSize: 27,
        getColor: [255, 255, 255, 255],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        getPixelOffset: (d) => d.offset,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [40, 22, 16, 235],
        strokeWidth: 3.4,
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
    const a = alphaFor(p.start, p.end, year, 45);
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
      stroked: false,
      filled: true,
      getFillColor: (f) => {
        const c = f.properties.color;
        return [c[0], c[1], c[2], f.properties.alpha];
      },
      pickable: false,
    }),
  ];
}
