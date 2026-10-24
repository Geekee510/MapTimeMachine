import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DYNASTIES } from '../src/data/china.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prov = JSON.parse(fs.readFileSync(path.join(root, 'public/data/china_provinces.geojson'), 'utf8'));

for (const d of DYNASTIES) {
  const names = new Set();
  const missing = [];
  for (const kw of d.provinces) {
    const hit = prov.features.filter((f) => (f.properties.name || '').includes(kw));
    if (hit.length === 0) missing.push(kw);
    for (const f of hit) names.add(f.properties.name);
  }
  console.log(`${d.name}\t匹配 ${names.size} 省:\t${[...names].join('、')}`);
  if (missing.length) console.log(`   ⚠️ 未匹配到省的关键词: ${missing.join('、')}`);
}
