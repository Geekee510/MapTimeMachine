// 提取「先秦真实历史几何」→ public/data/china_preqin.geojson
//
// 背景：夏、商、西周原先全是手绘示意多边形。查证各开源历史地图数据集后：
//   · CHGIS 起于秦（前 221），不含先秦；
//   · historical-basemaps（CC BY-SA 4.0）的早期年代快照里，中国区域政权为：
//       world_bc2000 → "Xia"（夏，7 个顶点，106.1–113.8°E / 31.9–36.7°N）✅
//       world_bc1500 / bc1000 / bc700 → "Sinic"（华夏族群区，102–132°E / 23–44°N，
//         含朝鲜半岛与华南，范围过大，不能当作王朝疆域）与 "Zhoa"（周，84 个顶点，
//         104.3–122.4°E / 27.2–40.4°N）✅
//       world_bc323 / bc300 → "Qin" / "Zhou states" / "Yue"，无七雄分国数据
//   · 全网无开源的战国七雄分国 GeoJSON（谭其骧《中国历史地图集》未开放矢量）。
// 结论：夏、西周改用真实几何；商仍为示意（见 src/data/china.js）；战国改用省界拼接。
//
// 用法：node scripts/gen-china-preqin.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.resolve(__dirname, '../.tmp-hb2');
const OUT = path.resolve(__dirname, '../public/data/china_preqin.geojson');
const BASE = 'https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson';

const SPEC = [
  { file: 'world_bc2000', name: 'Xia', zh: '夏', src: 'historical-basemaps world_bc2000（CC BY-SA 4.0）' },
  { file: 'world_bc1000', name: 'Zhoa', zh: '周（西周王畿与诸侯封国）', src: 'historical-basemaps world_bc1000（CC BY-SA 4.0）' },
];

async function load(file) {
  const cached = path.join(CACHE, `${file}.json`);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'));
  const url = `${BASE}/${file}.geojson`;
  process.stdout.write(`  下载 ${file} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, JSON.stringify(json));
  console.log(`${(JSON.stringify(json).length / 1024).toFixed(0)} KB`);
  return json;
}

const round = (c, p = 3) =>
  typeof c[0] === 'number' ? [+c[0].toFixed(p), +c[1].toFixed(p)] : c.map((x) => round(x, p));

const out = { type: 'FeatureCollection', features: [] };
for (const s of SPEC) {
  const gj = await load(s.file);
  const f = (gj.features || []).find((x) => (x.properties || {}).NAME === s.name);
  if (!f) {
    console.warn(`⚠️ ${s.file} 里找不到 ${s.name}`);
    continue;
  }
  out.features.push({
    type: 'Feature',
    properties: { name: s.name, name_zh: s.zh, src: s.src, snapshot: s.file },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  });
  console.log(`✔ ${s.zh}（${s.name} ← ${s.file}）`);
}

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`\n已生成 ${OUT}（${out.features.length} 个要素）`);
