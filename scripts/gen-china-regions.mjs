// 生成中国历史政区图层：public/data/china_regions.geojson
//
// 数据来源：pessimistcamellia/china-history-map 的 v2/data/geo/*.json
// （其 geo_note 注明为 CHGIS 政区图层：州 / 郡 / 府 / 路 / 直隶州 …）
// 每个要素带 beg_yr / end_yr（政区设置与废止年份），可按年份逐年过滤，
// 从而在疆域轮廓之上叠加真实的历代政区界（州界、府界），接近《中国历史地图集》的呈现。
//
// 重要限制（已在 KNOWN-ISSUES.md 记录）：CHGIS 政区只覆盖"本部"，
// 经度约 91–122°，缺新疆西部、西藏、青海大部与外蒙古。
// 因此本层只作【内部政区界描边】，疆域轮廓仍由 china_dynasties.geojson 负责填充。
//
// 用法：node scripts/gen-china-regions.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'public', 'data', 'china_hist');
const OUT = path.join(__dirname, '..', 'public', 'data', 'china_regions.geojson');

// 文件 → 朝代映射（起止年为学界通说，与 src/data/china.js 保持一致）
const MAPPING = [
  { file: 'qin', dynasty: 'qin', name: '秦', start: -221, end: -206 },
  { file: 'han_w', dynasty: 'west-han', name: '西汉', start: -202, end: 8 },
  { file: 'han_e', dynasty: 'east-han', name: '东汉', start: 25, end: 220 },
  { file: 'three_k', dynasty: 'three-kingdoms', name: '三国', start: 220, end: 280 },
  { file: 'jin_w', dynasty: 'west-jin', name: '西晋', start: 266, end: 316 },
  // 东晋十六国·北朝：该文件的地理范围 lat 32–53.6（北方 + 东北），与 south_n（南朝）互补
  { file: 'jin_dy', dynasty: 'nan-bei-chao', name: '北朝', start: 420, end: 589 },
  { file: 'south_n', dynasty: 'nan-bei-chao', name: '南朝', start: 420, end: 589 },
  { file: 'sui', dynasty: 'sui', name: '隋', start: 581, end: 618 },
  { file: 'tang', dynasty: 'tang', name: '唐', start: 618, end: 907 },
  { file: 'five_d', dynasty: 'five-dynasties', name: '五代十国', start: 907, end: 960 },
  { file: 'song_liao', dynasty: 'north-song', name: '北宋', start: 960, end: 1127 },
  { file: 'xixia', dynasty: 'north-song', name: '西夏', start: 1038, end: 1227 }, // 与宋并立
  { file: 'song_jin', dynasty: 'south-song', name: '南宋', start: 1127, end: 1279 },
  { file: 'xixia', dynasty: 'south-song', name: '西夏', start: 1038, end: 1227 },
  { file: 'mongol', dynasty: 'south-song', name: '蒙古', start: 1206, end: 1271 }, // 与南宋并立
  { file: 'yuan', dynasty: 'yuan', name: '元', start: 1271, end: 1368 },
  { file: 'ming', dynasty: 'ming', name: '明', start: 1368, end: 1644 },
  { file: 'qing', dynasty: 'qing', name: '清', start: 1644, end: 1912 },
  { file: 'republic', dynasty: 'republic', name: '中华民国', start: 1912, end: 1949 },
  { file: 'prc', dynasty: 'prc', name: '中华人民共和国', start: 1949, end: 2023 },
];

// 坐标降精度到 3 位小数（约 100 米级），原始数据本身精度低于此
function roundCoords(c, p = 3) {
  if (typeof c[0] === 'number') return [Number(c[0].toFixed(p)), Number(c[1].toFixed(p))];
  return c.map((x) => roundCoords(x, p));
}

const out = { type: 'FeatureCollection', features: [] };
let total = 0;

for (const m of MAPPING) {
  const file = path.join(SRC_DIR, `${m.file}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  ✗ 缺少 ${m.file}.json，跳过`);
    continue;
  }
  const gj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const feats = gj.features || [];
  let n = 0;
  for (const f of feats) {
    if (!f.geometry) continue;
    const p = f.properties || {};
    // 政区有效年份 = [beg_yr, end_yr] ∩ [朝代起止]；缺年份字段时取朝代全期
    let beg = p.beg_yr != null ? Number(p.beg_yr) : m.start;
    let end = p.end_yr != null ? Number(p.end_yr) : m.end;
    if (!Number.isFinite(beg)) beg = m.start;
    if (!Number.isFinite(end)) end = m.end;
    beg = Math.max(beg, m.start);
    end = Math.min(end, m.end);
    // 与朝代区间无交集时（如民国沿用清末府州：beg_yr 1328 / end_yr 1911），
    // 回落到朝代全期——否则该朝代会一个政区都不显示。
    if (beg > end) { beg = m.start; end = m.end; }
    out.features.push({
      type: 'Feature',
      properties: {
        dynasty: m.dynasty,
        dynastyName: m.name,
        name: p.name || '',
        namePy: p.name_py || '',
        type: p.type_ch || '',
        beg,
        end,
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    });
    n++;
  }
  total += n;
  console.log(`  ${m.file.padEnd(10)} → ${m.name}(${m.start}~${m.end})：${n} 个政区`);
}

fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`\n已生成 ${OUT}：${total} 个政区要素，${kb} KB`);
