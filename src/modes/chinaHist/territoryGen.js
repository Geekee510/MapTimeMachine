// 疆域生成器（第三幅图）：把一个政权的「时间切片(seg)」变成可渲染的多边形集合
// ---------------------------------------------------------------------------
// 输入：polity + 该年生效的 seg + 已加载的省界/先秦几何
// 输出：{ features: [Polygon Feature...], labelPoint: [lng,lat] }
//
// 几何来源三种（可叠加）：
//   1) seg.provinces（中文关键词 → adcode → 取省界完整几何）
//      现代省级边界本就沿山水走向、沿海岸线绘制，因此疆域天然贴合地形、
//      贴海岸、不笔直，且零人工描摹。这是主体方法。
//   2) seg.patches（手绘环，超出今国境的历史疆土：唐漠北、元/清外蒙古）
//      Chaikin 磨圆，消除"生硬直线"感。
//   3) seg.rawKey（外部真实几何：夏 'Xia' / 西周 'Zhoa'，来自 china_preqin.geojson）
//      这三朝无法用省界表达（夏商周时的"省"不存在），必须用真实几何。
//
// 渲染约定：填充层**不描边**（否则内部省界会显形），外轮廓由本模块 dissolve
// 出的真实并集环单独绘制。这样填充可以用较低不透明度（省界线透得出来），
// 而疆域边界仍然清晰 —— 两者不再互相将就。
//
// 标签：极点内缩(polylabel)，优先取「都城所在省份」的最内缩点——既靠近都城、
// 又保证标签落在疆域内部、绝不在边缘。
//
// 数据合规：仅使用公开的现代行政区划边界与 CC BY-SA 的 historical-basemaps 快照，
// 不打包/描摹受版权保护的专题地图（谭图等）。产出为"示意级"疆域。

import { simplifyGeometry, chaikin, dissolveRings } from '../../lib/geo.js';
import { polylabel, pointInRing, distToRing } from '../../lib/polylabel.js';
import { resolveAdcodes, resolveRawGeometry } from '../../data/polities/index.js';

const SIMPLIFY_EPS = 0.04; // ~4km，低容差：去锯齿但保形
// 轮廓环的两道过滤（都是为了滤掉 dissolve 产生的"碎片/毛刺"）：
//   · MIN_OUTLINE_AREA —— 面积下限（0.015°² ≈ 150km²），小礁石不进轮廓；
//   · MAX_RING_COMPACTNESS —— 周长²/面积 上限。正圆约 12.6、正常海岸线 ≤120；
//     实测断头链被"补口"闭合后会形成细长丝（比值 250~1500），画出来就是图上
//     那些莫名的短划线。两道条件叠加可干净去掉，且不误伤海南/台湾/崇明等真岛屿。
const MIN_OUTLINE_AREA = 0.015;
const MAX_RING_COMPACTNESS = 400;

// 按「政权 id + 切片起始年」缓存：同一政权不同时间切片的疆域不同，不能混用。
const _cache = new Map();

export function clearTerritoryCache() {
  _cache.clear();
}

function findProvince(provinceFeatures, adcode) {
  return provinceFeatures.find(
    (pf) => String(pf.properties?.adcode) === String(adcode)
  ) || null;
}

// 取一个省要素的全部「外环」（Polygon 取第 0 环；MultiPolygon 逐块取第 0 环）
function provinceOuterRings(f) {
  const g = f?.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates[0]];
  if (g.type === 'MultiPolygon') return g.coordinates.map((c) => c[0]);
  return [];
}

// 把任意几何拆成「独立的 Polygon feature」——每省/每块一个 feature，
// 规避 deck.gl 对 MultiPolygon 内外环 even-odd 判定的问题。
function pushGeometryAsPolygons(features, geom, simplify) {
  if (!geom) return;
  const g = simplify ? simplifyGeometry(geom, SIMPLIFY_EPS) : geom;
  if (g.type === 'Polygon') {
    features.push({ type: 'Feature', geometry: g });
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates) {
      features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly } });
    }
  }
}

// 标签锚点：都城所在省份的最内缩点 → 否则内接半径最大的省份 → 否则都城坐标
function computeLabelPoint(seg, provinceFeatures, adcodes) {
  const cap = seg.capitalCoord;
  if (cap && provinceFeatures) {
    let best = null;
    for (const adcode of adcodes) {
      const f = findProvince(provinceFeatures, adcode);
      if (!f) continue;
      for (const r of provinceOuterRings(f)) {
        if (!pointInRing(cap[0], cap[1], r)) continue;
        const pt = polylabel(r);
        const d = distToRing(pt[0], pt[1], r);
        if (!best || d > best.d) best = { d, point: pt };
      }
    }
    if (best) return best.point;
  }
  if (provinceFeatures) {
    let fb = null;
    for (const adcode of adcodes) {
      const f = findProvince(provinceFeatures, adcode);
      if (!f) continue;
      for (const r of provinceOuterRings(f)) {
        const pt = polylabel(r);
        const d = distToRing(pt[0], pt[1], r);
        if (!fb || d > fb.d) fb = { d, point: pt };
      }
    }
    if (fb) return fb.point;
  }
  return cap || [104, 36];
}

// 环面积（平方度，取绝对值）
function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

// 环周长（度）
function ringPerimeter(ring) {
  let s = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    s += Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1]);
  }
  return s;
}

// 是否为"可画的"轮廓环（见 MIN_OUTLINE_AREA / MAX_RING_COMPACTNESS 注释）
function isDrawableRing(ring) {
  if (!ring || ring.length < 4) return false;
  const a = ringArea(ring);
  if (a < MIN_OUTLINE_AREA) return false;
  const p = ringPerimeter(ring);
  return (p * p) / a <= MAX_RING_COMPACTNESS;
}

// 由填充多边形算出「并集外轮廓」的闭合环 → GeoJSON Polygon 要素。
// 单块疆土无需 dissolve（直接用自己的环）；碎块先按面积过滤再进边计数。
function buildOutline(features) {
  if (!features.length) return [];
  const rings = [];
  for (const f of features) {
    const r = f.geometry?.coordinates?.[0];
    if (isDrawableRing(r)) rings.push(r);
  }
  if (!rings.length) return [];
  const dissolved = dissolveRings(rings, 5);
  return dissolved
    .filter(isDrawableRing)
    .map((ring) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } }));
}

// 主入口。
//   polity —— 统一政权对象（src/data/polities）
//   seg    —— 该年份生效的时间切片
//   ctx    —— { provinceFeatures, preqinFeatures }
export function buildPolityGeometries(polity, seg, ctx = {}) {
  const cacheKey = `${polity.id}@${seg?.start ?? 'na'}`;
  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  const { provinceFeatures, preqinFeatures } = ctx;

  // ⚠️ 数据尚未到位时不缓存：否则会把"空几何"缓存下来，之后省界/先秦几何
  // 加载完成也再不会重算（首屏切换模式时的异步加载竞态）。
  const needProvinces = (seg?.provinces || []).length > 0 && seg.provinces.some((k) => k !== '蒙古');
  const needPreqin = !!seg?.rawKey;
  const missing = (needProvinces && !provinceFeatures) || (needPreqin && !preqinFeatures);
  if (missing) return { features: [], outline: [], labelPoint: seg?.capitalCoord || [104, 36] };

  const features = [];

  // 1) 省界并集（主体）
  const adcodes = resolveAdcodes(seg?.provinces, provinceFeatures);
  for (const adcode of adcodes) {
    const f = findProvince(provinceFeatures, adcode);
    if (f?.geometry) pushGeometryAsPolygons(features, f.geometry, true);
  }

  // 2) 手绘补丁（超出今国境的历史疆土），Chaikin 磨圆
  for (const ring of seg?.patches || []) {
    if (!Array.isArray(ring) || ring.length < 3) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [chaikin(ring, 4)] },
    });
  }

  // 3) 外部真实几何（夏/西周）
  if (seg?.rawKey) {
    const geom = resolveRawGeometry(seg.rawKey, preqinFeatures);
    if (geom) pushGeometryAsPolygons(features, geom, true);
  }

  const result = {
    features,
    // 外轮廓（真实并集边界）：DataV 省界在相邻省份间共享顶点，边计数法能把内部
    // 公共边成对消掉，只留疆域外圈（面积约等于填充总面积，已是实测过的）。
    // 与 features 一起缓存，同一政权-切片只算一次。
    outline: buildOutline(features),
    labelPoint: computeLabelPoint(seg, provinceFeatures, adcodes),
  };
  _cache.set(cacheKey, result);
  return result;
}
