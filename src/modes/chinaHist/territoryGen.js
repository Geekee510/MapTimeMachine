// 疆域生成器
// ---------------------------------------------------------------------------
// 设计目标（对应需求：综合现代省级边缘 / 海岸线 / 山川地貌，不要笔直线条，
// 契合省州府县疆域显得真实）：
//
//   1. 每个政权用「现代省级行政区划集合(provinces)」来定义疆域——
//      直接取 DataV 省界多边形的完整几何。省级边界本就沿山水走向、
//      沿海岸线绘制，因此疆域天然贴合地形、贴海岸、不笔直，且零人工描摹。
//   2. 对超出今国境的历史疆土（如唐代漠北），用 patches 手绘大致范围，
//      再用 Chaikin 角点切割把折线磨圆，消除"笔直/生硬"感；patches 只画在陆地。
//   3. 同一政权的所有多边形在渲染层用「同一颜色」填充，相邻省界因同色而隐形，
//      视觉上合并成一片完整疆域（无需昂贵的几何并集运算）。
//   4. 标签点用极点内缩(polylabel)：在疆域内部离边界最远的省份里取最大内接半径处，
//      保证政权名永远落在内部、绝不在边缘，也避开了新疆/漠北等远端飞地。
//
// 数据合规：仅使用公开的现代行政区划边界（DataV），不打包/描摹受版权保护的
// 历史专题地图；此处产出为"示意级"疆域，已在信息卡标注。

import { polylabel, pointInRing, distToRing } from './polylabel.js';

// —— 边界综合（参考 CITAS/NHGIS 框架）：Douglas-Peucker 简化 ——
// 低容差下去掉亚公里级锯齿，使省界/海岸线更顺滑美观，同时保留沿山水走向的形状特征。
function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function douglasPeucker(points, eps) {
  if (points.length < 3) return points.slice();
  let pts = points.slice();
  // 去掉闭合重复点，按开放折线处理
  if (pts.length > 1 &&
      pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts = pts.slice(0, -1);
  }
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpendicularDistance(pts[i], pts[s], pts[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx !== -1) {
      keep[idx] = true;
      stack.push([s, idx]);
      stack.push([idx, e]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  out.push(out[0]); // 重新闭合
  return out;
}

// 对整个几何（含洞）做简化，容差单位与经纬度一致（度）
function simplifyGeometry(geom, eps) {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map((ring) => douglasPeucker(ring, eps)) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) => poly.map((ring) => douglasPeucker(ring, eps))),
    };
  }
  return geom;
}

const SIMPLIFY_EPS = 0.04; // ~4km，低容差：去锯齿但保形

// 按政权 id 缓存几何与标签点（省份集合按年不变，首帧算一次即可）
const _cache = new Map();

export function clearTerritoryCache() {
  _cache.clear();
}

// Chaikin 角点切割：把折线/多边形磨圆，消除生硬直线。传入开放或闭合的环。
function chaikin(ring, iters = 4) {
  let pts = ring.slice();
  // 去掉闭合重复点，避免切割错位
  if (pts.length > 1 &&
      pts[0][0] === pts[pts.length - 1][0] &&
      pts[0][1] === pts[pts.length - 1][1]) {
    pts = pts.slice(0, -1);
  }
  for (let k = 0; k < iters; k++) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = out;
  }
  pts.push(pts[0]); // 重新闭合
  return pts;
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

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a) / 2;
}

// 计算标签锚点：优先取「都城所在省份」的极点内缩点——既靠近都城，又保证落在疆域内部、
// 绝不在边缘；找不到都城省份时用「内接半径最大省份」兜底。
function computeLabelPoint(spec, provinceFeatures) {
  const cap = spec.capitalCoord;
  if (cap) {
    let best = null;
    for (const adcode of spec.provinces || []) {
      const f = findProvince(provinceFeatures, adcode);
      if (!f) continue;
      for (const r of provinceOuterRings(f)) {
        if (pointInRing(cap[0], cap[1], r)) {
          const pt = polylabel(r);
          const d = distToRing(pt[0], pt[1], r);
          if (!best || d > best.d) best = { d, point: pt };
        }
      }
    }
    if (best) return best.point;
  }
  // 兜底：内接半径最大的省份
  let fb = null;
  for (const adcode of spec.provinces || []) {
    const f = findProvince(provinceFeatures, adcode);
    if (!f) continue;
    for (const r of provinceOuterRings(f)) {
      const pt = polylabel(r);
      const d = distToRing(pt[0], pt[1], r);
      if (!fb || d > fb.d) fb = { d, point: pt };
    }
  }
  return fb ? fb.point : (spec.capitalCoord || [104, 36]);
}

// 主入口：根据政权 spec 与已加载的省界要素，产出
//   { features: [GeoJSON Polygon Feature...], labelPoint: [lng,lat] }
// features 里每个要素只带 { id }，颜色/透明度由调用方按年份注入（保持缓存纯净可复用）。
export function buildPolityGeometries(spec, provinceFeatures) {
  const cached = _cache.get(spec.id);
  if (cached) return cached;

  const features = [];

  // 1) 省级行政区划：取完整几何 → Douglas-Peucker 简化（去锯齿、保形），
  //    作为疆域骨架。省级边界本就沿山水/海岸线，天然贴合地形、不笔直。
  for (const adcode of spec.provinces || []) {
    const f = findProvince(provinceFeatures, adcode);
    if (!f || !f.geometry) continue;
    const g = simplifyGeometry(f.geometry, SIMPLIFY_EPS);
    if (g.type === 'Polygon') {
      features.push({ type: 'Feature', properties: { id: spec.id }, geometry: g });
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        features.push({
          type: 'Feature',
          properties: { id: spec.id },
          geometry: { type: 'Polygon', coordinates: poly },
        });
      }
    }
  }

  // 2) 超出现代国境的历史疆土补丁：Chaikin 磨圆后作为独立多边形
  for (const ring of spec.patches || []) {
    const smooth = chaikin(ring, 4);
    features.push({
      type: 'Feature',
      properties: { id: spec.id },
      geometry: { type: 'Polygon', coordinates: [smooth] },
    });
  }

  const result = {
    features,
    labelPoint: computeLabelPoint(spec, provinceFeatures),
    spec,
  };
  _cache.set(spec.id, result);
  return result;
}
