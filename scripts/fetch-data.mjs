// 一键拉取 Natural Earth 公共领域数据（河流 + 山脉 + 湖泊），存入 public/data/
// 数据源：martynafford/natural-earth-geojson（GitHub raw，jsDelivr 兜底）
// 授权：Natural Earth 为公共领域（Public Domain），可自由使用分发。
//
// 用法（在本地、能正常访问 GitHub 的网络环境下运行）：
//   npm run fetch-data
//
// 拉取内容：
//   ne_rivers.geojson    世界主要河流（50m，含黄河/长江/两河等；line 中心线）
//   ne_mountains.geojson 山脉/山系/高原（取自 10m geography_regions_polys 的 Range/mtn 等，取质心成点）
//   ne_lakes.geojson     主要湖泊（50m，polygon）

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data');

const FILES = [
  {
    out: 'ne_rivers.geojson',
    candidates: [
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/physical/ne_50m_rivers_lake_centerlines.json',
      'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_rivers_lake_centerlines.json',
    ],
    filter: null,
    keepProps: ['name', 'name_en'],
  },
  {
    out: 'ne_mountains.geojson',
    // 注意：10m geography_regions_points 不含山脉（只有海角/岛/瀑布等）。
    // 山脉在 geography_regions_polys 里，featurecla = "Range/mtn" / "Plateau" / "Foothills"。
    candidates: [
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_geography_regions_polys.json',
      'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_geography_regions_polys.json',
    ],
    filter: (f) => ['Range/mtn', 'Plateau', 'Foothills'].includes(f.properties?.featurecla),
    toPoint: true, // 取质心成点，便于轻量渲染 + 名称标签
    keepProps: ['name'],
  },
  {
    out: 'ne_lakes.geojson',
    candidates: [
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/physical/ne_50m_lakes.json',
      'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_lakes.json',
    ],
    filter: null,
    keepProps: ['name'],
  },
];

async function fetchFirst(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 180000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'world-history-map' } });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      console.log(`  ✓ ${url} (${(JSON.stringify(json).length / 1024).toFixed(0)} KB)`);
      return json;
    } catch (e) {
      lastErr = e;
      console.warn(`  ✗ ${url}: ${e.message}`);
    }
  }
  throw lastErr || new Error('all sources failed');
}

function trimFeature(f, keepProps) {
  const props = {};
  for (const k of keepProps) if (f.properties?.[k] != null) props[k] = f.properties[k];
  return { type: 'Feature', geometry: f.geometry, properties: props };
}

// 多边形质心（Polygon 取外环平均；MultiPolygon 取所有外环平均）
function centroid(geom) {
  let pts = [];
  if (geom.type === 'Polygon') pts = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => (pts = pts.concat(p[0])));
  else if (geom.type === 'Point') return geom.coordinates;
  if (!pts.length) return null;
  let x = 0, y = 0;
  for (const c of pts) { x += c[0]; y += c[1]; }
  return [x / pts.length, y / pts.length];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const def of FILES) {
    console.log(`拉取 ${def.out} …`);
    const gj = await fetchFirst(def.candidates);
    let features = gj.features || [];
    if (def.filter) features = features.filter(def.filter);
    if (def.toPoint) {
      features = features
        .map((f) => {
          const c = centroid(f.geometry);
          if (!c) return null;
          return { type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: trimFeature(f, def.keepProps).properties };
        })
        .filter(Boolean);
    } else {
      features = features.map((f) => trimFeature(f, def.keepProps));
    }
    if (features.length === 0) {
      throw new Error(`${def.out}：筛选后要素为 0（数据源字段取值与预期不符，请检查）`);
    }
    const out = { type: 'FeatureCollection', features };
    const outPath = join(OUT_DIR, def.out);
    await writeFile(outPath, JSON.stringify(out));
    console.log(`  → 已写入 ${outPath}（${features.length} 个要素）\n`);
  }
  console.log('完成。刷新浏览器（Ctrl+F5）即可看到河流/山脉/湖泊图层，记得在右侧面板勾选对应开关。');
}

main().catch((e) => {
  console.error('拉取失败：', e);
  console.error('请确认本地网络可访问 GitHub（raw.githubusercontent.com）。如需离线，可手动下载 Natural Earth 数据放入 public/data/。');
  process.exit(1);
});
