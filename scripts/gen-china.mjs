// 生成中国历代疆域 GeoJSON。
// 三种数据来源：
//   1) provinces（秦以后）：依据 DataV 现代省级边界，按朝代省份关键词拼接成 MultiPolygon；
//   2) bounds（先秦统一王朝，如夏/商/西周/春秋）：手绘的简化示意疆域（Polygon）；
//   3) states（战国）：多政权并立，每个政权一个手绘简化疆域 Polygon。
// 输出 public/data/china_dynasties.geojson。无需外部依赖。
//
// 说明：所有疆域均为“示意性近似”（尤其先秦为极粗略手绘），仅供科普展示。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DYNASTIES } from '../src/data/china.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const provPath = path.join(root, 'public/data/china_provinces.geojson');
const outPath = path.join(root, 'public/data/china_dynasties.geojson');

const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));

// 外蒙古（今蒙古国）：元/清为中国领土，但不在 DataV 中国省界数据内。
// 从 CShapes 提取蒙古国几何（1921~2023 一片 Polygon，近似外蒙古范围）。
let outerMongoliaGeom = null;
try {
  const cshapes = JSON.parse(fs.readFileSync(path.join(root, 'public/data/cshapes-2.1.geojson'), 'utf8'));
  const mg = cshapes.features.find((f) => (f.properties?.cntry_name || '') === 'Mongolia');
  if (mg) outerMongoliaGeom = mg.geometry;
} catch (e) {
  console.warn('⚠️ 读取 CShapes 失败，外蒙古将缺席：', e.message);
}

function matchProvinces(keyword) {
  // '蒙古'（外蒙古）由 CShapes 单独提供；若走省界匹配会误中“内蒙古自治区”
  if (keyword === '蒙古') return [];
  return prov.features.filter((f) => (f.properties.name || '').includes(keyword));
}

function toPolygons(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

// 递归坐标降精度到 p 位小数（任意嵌套的 [lon,lat] 数组）
function roundCoords(coords, p = 2) {
  const f = (n) => +n.toFixed(p);
  if (typeof coords[0] === 'number') return [f(coords[0]), f(coords[1])];
  return coords.map((c) => roundCoords(c, p));
}

const out = { type: 'FeatureCollection', features: [] };
for (const d of DYNASTIES) {
  const base = { id: d.id, name: d.name, start: d.start, end: d.end, capital: d.capital, capitalCoord: d.capitalCoord, desc: d.desc };
  if (d.states) {
    // 战国等多政权：每个政权一个 Polygon / MultiPolygon。
    // bounds 为“环数组”：单环 [ring]=Polygon；多环 [ring1,ring2,…]=MultiPolygon（如南朝带海南、交州飞地）
    const geomOf = (b) => {
      if (Array.isArray(b) && b.length > 1) return { type: 'MultiPolygon', coordinates: roundCoords(b.map((r) => [r])) };
      return { type: 'Polygon', coordinates: roundCoords(b) };
    };
    for (const st of d.states) {
      out.features.push({
        type: 'Feature',
        properties: { ...base, state: st.name, capital: st.capital, capitalCoord: st.capitalCoord },
        geometry: geomOf(st.bounds),
      });
    }
    console.log(`${d.name}\t${d.start}~${d.end}\t${d.states.length} 个政权（手绘示意）`);
  } else if (d.bounds) {
    // 先秦统一王朝：单个手绘 Polygon
    out.features.push({
      type: 'Feature',
      properties: { ...base },
      geometry: { type: 'Polygon', coordinates: roundCoords(d.bounds) },
    });
    console.log(`${d.name}\t${d.start}~${d.end}\t手绘示意疆域`);
  } else {
    // 秦以后：每个匹配省份作为【独立 feature】（而非拼成单个大 MultiPolygon）。
    // 原因：deck.gl 对整个 160 块 MultiPolygon 用 even-odd 填充时，相邻/重叠省界
    // 会被判成“洞”，导致西藏/新疆等整块空白；拆成每省一 feature 可逐省三角化，规避此问题。
    let n = 0;
    for (const kw of d.provinces || []) {
      if (kw === '蒙古') {
        // 外蒙古：CShapes 蒙古国几何（元=岭北行省本土 / 清=外蒙古四部）
        if (outerMongoliaGeom) {
          out.features.push({
            type: 'Feature',
            properties: { ...base, note: '外蒙古' },
            geometry: { type: outerMongoliaGeom.type, coordinates: roundCoords(outerMongoliaGeom.coordinates) },
          });
          n++;
        }
        continue;
      }
      for (const f of matchProvinces(kw)) {
        out.features.push({
          type: 'Feature',
          properties: { ...base },
          geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
        });
        n++;
      }
    }
    console.log(`${d.name}\t${d.start}~${d.end}\t${n} 个独立省要素`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(out));
const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`\n已生成 ${outPath}（${sizeKB} KB，${out.features.length} 个要素）`);
