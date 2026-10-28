// 专题动画的地形底衬：山脉走向 + 河流
// =============================================================================
// 为什么手写山脉而不用现成数据：`ne_mountains.geojson` 是 **293 个点**（山峰/山脉名
// 的标注点），只有位置没有走向。画不出"秦岭横在那里、太行山竖着夹住华北"的形势，
// 而专题讲的恰恰是形势——红军为什么走腊子口、日军为什么沿平汉线南下，都靠山脉与
// 河谷说话。所以山脉用**手写的走向线**（每条约 3–6 个折点，示意精度），
// 渲染时沿线上密排 ∧ 形符号，就是老军事地图的写法。
//
// 河流则相反，有真数据就该用真数据：`ne_rivers`（主要干流）+ `china_hydro`
// （中国的支流更细）合并后按视窗过滤，长江黄河一类加粗。两处坐标都保留原始精度，
// 只在加载时按 0.03° 抽稀一次（再密就只是徒增路径长度）。
// =============================================================================

/** 山脉走向线。pts 为 [lng, lat]，按西→东或北→南的自然走向书写。
 *  rank 2 = 会在图上标名的主干山脉（秦岭、太行、南岭这类），1 = 只画符号不标名。 */
export const RIDGES = [
  // ── 西北 ──
  { name: '祁连山', rank: 2, pts: [[95.8, 39.0], [97.6, 38.7], [99.4, 38.4], [101.2, 37.9], [102.8, 37.3]] },
  { name: '天山', rank: 1, pts: [[80.5, 42.3], [84.0, 42.6], [87.5, 43.2], [90.5, 43.5]] },
  { name: '阿尔泰', rank: 1, pts: [[86.5, 47.6], [88.5, 48.2], [90.5, 48.6]] },
  { name: '贺兰山', rank: 1, pts: [[105.9, 39.2], [106.0, 38.6], [106.2, 37.9]] },
  { name: '阴山', rank: 2, pts: [[106.8, 41.4], [109.0, 41.3], [111.2, 41.1], [113.5, 41.0]] },
  { name: '六盘山', rank: 1, pts: [[106.0, 36.7], [106.2, 36.0], [106.4, 35.3]] },
  // ── 秦岭—淮阳山带（中国南北分界的骨架）──
  { name: '秦岭', rank: 2, pts: [[104.3, 34.2], [106.0, 34.0], [107.6, 33.9], [109.0, 33.8], [110.4, 33.7], [111.7, 33.6]] },
  { name: '大巴山', rank: 2, pts: [[106.2, 32.9], [107.4, 32.5], [108.6, 32.1], [109.8, 31.8]] },
  { name: '伏牛山', rank: 1, pts: [[111.4, 33.9], [112.5, 33.7], [113.7, 33.6]] },
  { name: '桐柏山', rank: 1, pts: [[113.0, 32.7], [113.9, 32.3]] },
  { name: '大别山', rank: 2, pts: [[114.0, 31.9], [115.0, 31.6], [116.0, 31.3], [116.8, 30.9]] },
  // ── 太行—吕梁（华北的两条脊）──
  { name: '太行山', rank: 2, pts: [[113.6, 40.1], [113.8, 39.1], [113.7, 38.1], [113.5, 37.1], [113.2, 36.2], [112.9, 35.4]] },
  { name: '吕梁山', rank: 1, pts: [[111.0, 38.7], [111.2, 37.8], [111.3, 36.9], [111.2, 36.0]] },
  { name: '中条山', rank: 1, pts: [[111.4, 35.3], [112.2, 35.1], [112.9, 34.9]] },
  { name: '燕山', rank: 1, pts: [[115.4, 40.6], [117.0, 40.4], [118.6, 40.2]] },
  { name: '泰山', rank: 1, pts: [[116.8, 36.4], [117.3, 36.2]] },
  { name: '沂蒙山', rank: 1, pts: [[117.7, 36.1], [118.3, 35.6]] },
  // ── 西南（长征舞台的主体）──
  { name: '岷山', rank: 2, pts: [[103.2, 33.5], [103.9, 32.7], [104.4, 31.8], [104.9, 31.0]] },
  { name: '邛崃山', rank: 1, pts: [[102.9, 31.4], [102.9, 30.4], [102.9, 29.4]] },
  { name: '大雪山', rank: 2, pts: [[99.5, 31.0], [99.7, 29.8], [100.0, 28.5], [100.3, 27.2], [100.1, 26.0]] },
  { name: '乌蒙山', rank: 2, pts: [[103.6, 27.3], [104.6, 26.9], [105.5, 26.5], [106.3, 26.2]] },
  { name: '大娄山', rank: 2, pts: [[105.7, 28.9], [106.7, 28.4], [107.8, 28.1]] },
  { name: '苗岭', rank: 1, pts: [[106.0, 26.0], [107.3, 25.8], [108.6, 25.8]] },
  // ── 华中、华南 ──
  { name: '巫山', rank: 1, pts: [[109.3, 31.6], [110.1, 31.0], [110.8, 30.4]] },
  { name: '武陵山', rank: 1, pts: [[108.3, 29.7], [109.3, 29.1], [110.2, 28.5]] },
  { name: '雪峰山', rank: 1, pts: [[110.5, 28.7], [110.7, 27.6], [110.9, 26.6]] },
  { name: '罗霄山', rank: 2, pts: [[113.8, 28.7], [114.0, 27.5], [114.3, 26.4], [114.6, 25.5]] },
  { name: '武夷山', rank: 2, pts: [[116.3, 28.0], [117.2, 27.1], [118.0, 26.2]] },
  { name: '天目山', rank: 1, pts: [[119.1, 30.7], [119.9, 30.2]] },
  { name: '南岭', rank: 2, pts: [[110.9, 25.5], [112.4, 25.3], [114.0, 25.1], [115.6, 25.0]] },
  { name: '九连山', rank: 1, pts: [[114.4, 24.7], [115.3, 24.4]] },
  // ── 东北 ──
  { name: '大兴安岭', rank: 1, pts: [[121.4, 51.6], [120.6, 49.6], [119.8, 47.6], [119.0, 45.8]] },
  { name: '小兴安岭', rank: 1, pts: [[127.0, 48.6], [128.6, 47.9]] },
  { name: '长白山', rank: 2, pts: [[126.4, 42.6], [127.5, 42.1], [128.6, 41.6]] },
];

/** 需要加粗描边的主要河流（名字取自 ne_rivers / china_hydro 的 properties.name）。 */
export const MAJOR_RIVERS = new Set([
  'Huang', 'Chang Jiang', 'Yangtze', 'Xi', 'Han', 'Gan', 'Min', 'Jinsha', 'Dadu',
  'Songhua', 'Liao', 'Huai', 'Wei', 'Xiang', 'Wu', 'Jialing', 'Yuan', 'Nu', 'Lancang',
  'Hongshui', 'Xun', 'Nanpan', 'Yalu', 'Nen', 'Tongtian',
]);

/** 图上会标中文名的河流（其余只画线）。 */
export const NAMED_RIVERS = {
  Huang: '黄河', 'Chang Jiang': '长江', Yangtze: '长江', Jinsha: '金沙江', Dadu: '大渡河',
  Han: '汉水', Gan: '赣江', Min: '岷江', Xi: '西江', Songhua: '松花江', Liao: '辽河',
  Huai: '淮河', Wei: '渭河', Xiang: '湘江', Wu: '乌江', Jialing: '嘉陵江',
  Hongshui: '红水河', Yalu: '鸭绿江', Nen: '嫩江', Tongtian: '通天河',
};

const CHINA_BOX = [95, 17, 127, 47];

// ── 河流加载（一次，合并两个来源后抽稀缓存）──────────────────────────────────
let riverPromise = null;

const inBox = (p, box) => p[0] > box[0] && p[0] < box[2] && p[1] > box[1] && p[1] < box[3];

function simplify(pts, minStep) {
  const out = [];
  let last = null;
  for (const p of pts) {
    if (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > minStep) {
      out.push(p);
      last = p;
    }
  }
  if (out.length < 2 && pts.length >= 2) return [pts[0], pts[pts.length - 1]];
  return out;
}

function linesOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

function loadOne(url) {
  return fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .catch((e) => {
      console.warn('[stage] 河流数据加载失败:', url, e.message);
      return { features: [] };
    });
}

/**
 * 返回 [{ name, major, pts }]，pts 已抽稀到 0.03°。
 * ne_rivers 是 1.1MB 的全球数据，只取中国框内的 36 条干流；
 * china_hydro 是 56KB 的中国支流，全部收下。两者互补，不去重。
 */
export function loadRivers() {
  if (riverPromise) return riverPromise;
  riverPromise = Promise.all([
    loadOne('/data/ne_rivers.geojson'),
    loadOne('/data/china_hydro.geojson'),
  ]).then(([ne, hydro]) => {
    const out = [];
    const add = (f) => {
      const name = f.properties?.name || '';
      for (const line of linesOf(f.geometry)) {
        const pts = simplify(line, 0.03);
        if (pts.length < 2) continue;
        if (!pts.some((p) => inBox(p, CHINA_BOX))) continue;
        out.push({ name, major: MAJOR_RIVERS.has(name), pts });
      }
    };
    for (const f of ne.features || []) add(f);
    for (const f of hydro.features || []) add(f);
    return out;
  });
  return riverPromise;
}
