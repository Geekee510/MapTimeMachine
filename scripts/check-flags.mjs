// 统计：地图数据中出现的国名，哪些没有国旗（对照 public/flags/ 实际文件）
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 1. 从 panel.js 抽取 FLAGS 映射（eval 对象字面量，正确处理含撇号的双引号键）
const panelSrc = readFileSync(join(root, 'src/ui/panel.js'), 'utf8');
const start = panelSrc.indexOf('const FLAGS = {');
const end = panelSrc.indexOf('};', start);
const literal = panelSrc.slice(start + 'const FLAGS = '.length, end + 1);
const FLAGS = eval(`(${literal})`);
console.log(`FLAGS 映射条目：${Object.keys(FLAGS).length}`);

// flagOf 同款逻辑
function flagOf(enName) {
  if (!enName) return '';
  if (FLAGS[enName]) return FLAGS[enName];
  const base = String(enName).replace(/\s*\([^)]*\)\s*$/, '').trim();
  return FLAGS[base] || '';
}

// 2. flags 目录实际文件
const flagFiles = new Set(readdirSync(join(root, 'public/flags')).filter(f => f.endsWith('.svg')));
console.log(`public/flags SVG 文件：${flagFiles.size}`);

// 3. cshapes 数据全部国名
const gj = JSON.parse(readFileSync(join(root, 'public/data/cshapes-2.1.geojson'), 'utf8'));
const names = new Set();
for (const f of gj.features) {
  const n = f.properties?.cntry_name;
  if (n) names.add(n);
}
console.log(`地图数据国名总数：${names.size}\n`);

// 4. 分类统计
const noMapping = [];
const noFile = [];
for (const n of [...names].sort()) {
  const code = flagOf(n);
  if (!code) { noMapping.push(n); continue; }
  if (!flagFiles.has(`${code}.svg`)) noFile.push(`${n} -> ${code}`);
}
console.log(`【无映射】${noMapping.length} 个：`);
console.log(noMapping.join('\n'));
if (noFile.length) {
  console.log(`\n【有映射但缺 SVG 文件】${noFile.length} 个：`);
  console.log(noFile.join('\n'));
} else {
  console.log('\n【有映射但缺 SVG 文件】0 个');
}
