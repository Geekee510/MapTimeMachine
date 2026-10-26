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
// 渲染约定（由调用方实现）：同一政权的所有多边形**同色填充、描边=填充色**，
// 相邻省界因同色而隐形，视觉上合并成一片完整疆域（零依赖的 dissolve）。
//
// 标签：极点内缩(polylabel)，优先取「都城所在省份」的最内缩点——既靠近都城、
// 又保证标签落在疆域内部、绝不在边缘。
//
// 数据合规：仅使用公开的现代行政区划边界与 CC BY-SA 的 historical-basemaps 快照，
// 不打包/描摹受版权保护的专题地图（谭图等）。产出为"示意级"疆域。

import { simplifyGeometry, chaikin } from '../../lib/geo.js';
import { polylabel, pointInRing, distToRing } from '../../lib/polylabel.js';
import { resolveAdcodes, resolveRawGeometry } from '../../data/polities/index.js';

const SIMPLIFY_EPS = 0.04; // ~4km，低容差：去锯齿但保形

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

// 主入口。
//   polity —— 统一政权对象（src/data/polities）
//   seg    —— 该年份生效的时间切片
//   ctx    —— { provinceFeatures, preqinFeatures }
export function buildPolityGeometries(polity, seg, ctx = {}) {
  const cacheKey = `${polity.id}@${seg?.start ?? 'na'}`;
  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  const { provinceFeatures, preqinFeatures } = ctx;
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
    labelPoint: computeLabelPoint(seg, provinceFeatures, adcodes),
  };
  _cache.set(cacheKey, result);
  return result;
}
