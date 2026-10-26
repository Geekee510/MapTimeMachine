// 生成中国历代疆域"轮廓层"：public/data/china_outline.geojson
//
// 数据来源：aourednik/historical-basemaps（CC BY-SA 4.0）的年代快照，
// 提取其中的中国政权多边形作为该朝代的疆域轮廓。
//
// 为什么需要轮廓层：此前中国疆域是"现代省级边界按关键词拼接"（示意性近似），
// 形状由现代省界决定，与真实历史疆域差别较大（用户多次质疑）。
// historical-basemaps 的王朝多边形是按历史疆域绘制的，形状更接近史实，
// 且包含西域等边疆（BORDERPRECISION 字段标明精度等级）。
//
// 覆盖不到的朝代（秦、三国、两晋、南北朝、隋、五代、南宋、民国）无对应政权多边形，
// 仍回落使用 china_dynasties.geojson 的省界拼接。
// 另：中华人民共和国**有意不生成轮廓**——HB 的 1960 China 多边形缺西藏/台湾/海南，
// 现代中国疆域一律以省界拼接层为准（原因详见下方 SPEC 内注释）。
//
// 用法：
//   node scripts/gen-china-outline.mjs              # 重新下载快照并整表生成（需联网）
//   node scripts/gen-china-outline.mjs --patch-only # 不联网，仅对现有文件重打岛屿补丁

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, '..', '.tmp-hb');
const OUT = path.join(__dirname, '..', 'public', 'data', 'china_outline.geojson');
const BASE = 'https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson';

// 快照 → 朝代 → 政权名
const SPEC = [
  { file: 'world_bc1', dynasty: 'west-han', dynastyName: '西汉', polity: 'Han' },
  { file: 'world_100', dynasty: 'east-han', dynastyName: '东汉', polity: 'Han' },
  { file: 'world_800', dynasty: 'tang', dynastyName: '唐', polity: 'Tang Empire' },
  { file: 'world_900', dynasty: 'tang', dynastyName: '唐', polity: 'Tang Empire' },
  { file: 'world_1000', dynasty: 'north-song', dynastyName: '北宋', polity: 'Song Empire' },
  { file: 'world_1100', dynasty: 'north-song', dynastyName: '北宋', polity: 'Song Empire' },
  { file: 'world_1279', dynasty: 'yuan', dynastyName: '元', polity: 'Great Khanate' },
  { file: 'world_1300', dynasty: 'yuan', dynastyName: '元', polity: 'Great Khanate' },
  { file: 'world_1492', dynasty: 'ming', dynastyName: '明', polity: 'Ming Empire' },
  { file: 'world_1500', dynasty: 'ming', dynastyName: '明', polity: 'Ming Chinese Empire' },
  { file: 'world_1600', dynasty: 'ming', dynastyName: '明', polity: 'Ming Chinese Empire' },
  { file: 'world_1700', dynasty: 'qing', dynastyName: '清', polity: 'Manchu Empire' },
  { file: 'world_1783', dynasty: 'qing', dynastyName: '清', polity: 'Qing Empire' },
  { file: 'world_1800', dynasty: 'qing', dynastyName: '清', polity: 'Qing Empire' },
  { file: 'world_1900', dynasty: 'qing', dynastyName: '清', polity: 'Manchu Empire' },
  // 【已移除】中华人民共和国（world_1960 / China）：
  // HB 的 1960「China」多边形把西藏、台湾、海南全部排除在外（实测拉萨、台北、海口
  // 均落在轮廓之外，全中国仅 743 个点，精度极粗），作为国家疆域参考线是错误的。
  // 中华人民共和国不适用「史实边界参考线」——其疆域以省界拼接层为准（含台湾、西藏、
  // 海南及南海诸岛），构建时不生成轮廓，运行时该朝代的参考线自动为空。
];

function roundCoords(c, p = 3) {
  if (typeof c[0] === 'number') return [Number(c[0].toFixed(p)), Number(c[1].toFixed(p))];
  return c.map((x) => roundCoords(x, p));
}

// ── 手工补丁：HB 轮廓不画近海岛屿 ─────────────────────────────────────────
// historical-basemaps 的王朝多边形只覆盖大陆主体，台湾、海南这类岛屿一律缺席。
// 而填充层（省界拼接）是含这两个省的，于是参考线在海上绕开、色块却在岛上，
// 出现"线包不住填充"的错位（明清两代尤其明显）。
// 下面用本项目自己的省级边界（china_provinces.geojson，DataV/民政部标准）
// 把这两个省的多边形并入对应朝代的轮廓，使参考线与填充范围一致。
// 说明：明代台湾在 CHGIS 里是示意性的「东番」区域，本补丁统一采用现代省界
// 以便与填充层对齐，属"示意精度"，不做历史海岸线考据。
const ISLAND_PATCH = {
  ming: ['710000', '460000'], // 台湾省、海南省
  qing: ['710000', '460000'],
};

// 把 ISLAND_PATCH 指定的省份多边形并入对应朝代的轮廓。
// 幂等：补过的省份记在 properties.patchedIslands 里，重复运行不会重复叠加。
// 不做"是否已包含"的几何判断——HB 多边形太粗（如清 1800 的海南只有轮廓一角，
// 海口市区落在外面），点包含检测会误判为"已有"，导致补丁漏打。
// 宁可重复描一遍同一段线（视觉无差别），也不能漏。
function patchIslands(fc) {
  const provPath = path.join(__dirname, '..', 'public', 'data', 'china_provinces.geojson');
  if (!fs.existsSync(provPath)) {
    console.warn('  ! 跳过岛屿补丁：未找到 public/data/china_provinces.geojson');
    return 0;
  }
  const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));
  const byCode = new Map(prov.features.map((f) => [String(f.properties.adcode), f]));
  let added = 0;
  for (const f of fc.features) {
    const want = ISLAND_PATCH[f.properties.dynasty];
    if (!want) continue;
    const done = new Set(f.properties.patchedIslands || []);
    const todo = want.filter((c) => !done.has(c));
    if (!todo.length) continue;
    const parts = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const code of todo) {
      const src = byCode.get(code);
      if (!src) {
        console.warn(`  ! 未找到 adcode ${code} 的省界数据，跳过`);
        continue;
      }
      const srcParts = src.geometry.type === 'Polygon' ? [src.geometry.coordinates] : src.geometry.coordinates;
      parts.push(...srcParts.map((p) => p.map((ring) => roundCoords(ring))));
      done.add(code);
      added++;
      console.log(`  + ${f.properties.dynastyName}${f.properties.year} 补入 ${src.properties.name}（${srcParts.length} 个部件）`);
    }
    f.geometry = { type: 'MultiPolygon', coordinates: parts };
    f.properties.patchedIslands = [...done];
  }
  return added;
}

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
  console.log(`${(JSON.stringify(json).length / 1024 / 1024).toFixed(1)} MB`);
  return json;
}

const PATCH_ONLY = process.argv.includes('--patch-only');

// --patch-only：不联网，直接读现有文件重打补丁（HB 缓存已清时也能修数据）
const out =
  PATCH_ONLY && fs.existsSync(OUT)
    ? JSON.parse(fs.readFileSync(OUT, 'utf8'))
    : { type: 'FeatureCollection', features: [] };

if (PATCH_ONLY) {
  console.log('--patch-only：跳过快照下载，只对现有轮廓重打岛屿补丁');
} else {
  for (const s of SPEC) {
    let gj;
    try {
      gj = await load(s.file);
    } catch (e) {
      console.warn(`  ✗ ${s.file} 获取失败：${e.message}`);
      continue;
    }
    const year = Number(s.file.replace('world_', '').replace('bc', '-'));
    const hit = gj.features.filter((f) => f.properties?.NAME === s.polity);
    if (!hit.length) {
      console.warn(`  ✗ ${s.file} 中未找到政权「${s.polity}」`);
      continue;
    }
    for (const f of hit) {
      out.features.push({
        type: 'Feature',
        properties: {
          dynasty: s.dynasty,
          dynastyName: s.dynastyName,
          name: s.polity,
          year,
          precision: f.properties.BORDERPRECISION ?? null,
          source: 'historical-basemaps',
        },
        geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
      });
    }
    console.log(`  ✓ ${s.file.padEnd(12)} ${s.polity.padEnd(20)} → ${s.dynastyName}（${year} 年，精度 ${hit[0].properties.BORDERPRECISION ?? '-'}）`);
  }
}

const patched = patchIslands(out);

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(
  `\n已写出 ${OUT}：${out.features.length} 个轮廓要素，` +
    `${(fs.statSync(OUT).size / 1024).toFixed(0)} KB，补入岛屿 ${patched} 处`
);
console.log('覆盖朝代：', [...new Set(out.features.map((f) => f.properties.dynastyName))].join('、'));
