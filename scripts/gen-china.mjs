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

function matchProvinces(keyword) {
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
    // 战国等多政权：每个政权一个 Polygon
    for (const st of d.states) {
      out.features.push({
        type: 'Feature',
        properties: { ...base, state: st.name, capital: st.capital, capitalCoord: st.capitalCoord },
        geometry: { type: 'Polygon', coordinates: roundCoords(st.bounds) },
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
    // 秦以后：拼接现代省界
    const polygons = [];
    for (const kw of d.provinces || []) {
      for (const f of matchProvinces(kw)) polygons.push(...toPolygons(f.geometry));
    }
    out.features.push({
      type: 'Feature',
      properties: { ...base },
      geometry: { type: 'MultiPolygon', coordinates: roundCoords(polygons) },
    });
    console.log(`${d.name}\t${d.start}~${d.end}\t拼接省份几何 ${polygons.length} 块`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(out));
const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`\n已生成 ${outPath}（${sizeKB} KB，${out.features.length} 个要素）`);
