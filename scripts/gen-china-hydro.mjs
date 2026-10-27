// 生成「中国水系补充集」public/data/china_hydro.geojson
// ---------------------------------------------------------------------------
// 起因：底图的河流/湖泊来自 Natural Earth **1:50m**（ne_rivers / ne_lakes）。
// 50m 是"能印在全球挂图上"的取舍级别，对中国内部做了大幅删减：
//   · 河流只留黄河、长江、珠江、黑龙江等干流 —— **淮河整条没有**，
//     渭河、汾河、湘江、赣江(有)、汉江(有)… 也大多缺失或只剩极短一段；
//   · 湖泊 50m 收了鄱阳、太湖、洪泽、巢湖、呼伦，却**独独漏掉洞庭湖**。
// 对世界地图够用，对中国古代史地图就是硬伤（淮河是南北分界，洞庭是荆楚核心）。
//
// 做法：从 NE **1:10m** 取河流/湖泊，按中国范围裁切 + 抽稀，只保留一份"补充集"，
// 运行时与 50m 合并（同名以 50m 为主，避免同一条河画两遍）。
// 文件只有几百 KB，随仓库提交，保证离线/CI 也能直接用；需要重新生成时：
//   node scripts/gen-china-hydro.mjs
//
// 数据源授权：Natural Earth 为公共领域（Public Domain）。

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data', 'china_hydro.geojson');

// 中国范围（含海南/台湾/南海诸岛北部与西域）：只裁这一块，避免把印度、中南半岛
// 与中亚的河流一并带进来。
const BBOX = [73, 18, 135.5, 54];

// 需要补进中国历史地图的河流（NE 1:10m 的 name 字段）。
// 选取标准：在中国历史/地理上反复出现的中小流域，且 NE 50m 里没有（或有但残缺）。
// 名字越短越容易与境外同名河冲突（Ou、Bei、Yi…），所以每一条都按"落点经纬度"
// 人工核对过：注释里的坐标即该要素在中国境内部分的平均位置。
const RIVERS = [
  'Huai',       // 淮河   114.97,32.39  ← 南北分界，此前整条缺失（下游见 RIVER_ALIAS）
  'Hudi',       // 淮河下游 116.5→119.6  蚌埠→洪泽湖→高邮湖→江都入江，
                //    NE 把这一段单独命名成 "Hudi"，与 "Huai" 首尾相接，别名合并
  'Wei',        // 渭河   107.29,34.58  关中命脉
  'Jing',       // 泾河   108.06,35.01  "泾渭分明"
  'Huan',       // 环江   107.55,36.36  泾河支流
  'Fen',        // 汾河   111.79,36.99  山西
  'Qin',        // 沁河   112.62,35.57
  'Zhang',      // 漳河   114.09,36.46
  'Hai',        // 海河   117.35,39.10
  'Yongding',   // 永定河 116.15,39.80
  'Sanggan',    // 桑干河 113.63,39.81
  'Luan',       // 滦河   117.88,40.75
  'Wuding',     // 无定河 110.33,37.41
  'Jialing',    // 嘉陵江 106.11,31.65
  'Yalong',     // 雅砻江 100.27,30.40
  'Tuo',        // 沱江   104.47,30.47
  'Wu',         // 乌江   106.94,27.62
  'Xiang',      // 湘江   112.12,26.88  洞庭四水
  'Yuan',       // 沅江   （50m 已有，留作兜底）
  'Liu',        // 柳江   109.60,24.14
  'Rong',       // 融江   109.28,24.81
  'Hongshui',   // 红水河 （50m 已有）
  'Zuo',        // 左江   107.22,22.58
  'You',        // 右江   106.86,23.67
  'Yong',       // 邕江   108.51,22.81
  'Bei',        // 北江   113.23,24.47
  'Dong',       // 东江   114.86,23.85
  'Mei',        // 梅江   115.67,26.24
  'Jiulong',    // 九龙江 117.45,24.97
  'Fuchun',     // 富春江 119.04,29.77  钱塘江中段
  'Ou',         // 瓯江   119.82,28.18（同名要素另有一段在老挝，按落点剔除）
  'Yi',         // 沂河   118.74,35.32
  'Ying',       // 颍河   116.03,32.82
  'Daling',     // 大凌河 120.43,41.34
  'Liao',       // 辽河   （50m 已有）
  'Nen',        // 嫩江   124.97,49.22
  'Muling',     // 穆棱河 130.93,44.89
  'Chaor',      // 绰尔河 122.59,47.93
  'Nemor',      // 讷谟尔河 126.17,48.41
  'Tumen',      // 图们江 129.63,42.48
  'Yalu',       // 鸭绿江 126.58,41.22
  'Ussuri',     // 乌苏里江 134.1,46.85
  'Shiquan',    // 狮泉河 81.02,32.04  印度河上游
  'Maquan',     // 马泉河 84.71,29.59  雅鲁藏布上游
  'Tongtian',   // 通天河 （50m 已有）
  'Qarqan',     // 车尔臣河 86.87,37.27
  'Yurungkax',  // 玉龙喀什河 80.25,36.44
  'Aksu',       // 阿克苏河 80.42,40.82
  'Toxkan',     // 托什干河 77.66,40.92
  'Künes',      // 巩乃斯河 83.52,43.45
];

// 湖泊补充：NE 50m 把洞庭湖整个漏掉（鄱阳/太湖/洪泽/巢湖/呼伦都在）。
// 麻烦的是 NE 1:10m 自己把洞庭拆成了三块：命名的 "Dongting Hu" 只是南洞庭+西洞庭，
// 东洞庭（岳阳西南）与目平湖两块在数据里是**无名**多边形。所以这里按"洞庭湖所在
// 方框"把这些无名块一并收进来，合并成一个 MultiPolygon —— 洞庭本就是湖沼群，
// 分成几块反而更像实景。
const LAKE_GROUPS = [
  { name: 'Dongting Hu', box: [111.85, 28.6, 113.2, 29.7], includeUnnamed: true },
];

// 同名要素在境外也有一段时，按方框收窄（其余部分自然被裁掉）
const NAME_BOX = {
  Ou: [116, 26, 123, 31], // 瓯江在浙江；NE 另有同名 "Ou" 在老挝（101.8°E）
};

// 一段河在 NE 里被拆成两个名字时，合并到主名（淮河下游 = Hudi）
const RIVER_ALIAS = { Hudi: 'Huai' };

const SRC = [
  {
    key: 'rivers',
    urls: [
      'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_rivers_lake_centerlines.json',
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_rivers_lake_centerlines.json',
    ],
    tol: 0.012, // 抽稀容差（度）：~1.3km，1:10m 的河道细节已足够
  },
  {
    key: 'lakes',
    urls: [
      'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_lakes.json',
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_lakes.json',
    ],
    tol: 0.004, // 湖岸线抽稀更保守，否则洞庭的"弯"会变成多边形
  },
];

async function fetchFirst(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 180000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'maptimechina-gen' } });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn(`  ✗ ${url}: ${e.message}`);
    }
  }
  throw lastErr || new Error('数据源全部失败');
}

// 下载缓存：10m 全量数据有十几 MB，且 jsDelivr 偶发 403 / GitHub 偶发断连。
// 命中 .tmp-hydro/ 就直接用（该目录已被 .gitignore 的 .tmp-*/ 忽略）。
const CACHE = join(__dirname, '..', '.tmp-hydro');

async function load(key, urls) {
  const file = join(CACHE, `${key}-10m.json`);
  try {
    const txt = await readFile(file, 'utf8');
    const json = JSON.parse(txt);
    console.log(`  ↺ 命中缓存 ${file}（${json.features.length} 要素）`);
    return json;
  } catch { /* 无缓存则下载 */ }
  const json = await fetchFirst(urls);
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, JSON.stringify(json));
  console.log(`  ✓ 已下载并缓存（${json.features.length} 要素）`);
  return json;
}

const inBox = (c, box = BBOX) => c[0] > box[0] && c[0] < box[2] && c[1] > box[1] && c[1] < box[3];

// 两个方框求交（用于"同名河流只在指定范围内取"）
const intersect = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];

// Douglas–Peucker 抽稀：河流/湖岸在 1:10m 上的点数远超屏幕像素，
// 不抽稀会把文件撑到几 MB，而视觉上看不出差别。
function simplify(points, tol) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = points[a];
    const [x2, y2] = points[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let best = -1;
    let bestD = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len2 === 0) {
        d = (px - x1) ** 2 + (py - y1) ** 2;
      } else {
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
      }
      if (d > bestD) { bestD = d; best = i; }
    }
    if (bestD > tol2 && best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// 用点串裁到方框：只保留落在框内的**连续段**（河流在框边被切断后就地断开，
// 不做精确求交 —— 中国范围框的边全在境外荒漠/海上，误差看不出来）。
function clipRuns(points, box) {
  const runs = [];
  let cur = [];
  for (const c of points) {
    if (inBox(c, box)) cur.push(c);
    else {
      if (cur.length >= 2) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}

function linesOf(geom) {
  if (!geom) return [];
  if (geom.type === 'LineString') return [geom.coordinates];
  if (geom.type === 'MultiLineString') return geom.coordinates;
  return [];
}

function ringsOf(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true });
  const features = [];

  // ---- 河流 ----
  {
    const src = SRC[0];
    console.log(`拉取 1:10m ${src.key} …`);
    const gj = await load(src.key, src.urls);
    const wanted = new Set(RIVERS);
    let hit = 0;

    for (const f of gj.features) {
      const raw = f.properties?.name;
      if (!raw || !wanted.has(raw)) continue;
      const name = RIVER_ALIAS[raw] || raw;
      const box = NAME_BOX[raw] ? intersect(BBOX, NAME_BOX[raw]) : BBOX;

      for (const line of linesOf(f.geometry)) {
        for (const run of clipRuns(line, box)) {
          const pts = simplify(run, src.tol);
          if (pts.length < 2) continue;
          features.push({
            type: 'Feature',
            properties: { name, name_en: raw, kind: 'river' },
            geometry: { type: 'LineString', coordinates: pts.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]) },
          });
          hit++;
        }
      }
    }
    console.log(`  → 收录 ${hit} 段河流（${new Set(features.map((f) => f.properties.name)).size} 条水系）`);
  }

  // ---- 湖泊 ----
  {
    const src = SRC[1];
    console.log(`拉取 1:10m ${src.key} …`);
    const gj = await load(src.key, src.urls);
    let hit = 0;

    for (const g of LAKE_GROUPS) {
      const polys = [];
      for (const f of gj.features) {
        if (!f.geometry) continue;
        const nm = f.properties?.name || '';
        const isMain = nm === g.name;
        // 无名或被拆出去的相邻水体：只在指定方框内、且不是别的具名湖时并入
        if (!isMain && !(g.includeUnnamed && !nm)) continue;

        for (const ring of ringsOf(f.geometry)) {
          const inside = ring.filter((c) => inBox(c, g.box));
          if (inside.length < 3) continue;
          let pts = simplify(ring, src.tol);
          if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) pts = pts.concat([pts[0]]);
          if (pts.length < 4) continue;
          polys.push([pts.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])]);
          hit++;
        }
      }
      if (!polys.length) continue;
      features.push({
        type: 'Feature',
        properties: { name: g.name, name_en: g.name, kind: 'lake' },
        geometry: { type: 'MultiPolygon', coordinates: polys },
      });
      console.log(`  → ${g.name}：${polys.length} 块水面合并为 1 个湖`);
    }
    if (!hit) console.warn('  ⚠ 湖泊白名单一条都没命中');
  }

  if (!features.length) throw new Error('裁切后为空，检查白名单里的 name 是否与数据源一致');
  const out = { type: 'FeatureCollection', features };
  await writeFile(OUT, JSON.stringify(out));

  const rivers = features.filter((f) => f.properties.kind === 'river').length;
  const lakes = features.length - rivers;
  console.log(`\n完成：${rivers} 段河流 / ${lakes} 个湖泊 → ${OUT}`);
  console.log(`体积 ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error('生成失败：', e);
  process.exit(1);
});
