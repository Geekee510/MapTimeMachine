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

import { simplifyGeometry, douglasPeucker, chaikin, dissolveRings } from '../../lib/geo.js';
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

// 按「命名空间 + 政权 id + 切片起始年」缓存：同一政权不同时间切片的疆域不同，不能混用。
//
// 命名空间（ctx.ns）是为第四幅图加的：近代史的实体 id 里也有 'qing'，
// 而古代史的 `qing`（1644–1912）与近代史的 `qing`（1840–1912）切片完全不同。
// 两者若共用缓存键 'qing@1840'，先算的那份几何会被另一幅图直接拿去用 ——
// 地图上会出现"清朝疆域按唐朝切片拼"这种无法从数据里看出来的错。
// 所以键里必须带 ns；不传 ns 时保持原行为（第三幅图不受影响）。
const _cache = new Map();

export function clearTerritoryCache() {
  _cache.clear();
  _patchCache.clear();
  _nationalRing = null;
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

// ─────────────────────────────────────────────────────────────────────────────
// 具名补丁（超出今国境的疆土）：'mongolia' —— 外蒙古 / 唐安北都护府
//
// 关键点：**补丁的南边界直接取自中国国界轮廓的北段**（同样是简化后的省界顶点），
// 因此补丁与内蒙古/甘肃/新疆的边界是"同一条边"（顶点完全一致），边计数 dissolve
// 会把这条公共边成对消掉 —— 疆域内部不会出现接缝。
// 早期版本用手绘大环（唐漠北 [[88,42],[100,41],[112,42],…]）去盖，一磨圆就变成
// 一个横贯北方的巨大椭圆，还被单独描边画在疆域中间（用户反馈的"大圆圈"）。
//
// 南边界从西端(阿尔泰附近)沿国界到东端(满洲里附近)，再由一条北向弧线闭合。
const MONGOLIA_WEST = [87.75, 49.15];  // 中蒙俄西端三国交界（阿尔泰）
// 东端必须取到**满洲里**（中蒙俄东端三国交界），不能取蒙古最东的 119.9°：
// 若只画到 119.9,46.65 就用弧线直接拉回北边，弧线会横穿呼伦贝尔（实测在
// 117°E、48°N 一带与内蒙古省界重叠，渲染成一块深色斑）。沿着中蒙边界走完
// 那一段"东部凸出"，再用蒙俄边界闭合，才既不重叠也不缺角。
const MONGOLIA_EAST = [117.80, 49.55];
// 北向弧线：满洲里 → 肯特山 → 色楞格 → 库苏古尔 → 唐努乌梁海 → 西端（示意）
//
// 西段为什么抬到 52.5°：早年这条弧线整段压在南纬 50° 附近，等于只画了今蒙古国
// 的一半 —— 蒙古西北（库苏古尔）本就到 51.5°，其北的**唐努乌梁海**（今图瓦，
// 清属乌里雅苏台将军辖区，1914 年被沙俄吞并）更到 53°。清末疆域图上"西北角
// 缺一块"就是这里造成的。
const MONGOLIA_NORTH_ARC = [
  [116.80, 49.95], [115.60, 50.05], [114.20, 50.30], [112.00, 50.05],
  [110.00, 49.60], [107.60, 49.90],
  [104.60, 50.40], [101.60, 50.95], [99.40, 51.10], [97.20, 51.55],
  [95.80, 52.15], [94.20, 52.55], [92.60, 52.20], [91.00, 51.30],
  [89.60, 50.60], [88.60, 49.75],
];

// ─────────────────────────────────────────────────────────────────────────────
// 'outer-manchuria' —— 外东北（黑龙江以北、乌苏里江以东 + 库页岛）
//   1689《尼布楚》以后属清，1858《瑷珲》/1860《北京》两约割与沙俄，共约 100 万 km²。
//   南/西界同样取自国界轮廓：漠河 → 沿黑龙江至抚远 → 沿乌苏里江南下至图们江口。
//   北/东界走外兴安岭（斯塔诺夫山脉）与日本海西岸。
const MANCHURIA_WEST = [122.35, 53.50]; // 漠河（额尔古纳河与黑龙江汇流处）
const MANCHURIA_EAST = [130.62, 42.40]; // 图们江入海口
// 图们江口 → 海参崴 → 日本海西岸 → 庙街（黑龙江口）→ 外兴安岭 → 漠河
const MANCHURIA_NORTH_ARC = [
  [130.95, 42.62], [131.45, 42.85], [131.95, 43.12], [132.90, 43.20],
  [134.20, 43.50], [135.60, 44.00], [136.90, 44.70], [138.10, 45.70],
  [139.40, 47.10], [140.10, 48.60], [140.60, 50.00], [141.10, 51.50],
  [141.20, 52.60], [140.65, 53.35], [139.20, 54.10], [137.00, 54.60],
  [134.50, 54.55], [132.00, 54.25], [129.20, 53.90], [126.30, 53.65],
  [124.20, 53.55],
];
// 库页岛（今萨哈林州，清属三姓副都统辖下；1860 年随外东北一并失去）
const SAKHALIN_RING = [
  [142.05, 54.28], [142.75, 54.36], [143.30, 53.50], [143.05, 52.55],
  [142.75, 51.55], [143.15, 50.60], [142.85, 49.55], [142.55, 48.50],
  [142.25, 47.50], [141.95, 46.55], [141.85, 45.95], [142.15, 45.92],
  [142.60, 46.65], [143.05, 47.55], [143.35, 48.60], [143.45, 49.60],
  [143.60, 50.50], [143.65, 51.55], [143.45, 52.55], [143.65, 53.35],
  [143.10, 54.20], [142.55, 54.45], [142.05, 54.28],
];

// ─────────────────────────────────────────────────────────────────────────────
// 'balkhash' —— 巴尔喀什湖以东以南（塔尔巴哈台、伊犁西路、七河、伊塞克湖）
//   1864《勘分西北界约记》割与沙俄约 44 万 km²；1881《伊犁条约》又失霍尔果斯以西。
//   东界取国界轮廓（阿尔泰 → 阿拉山口 → 霍尔果斯 → 帕米尔），西界沿巴尔喀什湖东岸、
//   楚河、塔拉斯、费尔干纳东缘闭合。
const BALKHASH_NORTH = [87.30, 49.15]; // 奎屯山（中哈俄蒙四至点附近）
const BALKHASH_SOUTH = [73.60, 39.45]; // 帕米尔（中塔阿交界）
// 帕米尔 → 费尔干纳东缘 → 塔拉斯 → 楚河 → 巴尔喀什湖东岸 → 斋桑泊 → 阿尔泰
// 费尔干纳两点贴到 73° 附近：浩罕城（Kokand，73.0,40.5）是浩罕汗国的都城，
// 属藩部而非清朝直辖，边界不该把它圈进来。
const BALKHASH_WEST_ARC = [
  [73.90, 39.75], [73.30, 40.30], [72.80, 40.90], [72.55, 41.45],
  [73.10, 42.20], [72.60, 42.95], [71.90, 43.60], [72.40, 44.35],
  [73.60, 45.10], [75.00, 45.85], [75.90, 46.60], [76.40, 47.20],
  [78.20, 47.55], [80.50, 47.65], [82.60, 47.90], [84.40, 48.40],
  [86.10, 48.90],
];

let _nationalRing = null;   // 中国国界轮廓（简化后，主环）
let _patchCache = new Map();

// 中国国界轮廓（全部省界并集的主环）。用**简化后**的省界算，保证与填充要素同源。
function nationalRing(provinceFeatures) {
  if (_nationalRing) return _nationalRing;
  const rings = [];
  for (const f of provinceFeatures) rings.push(...provinceOuterRings(f));
  if (!rings.length) return null;
  const simplified = rings.map((r) => douglasPeucker(r, SIMPLIFY_EPS));
  const dissolved = dissolveRings(simplified, 5);
  if (!dissolved.length) return null;
  _nationalRing = dissolved.sort((a, b) => ringArea(b) - ringArea(a))[0];
  return _nationalRing;
}

const nearestIndex = (ring, p) => {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const d = Math.hypot(ring[i][0] - p[0], ring[i][1] - p[1]);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};

// 从环上截取「西端 → 东端」的一串顶点（取两段路径里较短的一段，即沿国界而非绕全国）
function borderChain(ring, west, east) {
  const n = ring.length - 1; // 首尾重复，实际顶点数 n
  const iw = nearestIndex(ring, west);
  const ie = nearestIndex(ring, east);
  const walk = (step) => {
    const out = [];
    let i = iw;
    for (let guard = 0; guard <= n; guard++) {
      out.push(ring[i]);
      if (i === ie) break;
      i = (i + step + n) % n;
    }
    return out;
  };
  const fwd = walk(1);
  const bwd = walk(-1);
  const len = (a) => {
    let s = 0;
    for (let i = 1; i < a.length; i++) s += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]);
    return s;
  };
  const chain = len(fwd) <= len(bwd) ? fwd : bwd;
  // 统一成"西 → 东"方向（后面接北向弧线，方向必须一致才能闭合成环）
  const dWest = Math.hypot(chain[0][0] - west[0], chain[0][1] - west[1]);
  const dEast = Math.hypot(chain[0][0] - east[0], chain[0][1] - east[1]);
  return dWest <= dEast ? chain : chain.slice().reverse();
}

// 通用拼环：国界上 west→east 那一段（与省界共享顶点）+ 弧线（east→west）+ 闭合。
// 返回**环数组**：多数补丁是一块，库页岛这种离岸岛屿要额外给一个独立环。
function stitchedPatch(name, provinceFeatures, west, east, arc, extraRings = []) {
  if (_patchCache.has(name)) return _patchCache.get(name);
  if (!provinceFeatures) return null;
  const ring = nationalRing(provinceFeatures);
  if (!ring) return null;
  const chain = borderChain(ring, west, east);
  if (chain.length < 2) return null;
  const out = chain.slice();
  for (const p of arc) out.push(p);
  out.push([chain[0][0], chain[0][1]]);
  const rings = [out, ...extraRings];
  _patchCache.set(name, rings);
  return rings;
}

const PATCH_RESOLVERS = {
  mongolia: (pf) =>
    stitchedPatch('mongolia', pf, MONGOLIA_WEST, MONGOLIA_EAST, MONGOLIA_NORTH_ARC),
  'outer-manchuria': (pf) =>
    stitchedPatch(
      'outer-manchuria', pf, MANCHURIA_WEST, MANCHURIA_EAST,
      MANCHURIA_NORTH_ARC, [SAKHALIN_RING]
    ),
  balkhash: (pf) =>
    stitchedPatch('balkhash', pf, BALKHASH_NORTH, BALKHASH_SOUTH, BALKHASH_WEST_ARC),
};

// 主入口。
//   polity —— 统一政权对象（src/data/polities）
//   seg    —— 该年份生效的时间切片
//   ctx    —— { provinceFeatures, preqinFeatures }
export function buildPolityGeometries(polity, seg, ctx = {}) {
  const cacheKey = `${ctx.ns || ''}|${polity.id}@${seg?.start ?? 'na'}`;
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
      // patch 标记供渲染层区分：补丁按现代国界拼环，难免与省界有一小段重叠，
      // 同色叠两次会显出一块更深的色斑（近代 1840 年东北就踩过），渲染时降透明度。
      properties: { patch: true },
      geometry: { type: 'Polygon', coordinates: [chaikin(ring, 4)] },
    });
  }

  // 2b) 具名补丁（外蒙古、外东北、巴尔喀什）：与省界共享边界的拼环，
  //     无需磨圆也无需再消缝。resolver 可以返回一个环，也可以返回环数组
  //     （库页岛是离岸岛，必须单列一个环，否则会和大陆环连成一条假地峡）。
  for (const key of seg?.patchKeys || []) {
    const res = PATCH_RESOLVERS[key]?.(provinceFeatures);
    if (!Array.isArray(res) || !res.length) continue;
    const rings = typeof res[0]?.[0] === 'number' ? [res] : res;
    for (const ring of rings) {
      if (!ring || ring.length < 4) continue;
      features.push({
        type: 'Feature',
        properties: { patch: true, patchKey: key },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
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
