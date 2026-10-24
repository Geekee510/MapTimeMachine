// 生成中国历代疆域 GeoJSON：依据 DataV 现代省级边界，按各朝代的省份关键词
// 拼接成 MultiPolygon（无需 turf，直接空间拼接，deck.gl 原生支持渲染）。
// 输出 public/data/china_dynasties.geojson。
//
// 说明：疆域为基于现代省界的“示意性近似”，用于科普展示。
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

// 坐标降精度到 p 位小数（DataV 源为 6 位≈厘米级，地图显示只需 ~3 位≈百米级），
// 可大幅减小文件体积且视觉无损。
function roundMultiPolygon(coords, p = 2) {
  const f = (n) => +n.toFixed(p);
  return coords.map((poly) => poly.map((ring) => ring.map((pt) => [f(pt[0]), f(pt[1])])));
}

const out = { type: 'FeatureCollection', features: [] };
for (const d of DYNASTIES) {
  const polygons = [];
  for (const kw of d.provinces) {
    for (const f of matchProvinces(kw)) {
      polygons.push(...toPolygons(f.geometry));
    }
  }
  out.features.push({
    type: 'Feature',
    properties: {
      id: d.id,
      name: d.name,
      start: d.start,
      end: d.end,
      capital: d.capital,
      capitalCoord: d.capitalCoord,
      desc: d.desc,
    },
    geometry: { type: 'MultiPolygon', coordinates: roundMultiPolygon(polygons) },
  });
  console.log(`${d.name}\t${d.start}~${d.end}\t拼接省份几何 ${polygons.length} 块`);
}

fs.writeFileSync(outPath, JSON.stringify(out));
const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`\n已生成 ${outPath}（${sizeKB} KB，${out.features.length} 个朝代）`);
