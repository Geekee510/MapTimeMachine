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
//
// 用法：node scripts/gen-china-outline.mjs

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
  { file: 'world_1960', dynasty: 'prc', dynastyName: '中华人民共和国', polity: 'China' },
];

function roundCoords(c, p = 3) {
  if (typeof c[0] === 'number') return [Number(c[0].toFixed(p)), Number(c[1].toFixed(p))];
  return c.map((x) => roundCoords(x, p));
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

const out = { type: 'FeatureCollection', features: [] };

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

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`\n已生成 ${OUT}：${out.features.length} 个轮廓要素，${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
console.log('覆盖朝代：', [...new Set(out.features.map((f) => f.properties.dynastyName))].join('、'));
