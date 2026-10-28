// 近代史数据体检
// =============================================================================
// 用法：node scripts/check-modern-data.mjs
// 退出码 0 = 全部通过；1 = 有错误（错误会阻断，警告不阻断）。
//
// 检查项：id 唯一性 / 时间区间 / 坐标范围 / placeId 可解析 / 控制区省名合法 /
//         编制沿革引用完整性 / 文案长度。
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const D = await load('src/modes/chinaModern/data/index.js');
const {
  EVENTS, PLACES, FACTIONS, MODERN_WARS, PORTS, CONCESSIONS, TREATIES,
  RAILWAYS, UNITS, EVOLUTION, STAGES, TOPICS, EVENT_GROUPS,
  eventCoord, placeNameAt, stageAtYear, dataSummary, tkey, timeLabel,
} = D;

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// ── 现代省名（用于校验控制区关键词能否被 resolveAdcodes 解析）──────────────
const provPath = path.join(ROOT, 'public/data/china_provinces.geojson');
let PROV_NAMES = new Set();
if (fs.existsSync(provPath)) {
  const gj = JSON.parse(fs.readFileSync(provPath, 'utf8'));
  const norm = (n) => String(n).replace(/(壮族|回族|维吾尔|特别行政区|自治区|省|市)/g, '');
  PROV_NAMES = new Set(gj.features.map((f) => norm(f.properties.name)));
} else {
  warn('未找到 china_provinces.geojson，跳过省名校验');
}

const inChina = (lng, lat) => lng >= 73 && lng <= 136 && lat >= 15 && lat <= 54;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// ── 事件 ───────────────────────────────────────────────────────────────
const seen = new Set();
for (const e of EVENTS) {
  if (!e.id) err(`事件缺少 id：${e.name}`);
  if (seen.has(e.id)) err(`事件 id 重复：${e.id}`);
  seen.add(e.id);
  if (!EVENT_GROUPS.includes(e.group)) err(`事件 ${e.id} 的 group 非法：${e.group}`);
  if (!isNum(e.start) || !isNum(e.end)) err(`事件 ${e.id} 时间非数字`);
  for (const t of [e.start, e.end]) {
    const m = Math.round((t - Math.floor(t)) * 100);
    if (!Number.isInteger(m) || m > 12 || m < 0) err(`事件 ${e.id} 月份非法：${t}（应为 年.MM，月份 01–12）`);
  }
  if (tkey(e.start) > tkey(e.end)) err(`事件 ${e.id} start > end（${timeLabel(e.start)} > ${timeLabel(e.end)}）`);
  if (e.start < 1835 || e.end > 1950.12) err(`事件 ${e.id} 超出 1840–1950 范围：${e.start}–${e.end}`);
  if (e.placeId && !PLACES[e.placeId]) err(`事件 ${e.id} 的 placeId 不存在：${e.placeId}`);
  const c = eventCoord(e);
  const isAbroad = e.placeId && PLACES[e.placeId] && PLACES[e.placeId].prov === '境外';
  if (!isAbroad && !inChina(c[0], c[1])) err(`事件 ${e.id} 坐标越界：${c}`);
  if (!e.summary) err(`事件 ${e.id} 缺少 summary`);
  if (e.summary && e.summary.length > 46) warn(`事件 ${e.id} summary 偏长（${e.summary.length} 字）：${e.summary}`);
  if (!Array.isArray(e.article) || !e.article.length) err(`事件 ${e.id} 缺少 article`);
  if (e.article && e.article.length > 3) warn(`事件 ${e.id} article 段数偏多（${e.article.length}）`);
}

// ── 政治实体与控制区 ────────────────────────────────────────────────────
const fid = new Set();
for (const f of FACTIONS) {
  if (fid.has(f.id)) err(`实体 id 重复：${f.id}`);
  fid.add(f.id);
  if (f.start > f.end) err(`实体 ${f.id} start > end`);
  if (!Array.isArray(f.color) || f.color.length !== 3) err(`实体 ${f.id} 颜色非法`);
  if (!f.segs || !f.segs.length) err(`实体 ${f.id} 没有 segs`);
  for (const s of f.segs || []) {
    if (tkey(s.start) < tkey(f.start) || tkey(s.end) > tkey(f.end)) err(`实体 ${f.id} 的 seg ${s.start}–${s.end} 超出实体区间`);
    if (s.start >= s.end) err(`实体 ${f.id} 的 seg 时间倒置`);
    for (const p of s.provinces || []) {
      if (PROV_NAMES.size && !PROV_NAMES.has(p)) err(`实体 ${f.id} 的省名无法解析：${p}`);
    }
  }
}

// ── 战争 ────────────────────────────────────────────────────────────────
const wid = new Set();
for (const w of MODERN_WARS) {
  if (wid.has(w.id)) err(`战争 id 重复：${w.id}`);
  wid.add(w.id);
  const { start, end } = w.meta;
  if (!(start <= end)) err(`战争 ${w.id} 时间倒置`);
  if (start < 1839 || end > 1950.12) err(`战争 ${w.id} 超出时间范围`);
  if (!w.parties || w.parties.length !== 2) err(`战争 ${w.id} 阵营数不为 2`);
  for (const p of w.parties) {
    if (!/^#[0-9a-f]{6}$/i.test(p.color)) err(`战争 ${w.id} 阵营 ${p.id} 颜色非法：${p.color}`);
  }
  for (const f of w.forces) {
    for (const pt of f.route) if (!inChina(pt[0], pt[1])) err(`战争 ${w.id} 路线越界：${pt}`);
  }
  for (const b of w.battles) if (!inChina(b.loc[0], b.loc[1])) err(`战争 ${w.id} 战场越界：${b.loc}`);
}

// ── 条约 / 口岸 / 租界 ──────────────────────────────────────────────────
for (const t of TREATIES) {
  if (t.placeId && !PLACES[t.placeId]) err(`条约 ${t.id} 的 placeId 不存在：${t.placeId}`);
  if (t.year < 1840 || t.year > 1946) err(`条约 ${t.id} 年份可疑：${t.year}`);
  if (!t.terms || !t.terms.length) err(`条约 ${t.id} 没有条款`);
}
const pnames = new Set();
for (const p of PORTS) {
  if (pnames.has(p.name)) warn(`口岸重名：${p.name}`);
  pnames.add(p.name);
  if (!inChina(p.lng, p.lat)) err(`口岸 ${p.name} 坐标越界`);
  if (p.opened < 1840 || p.opened > 1930) err(`口岸 ${p.name} 开埠年份可疑：${p.opened}`);
  if (p.to != null && (p.to < p.opened || p.to > 1999)) err(`口岸 ${p.name} 止年异常：${p.to}`);
  if (!['约开', '自开', '租借'].includes(p.type)) err(`口岸 ${p.name} 类型非法：${p.type}`);
}
for (const c of CONCESSIONS) {
  if (!inChina(c.lng, c.lat)) err(`租界 ${c.id} 坐标越界`);
  if (c.from > c.to) err(`租界 ${c.id} 时间倒置`);
}

// ── 铁路 ────────────────────────────────────────────────────────────────
for (const r of RAILWAYS) {
  if (!r.stations || r.stations.length < 2) err(`铁路 ${r.id} 站点不足`);
  for (const s of r.stations) if (!inChina(s[0], s[1])) err(`铁路 ${r.id} 站点越界：${s}`);
  if (r.years[0] > r.years[1]) err(`铁路 ${r.id} 年份倒置`);
}

// ── 编制沿革引用完整性 ──────────────────────────────────────────────────
const uid = new Set(UNITS.map((u) => u.id));
for (const u of UNITS) {
  for (const f of u.formedBy || []) if (!uid.has(f)) err(`部队 ${u.id} 的 formedBy 引用不存在：${f}`);
}
for (const r of EVOLUTION) {
  for (const f of r.from || []) if (!uid.has(f)) err(`沿革关系引用不存在：${f}（to=${r.to}）`);
  if (!uid.has(r.to)) err(`沿革关系 to 不存在：${r.to}`);
}

// ── 阶段与专题 ──────────────────────────────────────────────────────────
for (const s of STAGES) {
  if (!(s.period[0] < s.period[1])) err(`阶段 ${s.id} 区间非法`);
  if (!s.sections || !s.sections.length) err(`阶段 ${s.id} 没有正文`);
}
for (const t of TOPICS) if (!t.sections || !t.sections.length) err(`专题 ${t.id} 没有正文`);

// ── 抽查若干查询函数 ────────────────────────────────────────────────────
if (stageAtYear(1900).id !== 'late-qing') err('stageAtYear(1900) 应返回 late-qing');
if (stageAtYear(1940).id !== 'war') err('stageAtYear(1940) 应返回 war');
if (placeNameAt('beijing', 1930) !== '北平') err(`placeNameAt 北平 失败：${placeNameAt('beijing', 1930)}`);
if (placeNameAt('beijing', 1915) !== '北京') err(`placeNameAt 北京 失败：${placeNameAt('beijing', 1915)}`);

// ── 报告 ────────────────────────────────────────────────────────────────
const s = dataSummary();
console.log('── 近代史数据体检 ─────────────────────────────');
console.log(`事件 ${s.events}｜实体 ${s.factions}｜战争 ${s.wars}｜条约 ${s.treaties}｜口岸 ${s.ports}｜租界 ${s.concessions}｜铁路 ${s.railways}｜部队 ${s.units}｜阶段 ${s.stages}｜专题 ${s.topics}`);
console.log(`覆盖 ${s.span[0]} – ${s.span[1]}`);
if (warns.length) {
  console.log(`\n⚠ 警告 ${warns.length} 条`);
  for (const w of warns) console.log('  · ' + w);
}
if (errors.length) {
  console.log(`\n✗ 错误 ${errors.length} 条`);
  for (const e of errors) console.log('  × ' + e);
  process.exit(1);
}
console.log('\n✓ 全部检查通过');
