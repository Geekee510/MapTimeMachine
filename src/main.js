import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css'; // 关键修复：此前样式从未被引入，导致 #map 高度为 0（地图不可见）、.hidden 失效（加载提示永不消失）
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { loadCShapes } from './data/loaders.js';
import { zhCountry, zh, RIVER_ZH, MOUNTAIN_ZH, HB_ZH_VALUES } from './data/i18n.js';
import { DYNASTIES, getDynastyAtYear } from './data/china.js';
import { getWorldEvents } from './data/worldEvents.js';
import { createTimeline } from './ui/timeline.js';
import { createPanel } from './ui/panel.js';

const YEAR_MIN = -3000; // 世界模式下限：公元前 3000 年（此前为史前考古文化，不做政治疆域）
const YEAR_MAX = 2023;
const CSHAPES_START = 1886; // CShapes 2.1 起始年；1886 年之后用 CShapes，之前用 historical-basemaps

// historical-basemaps 的 54 个年代快照（来自其仓库 index.json，按年份升序）
// 1886 年之前的世界疆域由这些快照提供（该数据 CC BY-SA 4.0，见 README 署名）
const HB_YEARS = [
  -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279,
  1300, 1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, 1880,
];
const hbFileName = (y) => (y < 0 ? `world_bc${-y}` : `world_${y}`);
// 给定年份，选 <= 该年的最近快照
function hbYearFor(y) {
  let best = HB_YEARS[0];
  for (const yy of HB_YEARS) if (yy <= y) best = yy;
  return best;
}
const CHINA_MIN = -2070;
const CHINA_MAX = 2023; // 含中华民国(1912–1949)与中华人民共和国(1949– )
const WORLD_CENTER = [12, 28];
const WORLD_ZOOM = 1.4;
const CHINA_CENTER = [104, 36]; // 中国大致中心（华北/中原一带）
const CHINA_ZOOM = 3.6;

let currentYear = 1960;
let territories = [];
let rivers = null; // 可选：Natural Earth 河流 GeoJSON
let mountains = null; // 可选：Natural Earth 山脉/山峰点 GeoJSON
let lakes = null; // 可选：Natural Earth 湖泊 GeoJSON
let deckOverlay = null;
let map = null;
let panel = null;
let timeline = null; // 时间轴控件引用
const layersState = { territory: true, region: true, relief: false, river: true, mountain: true, lake: false, basemapLand: false };
let labelChinese = true; // 中文标签开关：true=中文（无译名回退英文），false=英文原名
let mode = 'world'; // 视图模式：'world' 世界地图 | 'china' 中国历代疆域
let chinaDynasties = null; // china_dynasties.geojson 的 features 数组（省界拼接的疆域底图）
let chinaOutlines = null; // china_outline.geojson：historical-basemaps 提取的王朝疆域轮廓（更接近史实）
let chinaRegions = null; // china_regions.geojson：CHGIS 历代政区界（州/郡/府/路），叠在疆域之上
let chinaInfoOpen = false; // 中国模式信息卡是否打开（拖动年份时联动刷新）

// 底图陆地显隐：CShapes 疆域数据不含小岛屿，底图(demotiles)却会画出
// 大量沿岸小岛 → 海面上出现"白色小点"。默认把底图陆地沉入海色，
// 只显示 CShapes 疆域；需要真实陆地/小岛时用面板开关切回。
const SEA_COLOR = '#A8D5E8'; // 海洋色（明显蓝），与陆地暖色系区分，避免"陆地海洋都发蓝"
const basemapOriginal = {}; // 首次隐藏前缓存底图原始颜色，便于恢复
const basemapHiddenLabels = new Set(); // 被我们隐藏的底图 symbol 标签层 id
function applyBasemapLand() {
  if (!map || !map.isStyleLoaded()) return;
  const show = !!layersState.basemapLand;
  try {
    const fillLayers = ['countries-fill', 'crimea-fill'];
    for (const id of fillLayers) {
      if (!map.getLayer(id)) continue;
      if (basemapOriginal[id] == null) {
        basemapOriginal[id] = map.getPaintProperty(id, 'fill-color') ?? '#f8f4f0';
      }
      map.setPaintProperty(id, 'fill-color', show ? basemapOriginal[id] : SEA_COLOR);
    }
    // 陆地藏起来时，海岸线/国境线会变成海面上的悬空线条，一并隐藏；
    // 底图自带的全部文字标签（国家/地形/山脉/地缘线等 symbol 层）都是英文噪音，
    // 一并隐藏——中文标签由 deck.gl 标签层接管（此前只藏 countries-label，
    // 导致 demotiles 新版的 KUNLUN MOUNTAINS 等英文地形标签漏了出来）。
    for (const id of ['coastline', 'countries-boundary']) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', show ? 1 : 0);
    }
    try {
      const style = map.getStyle();
      for (const lyr of style.layers || []) {
        if (lyr.type !== 'symbol') continue;
        if (!show) {
          // 记录被我们隐藏的标签层，切回时只恢复这些
          if (lyr.layout?.visibility === 'none') continue;
          basemapHiddenLabels.add(lyr.id);
          map.setLayoutProperty(lyr.id, 'visibility', 'none');
        } else if (basemapHiddenLabels.has(lyr.id)) {
          map.setLayoutProperty(lyr.id, 'visibility', 'visible');
          basemapHiddenLabels.delete(lyr.id);
        }
      }
    } catch (e) {
      /* 回落样式没有这些图层，忽略 */
    }
  } catch (e) {
    /* 回落样式没有这些图层，忽略 */
  }
}

// CShapes 的 status 为字符串。配色采用暖色系，与海洋蓝明显区分，
// 且不透明，使"隐藏底图陆地"与"显示底图陆地"两种视图下国家配色一致（都由 CShapes 主导）。
const STATUS_COLOR = {
  independent: [150, 190, 140, 245], // 独立国家（草绿）
  colony: [230, 200, 130, 245], // 殖民地（金）
  protectorate: [225, 160, 90, 245], // 保护国（橙）
  mandate: [190, 130, 180, 245], // 托管地（紫）
  occupied: [200, 70, 70, 245], // 被占领土（红）
};
function statusColor(props) {
  const c = STATUS_COLOR[props.status] || [170, 170, 170, 245];
  // 开启地形晕渲时降低疆域不透明度，让底下的山体起伏阴影透出来
  // （晕渲层在底图样式内，deck.gl 覆盖层在其上，只能靠透明度让二者共存）
  return layersState.relief ? [c[0], c[1], c[2], 150] : c;
}

// ---- 地形晕渲（山脉形势图）----
// 用 Amazon Terrain Tiles 的 terrarium 编码 DEM 做 MapLibre hillshade，
// 喜马拉雅、安第斯、阿尔卑斯、天山、昆仑等山脉的起伏都能真实呈现
// （Natural Earth 的山脉点只有 219 个小山丘，没有主山系；OSM Overpass 拉取 mountain_range 又超时）。
const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
function applyRelief() {
  if (!map || !map.isStyleLoaded()) return;
  const show = !!layersState.relief;
  try {
    if (!map.getSource('dem')) {
      map.addSource('dem', {
        type: 'raster-dem',
        tiles: [DEM_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 12,
        attribution: '地形：Mapzen / Amazon Terrain Tiles',
      });
    }
    if (!map.getLayer('hillshade')) {
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-exaggeration': 0.6,
          'hillshade-shadow-color': '#4a3524',
          'hillshade-highlight-color': '#f2ece2',
          'hillshade-accent-color': '#7d5c3c',
        },
      });
    }
    if (map.getLayer('hillshade')) {
      map.setLayoutProperty('hillshade', 'visibility', show ? 'visible' : 'none');
    }
  } catch (e) {
    console.warn('[relief] 地形晕渲图层不可用：', e.message);
  }
}

function buildTerritoryLayer() {
  const active = territories
    .filter((t) => currentYear >= t.startYear && currentYear <= t.endYear)
    .map((t) => t.feature);
  return new GeoJsonLayer({
    id: 'territory',
    data: { type: 'FeatureCollection', features: active },
    getFillColor: (f) => statusColor(f.properties),
    getLineColor: [45, 45, 45, 230],
    getLineWidth: 1,
    lineWidthMinPixels: 0.6,
    updateTriggers: { getFillColor: layersState.relief }, // 晕渲开关联动填充透明度
    stroked: true,
    filled: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: (info) => {
      if (info.object && panel) panel.showInfo(info.object.properties);
    },
  });
}

// ---- historical-basemaps：1886 年前的世界疆域 ----
// 按需从 jsDelivr 拉取对应年代的 GeoJSON（不打包进仓库，避免体积膨胀），
// 加载后缓存，并预取相邻年代，使拖动时间轴时不卡顿（参考 orbis-chronos 的优化经验）。
const hbCache = new Map(); // 快照年份 -> features
const hbPending = new Set();

async function ensureHb(year) {
  if (hbCache.has(year) || hbPending.has(year)) return;
  hbPending.add(year);
  const url = `https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson/${hbFileName(year)}.geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const gj = await res.json();
    // 快照有效区间：[本快照年份, 下一快照年份 - 1]，最后一个到 CShapes 起始前一年
    const i = HB_YEARS.indexOf(year);
    const endYear = i + 1 < HB_YEARS.length ? HB_YEARS[i + 1] - 1 : CSHAPES_START - 1;
    const feats = (gj.features || []).map((f) => {
      const p = f.properties || {};
      const feat = {
        type: 'Feature',
        properties: {
          cntry_name: p.NAME || '未命名政权',
          subjecto: p.SUBJECTO || '',
          partof: p.PARTOF || '',
          // 有宗主国（SUBJECTO 不同于自身）视为属地/殖民地，否则为独立政权
          status: p.SUBJECTO && p.SUBJECTO !== p.NAME ? 'colony' : 'independent',
          borderPrecision: p.BORDERPRECISION ?? null,
          gwsyear: year,
          gweyear: endYear,
          snapYear: year,
        },
        geometry: f.geometry,
      };
      feat.meta = polygonMeta(f.geometry); // 预计算质心，供标签层使用
      return feat;
    });
    hbCache.set(year, feats);
    console.info(`[hb] ${year} 年快照：${feats.length} 个政权（有效区间 ${year}~${endYear}）`);
    const idx = HB_YEARS.indexOf(year);
    for (const j of [idx - 1, idx + 1, idx + 2]) {
      if (j >= 0 && j < HB_YEARS.length) ensureHb(HB_YEARS[j]);
    }
    updateLayers(); // 数据到位后刷新（此时缓存已有，不会重复触发加载）
  } catch (e) {
    console.warn(`[hb] ${year} 年快照加载失败：`, e.message);
  } finally {
    hbPending.delete(year);
  }
}

// 1886 年前的世界疆域图层（historical-basemaps）
function buildWorldHistLayer() {
  const y = hbYearFor(currentYear);
  const feats = hbCache.get(y);
  if (!feats) {
    ensureHb(y); // 首次进入该年代：后台拉取，拉取完成后 updateLayers 自动重绘
    return null;
  }
  return new GeoJsonLayer({
    id: 'territory',
    data: { type: 'FeatureCollection', features: feats },
    getFillColor: (f) => statusColor(f.properties),
    getLineColor: [45, 45, 45, 200],
    getLineWidth: 0.8,
    lineWidthMinPixels: 0.5,
    updateTriggers: { getFillColor: layersState.relief },
    stroked: true,
    filled: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: (info) => {
      if (info.object && panel) panel.showInfo(info.object.properties);
    },
  });
}

// 1886 年前的政权名称标签
function buildWorldHistLabelLayer() {
  const y = hbYearFor(currentYear);
  const feats = hbCache.get(y);
  const z = map ? map.getZoom() : 0;
  if (!feats || z < 2 || labelChars === 'auto') return null;
  const minDiag = z < 3 ? 8 : z < 4 ? 3.5 : z < 5 ? 1.2 : 0;
  const byName = new Map();
  for (const f of feats) {
    if (!f.meta || !f.meta.c || f.meta.d < minDiag) continue;
    const name = f.properties.cntry_name;
    const prev = byName.get(name);
    if (!prev || f.meta.d > prev.meta.d) byName.set(name, f);
  }
  const data = [...byName.values()].map((f) => ({
    coordinates: f.meta.c,
    text: labelChinese ? (zhCountry(f.properties.cntry_name) || f.properties.cntry_name) : f.properties.cntry_name,
  }));
  return new TextLayer({
    id: 'territory-label',
    data,
    getPosition: (d) => d.coordinates,
    getText: (d) => d.text,
    getSize: z > 5 ? 16 : 14,
    getColor: [25, 25, 25, 250],
    fontFamily: 'Microsoft YaHei, sans-serif',
    fontWeight: 700,
    fontSettings: { sdf: true, fontSize: 128, buffer: 8 },
    characterSet: labelChars,
    updateTriggers: { getText: labelChinese },
    pickable: false,
  });
}

// 几何长度（坐标点数）：用于河流按名称去重时挑选最长那一段
function geomLen(g) {
  if (!g) return 0;
  if (g.type === 'LineString') return g.coordinates.length;
  if (g.type === 'MultiLineString') return g.coordinates.reduce((s, line) => s + line.length, 0);
  return 0;
}

function buildRiverLayer() {
  if (!rivers) return [];
  const z = map ? map.getZoom() : 0;
  const layers = [
    new GeoJsonLayer({
      id: 'river',
      data: rivers,
      stroked: true,
      filled: false,
      getLineColor: [30, 90, 170, 220],
      lineWidthUnits: 'pixels',
      getLineWidth: z > 4 ? 2.2 : 1.4, // 放大后略加粗
      lineWidthMinPixels: 1,
      pickable: false,
    }),
  ];
  // 河流名称标签（放大到区域视图才显示，避免世界视图糊成一片）
  // 注意：TextLayer 不能直接吃 FeatureCollection（只有 GeoJsonLayer 能解析 GeoJSON），
  // 必须传 features 数组，否则标签层静默渲染为空。
  if (z > 3) {
    // 同一河流在 NE 数据里常被拆成多段（多个要素），每段都出标签会重叠。
    // 按名称去重：每个名称只保留坐标最多（最长）的那段，取其几何中点作为标签锚点。
    const byName = new Map();
    for (const f of rivers.features) {
      if (!f.geometry) continue;
      const name = f.properties.name || f.properties.name_en;
      if (!name) continue;
      const len = geomLen(f.geometry);
      const prev = byName.get(name);
      if (!prev || len > prev.len) byName.set(name, { f, len });
    }
    const riverFeatures = [...byName.values()].map((o) => o.f);
    layers.push(
      new TextLayer({
        id: 'river-label',
        data: riverFeatures,
        getPosition: (f) => {
          const g = f.geometry;
          if (!g) return [0, 0];
          if (g.type === 'LineString') return g.coordinates[Math.floor(g.coordinates.length / 2)] || [0, 0];
          if (g.type === 'MultiLineString' && g.coordinates[0])
            return g.coordinates[0][Math.floor(g.coordinates[0].length / 2)] || [0, 0];
          return [0, 0];
        },
        getText: (f) => {
          const name = f.properties.name || f.properties.name_en || '';
          return labelChinese ? zh(RIVER_ZH, name) : (f.properties.name_en || name);
        },
        getSize: 12,
        getColor: [20, 60, 120, 255],
        getPixelOffset: [0, -6],
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontWeight: 700,
        fontSettings: { sdf: true, fontSize: 128, buffer: 8 }, // 提高字体图集分辨率，SDF 渲染更锐利
        characterSet: labelChars,
        updateTriggers: { getText: labelChinese }, // 防御：与山脉层同理，声明文字对开关的依赖
        pickable: false,
      })
    );
  }
  return layers;
}

// 山脉/山峰：用 ScatterplotLayer 画点；放大到区域视图(zoom>2.5)时叠加名称标签
function buildMountainLayers() {
  if (!mountains) return [];
  const z = map ? map.getZoom() : 0;
  // 同样修复：ScatterplotLayer 也要传 features 数组
  const layers = [
    new ScatterplotLayer({
      id: 'mountain-dot',
      data: mountains.features,
      getPosition: (f) => f.geometry.coordinates,
      radiusUnits: 'pixels',
      getRadius: 3.4,
      radiusMinPixels: 2.2,
      getFillColor: [110, 75, 45, 245],
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 0.5,
      pickable: true,
      onClick: (info) => {
        if (info.object && panel) panel.showInfo({ name: info.object.properties.name || '山脉', status: 'mountain' });
      },
    }),
  ];
  if (z > 2.5) {
    layers.push(
      new TextLayer({
        id: 'mountain-label',
        data: mountains.features,
        getPosition: (f) => f.geometry.coordinates,
        getText: (f) => {
          const name = f.properties.name || '';
          return labelChinese ? zh(MOUNTAIN_ZH, name) : name;
        },
        getSize: 13,
        getColor: [90, 60, 40, 255],
        getPixelOffset: [0, -9],
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontWeight: 700,
        fontSettings: { sdf: true, fontSize: 128, buffer: 8 },
        characterSet: labelChars,
        // 关键：data 传的是同一数组引用（mountains.features），deck.gl 不会因 getText 闭包变化
        // 重算文字属性；必须用 updateTriggers 声明依赖，否则中英切换后标签停留在首次渲染的文字
        updateTriggers: { getText: labelChinese },
        pickable: false,
      })
    );
  }
  return layers;
}

// 湖泊：蓝色半透明面 + 细边
function buildLakeLayer() {
  if (!lakes) return null;
  return new GeoJsonLayer({
    id: 'lake',
    data: lakes,
    stroked: true,
    filled: true,
    getFillColor: [70, 130, 200, 130],
    getLineColor: [40, 90, 160, 180],
    getLineWidth: 0.5,
    lineWidthMinPixels: 0.3,
    pickable: false,
  });
}

// ---- 标签辅助 ----
// 鞋带公式质心：取最大外环，返回 [lon, lat] 与外环对角线度数（用于按缩放分级显示标签）
function polygonMeta(geometry) {
  let rings = [];
  if (geometry.type === 'Polygon') rings = [geometry.coordinates[0]];
  else if (geometry.type === 'MultiPolygon') rings = geometry.coordinates.map((p) => p[0]);
  let best = null;
  let bestA = 0;
  for (const ring of rings) {
    let a = 0, cx = 0, cy = 0;
    let minX = 180, maxX = -180, minY = 90, maxY = -90;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const f = x1 * y2 - x2 * y1;
      a += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
      if (x1 < minX) minX = x1; if (x1 > maxX) maxX = x1;
      if (y1 < minY) minY = y1; if (y1 > maxY) maxY = y1;
    }
    a /= 2;
    if (Math.abs(a) > Math.abs(bestA)) {
      bestA = a;
      best = {
        c: Math.abs(a) > 1e-9 ? [cx / (6 * a), cy / (6 * a)] : [(minX + maxX) / 2, (minY + maxY) / 2],
        d: Math.hypot(maxX - minX, maxY - minY),
      };
    }
  }
  return best || { c: null, d: 0 };
}

// 预计算每个疆域要素的质心与尺寸（加载后执行一次）
function precomputeTerritoryMeta() {
  for (const t of territories) {
    t.meta = polygonMeta(t.feature.geometry);
  }
}

// ---- 宗主国/占领国查询（CShapes ruledby = 统治国 GW 编码）----
const gwcodeIndex = new Map(); // gwcode -> [{startYear,endYear,name}]
const SPECIAL_RULERS = { 1: '联合国（临时行政当局）' }; // ruledby=0（但泽自由市）不显示
function buildGwcodeIndex() {
  gwcodeIndex.clear();
  for (const t of territories) {
    const p = t.feature.properties;
    if (p.gwcode == null) continue;
    let arr = gwcodeIndex.get(p.gwcode);
    if (!arr) gwcodeIndex.set(p.gwcode, (arr = []));
    arr.push({ startYear: t.startYear, endYear: t.endYear, name: p.cntry_name });
  }
}
// 给定统治国 GW 编码与年份，返回当时的国名（优先同年，否则取时间最近的一片）
function rulerName(gwcode, year) {
  if (gwcode == null) return null;
  if (SPECIAL_RULERS[gwcode]) return SPECIAL_RULERS[gwcode];
  const arr = gwcodeIndex.get(gwcode);
  if (!arr || !arr.length) return null;
  const hit =
    arr.find((a) => year >= a.startYear && year <= a.endYear) ||
    arr.reduce((best, a) => {
      if (!best) return a;
      return Math.abs(a.startYear - year) < Math.abs(best.startYear - year) ? a : best;
    }, null);
  return hit ? hit.name : null;
}

// deck.gl TextLayer 的 characterSet：必须显式包含所有用到的字符（默认 auto 只含 ASCII，中文会缺字形）。
// 加载数据后收集全部可能出现的标签字符。
let labelChars = 'auto';
function computeLabelChars() {
  const s = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-()\'/');
  const add = (txt) => { if (txt) for (const ch of txt) s.add(ch); };
  for (const t of territories) add(zhCountry(t.feature.properties.cntry_name) || t.feature.properties.cntry_name);
  if (rivers) for (const f of rivers.features) add(zh(RIVER_ZH, f.properties?.name || ''));
  if (mountains) for (const f of mountains.features) add(zh(MOUNTAIN_ZH, f.properties?.name || ''));
  for (const d of DYNASTIES) {
    add(d.name); add(d.capital);
    if (d.states) for (const s of d.states) { add(s.name); add(s.capital); } // 战国政权名/都城
  }
  for (const v of HB_ZH_VALUES) add(v); // 1886 年前的历史政权译名（如"阿拔斯王朝"）
  labelChars = [...s];
}

// 国家名称标签：中文名，盖在疆域之上（deck 覆盖层整体位于地图之上）。
// 按缩放分级显示：世界视图只标大国，放大后逐级显示小国。
function buildTerritoryLabelLayer() {
  const z = map ? map.getZoom() : 0;
  if (z < 2 || labelChars === 'auto') return null;
  const minDiag = z < 3 ? 8 : z < 4 ? 3.5 : z < 5 ? 1.2 : 0;
  // 同名去重：CShapes 中同一国家同年可能由多个要素（多块领土）组成，
  // 每块各出一个标签会重复；按国名合并，只保留最大那块的标签。
  const byName = new Map();
  for (const t of territories) {
    if (currentYear < t.startYear || currentYear > t.endYear) continue;
    if (!t.meta || !t.meta.c || t.meta.d < minDiag) continue;
    const name = zhCountry(t.feature.properties.cntry_name) || t.feature.properties.cntry_name;
    const prev = byName.get(name);
    if (!prev || t.meta.d > prev.meta.d) byName.set(name, t);
  }
  const data = [...byName.values()].map((t) => {
    const name = t.feature.properties.cntry_name;
    return {
      coordinates: t.meta.c,
      text: labelChinese ? (zhCountry(name) || name) : name,
    };
  });
  return new TextLayer({
    id: 'territory-label',
    data,
    getPosition: (d) => d.coordinates,
    getText: (d) => d.text,
    getSize: z > 5 ? 16 : 14,
    getColor: [25, 25, 25, 250],
    fontFamily: 'Microsoft YaHei, sans-serif',
    fontWeight: 700,
    fontSettings: { sdf: true, fontSize: 128, buffer: 8 },
    characterSet: labelChars,
    updateTriggers: { getText: labelChinese }, // 防御：声明文字对开关的依赖
    pickable: false,
  });
}

// ---- 中国历代疆域模式图层 ----
function buildChinaTerritoryLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d || !chinaDynasties) return null;
  const feats = chinaDynasties.filter((f) => f.properties.id === d.id);
  if (!feats.length) return null;
  return new GeoJsonLayer({
    id: 'china-territory',
    data: { type: 'FeatureCollection', features: feats }, // 战国等多政权并立
    getFillColor: [178, 84, 58, 235], // 朱红（历史感）
    getLineColor: [80, 30, 20, 230],
    getLineWidth: 1.2,
    lineWidthMinPixels: 0.8,
    stroked: true,
    filled: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: (info) => {
      chinaInfoOpen = true;
      if (panel) panel.showChinaInfo(d, info.object?.properties?.state);
    },
  });
}

// 王朝疆域轮廓层：优先于省界拼接（形状按历史疆域绘制，更接近史实）。
// 每个朝代可能有多个年代的轮廓（如清有 1700/1783/1800），取年份最接近当前年份的那个。
function buildChinaOutlineLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d || !chinaOutlines || !chinaOutlines.length) return null;
  const cands = chinaOutlines.filter((f) => f.properties.dynasty === d.id);
  if (!cands.length) return null;
  const best = cands.reduce((a, b) =>
    Math.abs(b.properties.year - currentYear) < Math.abs(a.properties.year - currentYear) ? b : a
  );
  return new GeoJsonLayer({
    id: 'china-outline',
    data: { type: 'FeatureCollection', features: [best] },
    getFillColor: layersState.relief ? [178, 84, 58, 150] : [178, 84, 58, 235], // 朱红；晕渲时半透明
    getLineColor: [90, 30, 18, 240],
    getLineWidth: 1.6,
    lineWidthMinPixels: 1,
    updateTriggers: { getFillColor: layersState.relief },
    stroked: true,
    filled: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: (info) => {
      chinaInfoOpen = true;
      if (panel) panel.showChinaInfo(d, info.object?.properties?.state);
    },
  });
}

// 历代政区界层：CHGIS 州/郡/府/路，只描边不填充，叠在疆域轮廓之上
// （谭其骧《中国历史地图集》式呈现：疆域范围 + 内部政区界）
function buildChinaRegionLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d || !chinaRegions || !chinaRegions.length) return null;
  let feats = chinaRegions.filter(
    (f) => f.properties.dynasty === d.id && currentYear >= f.properties.beg && currentYear <= f.properties.end
  );
  // 兜底：某些朝代的政区年份区间覆盖不全（如唐末），过滤后过少则显示该朝代全部政区
  if (feats.length < 3) feats = chinaRegions.filter((f) => f.properties.dynasty === d.id);
  if (!feats.length) return null;
  return new GeoJsonLayer({
    id: 'china-regions',
    data: { type: 'FeatureCollection', features: feats },
    stroked: true,
    filled: false, // 只画界线，避免与疆域填充叠色
    getLineColor: [110, 60, 35, 170],
    getLineWidth: 0.8,
    lineWidthMinPixels: 0.5,
    pickable: true,
    onClick: (info) => {
      if (!info.object || !panel) return;
      chinaInfoOpen = true;
      panel.showChinaRegion(info.object.properties, d);
    },
  });
}

function buildChinaCapitalLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d) return [];
  const points = d.states
    ? d.states.map((s) => ({ coords: s.capitalCoord, text: s.capital, state: s.name }))
    : d.capitalCoord
      ? [{ coords: d.capitalCoord, text: d.capital, state: null }]
      : [];
  if (!points.length) return [];
  const layers = [
    new ScatterplotLayer({
      id: 'china-capital',
      data: points,
      getPosition: (o) => o.coords,
      radiusUnits: 'pixels',
      getRadius: 5.5,
      radiusMinPixels: 4,
      getFillColor: [220, 30, 30, 240],
      stroked: true,
      getLineColor: [255, 255, 255, 220],
      lineWidthMinPixels: 1,
      pickable: true,
      onClick: (info) => {
        chinaInfoOpen = true;
        if (panel) panel.showChinaInfo(d, info.object?.state);
      },
    }),
    new TextLayer({
      id: 'china-capital-label',
      data: points,
      getPosition: (o) => o.coords,
      getText: (o) => o.text,
      getSize: 13,
      getColor: [120, 20, 20, 255],
      getPixelOffset: [0, -10],
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontWeight: 700,
      fontSettings: { sdf: true, fontSize: 128, buffer: 8 },
      characterSet: labelChars,
      pickable: false,
    }),
  ];
  return layers;
}

function updateLayers() {
  if (!deckOverlay) return;
  const layers = [];
  if (mode === 'china') {
    // 中国历代疆域：朝代疆域 + 都城，河流/山脉/湖泊作背景（按面板开关）
    if (layersState.territory) {
      // 疆域填充：优先用 historical-basemaps 的王朝轮廓（更接近史实），
      // 无轮廓的朝代（秦/三国/两晋/南北朝/隋/五代/南宋/民国）回落省界拼接底图
      const ol = buildChinaOutlineLayer();
      if (ol) layers.push(ol);
      else {
        const t = buildChinaTerritoryLayer();
        if (t) layers.push(t);
      }
      layers.push(...buildChinaCapitalLayer());
    }
    if (layersState.region) {
      const rg = buildChinaRegionLayer();
      if (rg) layers.push(rg);
    }
    if (layersState.river && rivers) layers.push(...buildRiverLayer());
    if (layersState.mountain && mountains) layers.push(...buildMountainLayers());
    if (layersState.lake && lakes) {
      const l = buildLakeLayer();
      if (l) layers.push(l);
    }
    deckOverlay.setProps({ layers });
    return;
  }
  // 世界模式
  if (layersState.territory) {
    if (currentYear < CSHAPES_START) {
      // 1886 年之前：CShapes 无数据，改用 historical-basemaps 的年代快照
      const t = buildWorldHistLayer();
      if (t) layers.push(t);
      const lbl = buildWorldHistLabelLayer();
      if (lbl) layers.push(lbl);
    } else {
      layers.push(buildTerritoryLayer());
      const lbl = buildTerritoryLabelLayer();
      if (lbl) layers.push(lbl);
    }
  }
  if (layersState.river && rivers) {
    layers.push(...buildRiverLayer());
  }
  if (layersState.mountain && mountains) {
    layers.push(...buildMountainLayers());
  }
  if (layersState.lake && lakes) {
    const l = buildLakeLayer();
    if (l) layers.push(l);
  }
  deckOverlay.setProps({ layers });
}

function fmtYear(y) {
  return y < 0 ? `前${-y}` : `${y}`;
}
function updateYearLabel() {
  document.getElementById('year-display').textContent = fmtYear(currentYear);
}

function addOverlayOnce() {
  if (deckOverlay || !map) return;
  try {
    deckOverlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(deckOverlay);
    updateLayers();
  } catch (e) {
    console.error('addOverlayOnce failed:', e);
  }
}

// 底图（demotiles）加载失败时的回落样式：纯背景，疆域仍可在其上渲染
const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0d1b2a' } }],
};

async function loadRivers() {
  try {
    const res = await fetch('./data/ne_rivers.geojson');
    if (res.ok) {
      rivers = await res.json();
      console.info(`[rivers] 已加载 ${rivers.features?.length || 0} 条河流`);
    } else {
      console.warn('[rivers] 未找到 ne_rivers.geojson（请运行 npm run fetch-data）');
    }
  } catch (e) {
    console.warn('[rivers] 加载失败（可选）：', e.message);
  }
}

async function loadMountains() {
  try {
    const res = await fetch('./data/ne_mountains.geojson');
    if (res.ok) {
      mountains = await res.json();
      console.info(`[mountains] 已加载 ${mountains.features?.length || 0} 个山脉点`);
    } else {
      console.warn('[mountains] 未找到 ne_mountains.geojson（请运行 npm run fetch-data）');
    }
  } catch (e) {
    console.warn('[mountains] 加载失败（可选）：', e.message);
  }
}

async function loadLakes() {
  try {
    const res = await fetch('./data/ne_lakes.geojson');
    if (res.ok) {
      lakes = await res.json();
      console.info(`[lakes] 已加载 ${lakes.features?.length || 0} 个湖泊`);
    } else {
      console.warn('[lakes] 未找到 ne_lakes.geojson（请运行 npm run fetch-data）');
    }
  } catch (e) {
    console.warn('[lakes] 加载失败（可选）：', e.message);
  }
}

// ---- 中国历代疆域模式：数据加载 / 事件内容 / 模式切换 ----
async function loadChina() {
  try {
    const res = await fetch('./data/china_dynasties.geojson');
    if (res.ok) {
      const gj = await res.json();
      chinaDynasties = gj.features || [];
      console.info(`[china] 已加载 ${chinaDynasties.length} 个朝代疆域`);
    } else {
      console.warn('[china] 未找到 china_dynasties.geojson（请先运行 node scripts/gen-china.mjs）');
    }
  } catch (e) {
    console.warn('[china] 加载失败（可选）：', e.message);
  }
}

// 中国历代疆域轮廓：来自 historical-basemaps（按历史疆域绘制，含西域等边疆）
async function loadChinaOutline() {
  try {
    const res = await fetch('./data/china_outline.geojson');
    if (res.ok) {
      const gj = await res.json();
      chinaOutlines = gj.features || [];
      console.info(`[china] 已加载 ${chinaOutlines.length} 个王朝疆域轮廓`);
    } else {
      console.warn('[china] 未找到 china_outline.geojson（可运行 node scripts/gen-china-outline.mjs 生成）');
    }
  } catch (e) {
    console.warn('[china] 轮廓加载失败（可选）：', e.message);
  }
}

// 中国历代政区界：CHGIS 政区（州/郡/府/路…），按 beg/end 逐年过滤
async function loadChinaRegions() {
  try {
    const res = await fetch('./data/china_regions.geojson');
    if (res.ok) {
      const gj = await res.json();
      chinaRegions = gj.features || [];
      console.info(`[china] 已加载 ${chinaRegions.length} 个历史政区要素`);
    } else {
      console.warn('[china] 未找到 china_regions.geojson（可运行 node scripts/gen-china-regions.mjs 生成）');
    }
  } catch (e) {
    console.warn('[china] 政区加载失败（可选）：', e.message);
  }
}

// 年份事件内容（供时间轴年份读数点击）：世界模式=世界大事，中国模式=朝代信息
function getYearEvents(y) {
  if (mode === 'china') {
    const d = getDynastyAtYear(y);
    if (!d) return { title: `📜 ${fmtYear(y)} · 暂无对应朝代`, items: [] };
    const items = [{ t: `都城：${d.capital}`, d: d.desc }];
    for (const e of d.events || []) items.push({ t: `${fmtYear(e.year)} ${e.title}`, d: e.desc });
    return { title: `📜 ${fmtYear(y)} · ${d.name}朝（${fmtYear(d.start)} – ${fmtYear(d.end)}）`, items };
  }
  return { title: `🌍 ${fmtYear(y)} 年 · 世界大事`, items: getWorldEvents(y) };
}

function setMode(m) {
  mode = m;
  document.getElementById('mode-world')?.classList.toggle('active', m === 'world');
  document.getElementById('mode-china')?.classList.toggle('active', m === 'china');
  chinaInfoOpen = false;
  // 关闭介绍卡：必须走 panel.hide() 清空内部 lastProps 状态。
  // 此前只直接给 DOM 加 hidden，lastProps 仍在，之后任意图层开关触发 rerender()
  // 会把上一模式的国家卡重新弹出来（世界点国家→切中国→取消历史疆域→弹框）。
  if (panel) panel.hide();
  else {
    const info0 = document.getElementById('info');
    if (info0) info0.classList.add('hidden');
    const ie0 = document.getElementById('info-events');
    if (ie0) { ie0.classList.add('hidden'); ie0.innerHTML = ''; }
  }
  if (m === 'china') {
    currentYear = CHINA_MIN;
    if (timeline) timeline.setRange(CHINA_MIN, CHINA_MAX, currentYear);
    map?.flyTo({ center: CHINA_CENTER, zoom: CHINA_ZOOM, duration: 800 });
    // 中国模式：不自动弹出介绍卡（信息卡已随模式切换关闭），待用户点击某个政权/朝代再打开
  } else {
    currentYear = 1960;
    if (timeline) timeline.setRange(YEAR_MIN, YEAR_MAX, currentYear);
    map?.flyTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM, duration: 800 });
  }
  updateYearLabel();
  updateLayers();
}

// 缩放事件：节流刷新图层（山脉/河流标签随缩放出现/隐藏）。
// 注意：时间粒度不再随缩放联动，改由时间轴的"步长"下拉框控制。
let zoomScheduled = false;
function onZoom() {
  if (!zoomScheduled) {
    zoomScheduled = true;
    requestAnimationFrame(() => {
      zoomScheduled = false;
      updateLayers();
    });
  }
}

async function init() {
  const loadingEl = document.getElementById('loading');
  try {
    map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // 关键修复：覆盖层立即挂载，不依赖底图是否加载成功
    let overlayAdded = false;
    const tryAddOverlay = () => {
      if (!overlayAdded) {
        overlayAdded = true;
        addOverlayOnce();
      }
    };
    tryAddOverlay();
    map.on('load', () => {
      tryAddOverlay();
      applyBasemapLand();
      applyRelief();
    });
    map.on('error', (e) => {
      console.error('[map error]', e && e.error);
      // 底图（demotiles）加载失败 → 回落到纯背景样式，疆域仍可显示
      try {
        map.setStyle(FALLBACK_STYLE);
      } catch (_) {}
      tryAddOverlay();
    });
    map.on('zoom', onZoom); // 缩放时刷新图层（标签随缩放显隐）

    // 时间轴/面板不依赖数据，先建——即使某类数据加载失败，控件依然可用
    timeline = createTimeline({
      min: YEAR_MIN,
      max: YEAR_MAX,
      value: currentYear,
      getYearEvents,
      onYear: (y) => {
        currentYear = y;
        updateYearLabel();
        updateLayers();
        if (mode === 'china') {
          // 中国模式：拖动年份时若信息卡打开，则刷新为该年所属朝代
          if (chinaInfoOpen && panel) panel.showChinaInfo(getDynastyAtYear(y));
        } else if (panel) {
          // 世界模式：国家卡随年份同步——同一国家（gwcode 相同）在当前年份仍有疆域，
          // 则换成该时段的属性重绘（存续/历时/事件随之更新）；已不存在则清空介绍卡。
          const props = panel.currentProps ? panel.currentProps() : null;
          if (props && props.cntry_name && currentYear < CSHAPES_START) {
            // 1886 年前：在 historical-basemaps 快照里找同名政权（跨年代时同步卡片）
            const feats = hbCache.get(hbYearFor(currentYear)) || [];
            const hit = feats.find((f) => f.properties.cntry_name === props.cntry_name);
            if (hit) panel.showInfo(hit.properties);
            else panel.hide();
          } else if (props && props.cntry_name) {
            const t = territories.find(
              (t) =>
                currentYear >= t.startYear &&
                currentYear <= t.endYear &&
                (props.gwcode != null
                  ? t.feature.properties.gwcode === props.gwcode
                  : t.feature.properties.cntry_name === props.cntry_name)
            );
            if (t) panel.showInfo(t.feature.properties);
            else panel.hide();
          } else if (panel.rerender) {
            panel.rerender(); // 山脉卡等无政权时间属性，按旧逻辑刷新
          }
        }
      },
    });
    panel = createPanel({
      rulerName, // 宗主国/占领国查询（殖民地/保护国/托管地/被占领土卡片显示"被谁统治"）
      onToggleLayer: (k, v) => {
        if (k === 'zh') {
          labelChinese = v;
        } else {
          layersState[k] = v;
          if (k === 'basemapLand') applyBasemapLand();
          if (k === 'relief') applyRelief(); // 地形晕渲（同时疆域填充会降低不透明度）
        }
        updateLayers();
        if (panel && panel.rerender) panel.rerender(); // 刷新打开中的信息卡（简介+事件随语言/图层同步）
      },
      onReset: () => map.flyTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM, duration: 800 }),
    });
    // 世界/中国模式切换
    document.getElementById('mode-world')?.addEventListener('click', () => setMode('world'));
    document.getElementById('mode-china')?.addEventListener('click', () => setMode('china'));
    // 后台加载中国疆域：底图 + 王朝轮廓 + 历代政区
    Promise.all([loadChina(), loadChinaOutline(), loadChinaRegions()]).then(() => {
      if (mode === 'china') updateLayers();
    });
    updateYearLabel();
    updateLayers();

    // 并行加载四类数据（此前是串行 await：CShapes 26MB 卡住时河流/山脉压根没开始
    // 加载，造成"山脉不显示/河名不显示/永远在加载"三连）。单项失败只影响自身。
    const TOTAL = 4;
    let done = 0;
    let cshapesDone = false;
    const settle = () => {
      done++;
      if (done < TOTAL) {
        // 三类小数据先到时，剩下的一定是 26MB 的 CShapes，给出明确预期
        loadingEl.textContent = cshapesDone
          ? `正在加载数据（${done}/${TOTAL}）…`
          : '正在加载历史疆域（CShapes 26MB，约需数秒到 1 分钟）…';
        return;
      }
      if (territories.length === 0) {
        loadingEl.textContent =
          '⚠️ 历史疆域(CShapes)加载失败，河流/山脉图层仍可用。请检查网络或控制台报错后刷新重试';
      } else {
        loadingEl.classList.add('hidden');
      }
    };
    const refresh = () => {
      computeLabelChars();
      updateLayers();
    };

    loadCShapes()
      .then((ts) => {
        cshapesDone = true;
        territories = ts;
        precomputeTerritoryMeta();
        buildGwcodeIndex(); // 建 GW 编码索引（供“被谁占领/殖民”查询）
        refresh();
        settle();
      })
      .catch((e) => {
        console.error('[CShapes] 加载失败：', e);
        cshapesDone = true;
        territories = [];
        settle();
      });
    loadRivers().then(() => { refresh(); settle(); });
    loadMountains().then(() => { refresh(); settle(); });
    loadLakes().then(() => { refresh(); settle(); });
  } catch (e) {
    loadingEl.classList.remove('hidden');
    loadingEl.textContent = '初始化失败：' + (e && e.message ? e.message : e);
    console.error(e);
  }
}

init();
