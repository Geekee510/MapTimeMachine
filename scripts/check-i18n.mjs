// 检查「世界地图各年代实际会渲染的政权名」里，哪些还没有中文译名。
// 输出按出现年代数排序的未翻译清单，供补全 src/data/i18n.js。
//
// 用法：node scripts/check-i18n.mjs [--all]
//   --all  也输出 CShapes（1886 年后）的国名覆盖情况

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// i18n.js 用 `import ... from './country-zh.json'`（Vite 语法），Node 22 需要 import
// attributes 才能直接跑，故这里把 JSON 导入替换成运行时读取后再动态 import。
const src = fs.readFileSync(path.join(ROOT, 'src/data/i18n.js'), 'utf8');
const jsonName = (src.match(/from\s+'(\.\/[^']+\.json)'/) || [])[1] || './country-zh.json';
const tmp = path.join(ROOT, '.tmp-hb2', '__i18n_probe.mjs');
fs.writeFileSync(
  tmp,
  src.replace(
    /import\s+(\w+)\s+from\s+'(\.\/[^']+\.json)';?/,
    `import { readFileSync as __rfs } from 'node:fs';\nconst $1 = JSON.parse(__rfs(${JSON.stringify(path.join(ROOT, 'src/data', jsonName))},'utf8'));`
  )
);
const { zhCountry, COUNTRY_ZH } = await import('file:///' + tmp.replace(/\\/g, '/'));
fs.unlinkSync(tmp);

const CACHE = path.resolve(ROOT, '.tmp-hb2');

// 与 src/main.js 保持一致：剔除族群/部落/文化色块（这些不渲染）
const NON_POLITY_PATTERNS = [
  /\b(hunter|hunters|hunter-foragers|gatherer|gatherers|forager|foragers|farmer|farmers|farming|nomad|nomads|nomadic|pastoral|pastoralists)\b/i,
  /\b(tribe|tribes|tribal|peoples?|culture|cultures|civilization|civilisation|chiefdom|chiefdoms|society|societies)\b/i,
  /\b(hunter-gatherer|hunter gatherer|neolithic|mesolithic|paleolithic|bronze age|iron age|stone age)\b/i,
  /\b(clan|clans|band|bands|horde|confederacy of)\b/i,
  /\(?(indigenous|native|aboriginal|first nations)\)?/i,
];
// 与 src/main.js 保持一致：明确的族群/语族名
const NON_POLITY_EXACT = new Set([
  'Thai', 'Tai', 'Koreans', 'Chinese', 'Japanese', 'Tibetans', 'Uyghurs', 'Uyghur',
  'Kazakhs', 'Kazakh', 'Uzbeks', 'Uzbek', 'Turkmens', 'Turkmen', 'Tajiks', 'Tajik',
  'Kyrgyz', 'Pashtuns', 'Pashtun', 'Sikhs', 'Tamils', 'Sinhalese', 'Burmese',
  'Vietnamese', 'Khmer', 'Lao', 'Malays', 'Javanese', 'Sundanese', 'Filipinos',
  'Austronesians', 'Austro-Asiatic rice cultures', 'Tibeto-Burmanese', 'Ainu', 'Ainus',
  'Jōmon', 'Khoisan', 'Semites', 'Bantu', 'Dravidians', 'Balts', 'Baltic tribes',
  'Alans', 'Avars', 'Arabs', 'Berbers', 'Berber', 'Slavs', 'Germans', 'Celts', 'Vikings',
  'Mongols', 'Turks', 'Kurds', 'Bedouins', 'Bedouin', 'Tuareg', 'Maori', 'Inuit', 'Sami',
  'Afanasevo', 'Andronovo', 'Sintashta', 'Namazga', 'Catacomb culture', 'Beaker',
  'Únětice', 'Cycladic', 'Anatolian tribes', 'Austro-Asiatic', 'Papuans',
  'Anglo-Saxons', 'Franks', 'Lombards', 'Vandals', 'Visigoths', 'Ostrogoths', 'Suebi',
  'Burgundians', 'Alemanni', 'Alamans', 'Saxons', 'Frisians', 'Thuringians', 'Bavarians',
  'Scythians', 'Sarmatians', 'Huns', 'Magys', 'Magyars', 'Pechenegs', 'Cumans', 'Kipchaks',
]);
function isPolityName(name) {
  const n = (name || '').trim();
  if (!n || n === '?' || /^\s*$/.test(n)) return false;
  if (NON_POLITY_EXACT.has(n)) return false;
  if (NON_POLITY_PATTERNS.some((re) => re.test(n))) return false;
  return true;
}

// 缓存目录（.tmp-hb2，已在 .gitignore 中）缺失时按需下载历史底图快照
const HB_YEARS = [
  -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279,
  1300, 1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, 1880,
];
const hbFileName = (y) => (y < 0 ? `world_bc${-y}` : `world_${y}`);
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });
for (const y of HB_YEARS) {
  const f = path.join(CACHE, `${hbFileName(y)}.json`);
  if (fs.existsSync(f)) continue;
  const url = `https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson/${hbFileName(y)}.geojson`;
  process.stdout.write(`  下载 ${hbFileName(y)} … `);
  const res = await fetch(url);
  const txt = await res.text();
  fs.writeFileSync(f, txt);
  console.log(`${(txt.length / 1024).toFixed(0)} KB`);
}

const files = fs.readdirSync(CACHE).filter((f) => /^world_.*\.json$/.test(f)).sort();
const stat = new Map(); // name -> { years:Set, count }
for (const f of files) {
  let gj;
  try { gj = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); } catch { continue; }
  const year = f.replace(/^world_/, '').replace(/\.json$/, '');
  for (const ft of gj.features || []) {
    const n = (ft.properties || {}).NAME;
    if (!isPolityName(n)) continue;
    if (!stat.has(n)) stat.set(n, { years: new Set() });
    stat.get(n).years.add(year);
  }
}

const un = [];
for (const [n, v] of stat) {
  const zh = zhCountry(n);
  const hasZh = zh && zh !== n && /[一-龥]/.test(zh);
  if (!hasZh) un.push({ n, years: [...v.years].sort(), count: v.years.size });
}
un.sort((a, b) => b.count - a.count || a.n.localeCompare(b.n));

const total = stat.size;
console.log(`快照数：${files.length}　政权名总数：${total}　未译：${un.length}　覆盖率：${(((total - un.length) / total) * 100).toFixed(1)}%`);
console.log('');
const outFile = path.resolve(__dirname, '../.tmp-hb2/untranslated.txt');
fs.writeFileSync(outFile, un.map((u) => `${u.count}\t${u.n}\t${u.years.join(',')}`).join('\n'));
console.log(`已写入 ${outFile}`);
console.log('\n—— 未译清单（出现年代数 · 名称 · 出现的快照）——');
for (const u of un) console.log(`${String(u.count).padStart(2)}  ${u.n}   [${u.years.join(' ')}]`);

if (process.argv.includes('--all')) {
  const cs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/cshapes-2.1.geojson'), 'utf8'));
  const names = new Set();
  for (const ft of cs.features || []) names.add((ft.properties || {}).cntry_name);
  const unCs = [...names].filter((n) => n && !(COUNTRY_ZH[n] && /[一-龥]/.test(COUNTRY_ZH[n])));
  console.log(`\nCShapes 国名 ${names.size} 个，未译 ${unCs.length} 个：${unCs.join(' | ')}`);
}
