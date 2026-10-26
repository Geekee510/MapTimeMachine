import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css'; // 关键修复：此前样式从未被引入，导致 #map 高度为 0（地图不可见）、.hidden 失效（加载提示永不消失）
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { loadCShapes } from './data/loaders.js';
import { zhCountry, zh, RIVER_ZH, MOUNTAIN_ZH, HB_ZH_VALUES } from './data/i18n.js';
import { polityDesc, fallbackDesc, regionOf } from './data/polity-desc.js';
import { DYNASTIES, getDynastyAtYear, statesAtYear } from './data/china.js';
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
const layersState = { territory: true, outline: true, region: true, relief: false, river: true, riverLabel: true, mountain: true, lake: false, basemapLand: false };
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

// 开启地形晕渲时降低填充不透明度（默认 a），让底下山体阴影透出
function reliefAlpha(a) {
  return layersState.relief ? 150 : a;
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

// 给定年份，返回该年**应当渲染**的疆域要素。
// ⚠️ 不能简单用 start<=y<=end 全量过滤：CShapes 同一国家在同一年可能有多片
// （年内多次疆域变更，如美国 1959 年 1 月阿拉斯加建州、8 月夏威夷建州，
//  被切成 [1886~1959] / [1959~1959] / [1959~2023] 三片，起始日各不相同）。
// 全量校验：710 个要素里共 395 个"国-年"存在这种年内切片（单年最多 7 片）。
// 三片全画会填充叠色、边界重影、点选命中错层；
// 故同一国家只保留 **起始日期最晚** 的一片（= 该年的最终疆域状态）。
// 已验证不存在"同国同年且起始日相同"的并列领土，所以这样不会丢领土。
function territoriesAtYear(year) {
  const latest = new Map(); // gwcode -> territory（该年最新的那一片）
  const out = [];
  for (const t of territories) {
    if (year < t.startYear || year > t.endYear) continue;
    const code = t.props.gwcode ?? t.props.cntry_name;
    const prev = latest.get(code);
    if (!prev) {
      latest.set(code, t);
      out.push(t);
      continue;
    }
    if (t.startKey >= prev.startKey) {
      out[out.indexOf(prev)] = t; // 用更晚的一片替换
      latest.set(code, t);
    }
  }
  return out;
}

function buildTerritoryLayer() {
  const active = territoriesAtYear(currentYear).map((t) => t.feature);
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

// 判断一个名字是否代表"政权/国家"，而非族群、考古文化或部落。
// historical-basemaps 覆盖全球原住民族群，其色块不是政治实体，直接显示会造成
// 严重误导（典型：公元前 2000 年的 Thai 色块横跨中国南方）。
const NON_POLITY_PATTERNS = [
  /\b(hunter|hunters|hunter-foragers|gatherer|gatherers|forager|foragers|farmer|farmers|farming|nomad|nomads|nomadic|pastoral|pastoralists)\b/i,
  /\b(tribe|tribes|tribal|peoples?|culture|cultures|civilization|civilisation|chiefdom|chiefdoms|society|societies)\b/i,
  /\b(hunter-gatherer|hunter gatherer|neolithic|mesolithic|paleolithic|bronze age|iron age|stone age)\b/i,
  /\b(clan|clans|band|bands|horde|confederacy of)\b/i,
  /\(?(indigenous|native|aboriginal|first nations)\)?/i,
];
// 明确的族群/语族名（这些是民族而非国家）
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
  if (!n || n === '?' || /^\s*$/.test(n)) return false; // 无名色块（含覆盖北半球的背景多边形）
  if (NON_POLITY_EXACT.has(n)) return false;
  if (NON_POLITY_PATTERNS.some((re) => re.test(n))) return false;
  return true;
}

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
    // historical-basemaps 把大量「族群 / 考古文化 / 部落」也画成大色块
    // （如公元前 2000 年的 "Thai" 覆盖 lon 96–122 / lat 20–44，横跨中国南方，
    //  被误读为"泰国占了中原"）。这类不是政权，过滤掉。
    const feats = (gj.features || []).filter((f) => isPolityName(f.properties?.NAME)).map((f) => {
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
          // ⚠️ 这里刻意**不写** gwsyear/gweyear：
          // historical-basemaps 是"某一年份的世界快照"，year~endYear 只是这张快照的
          // 适用区间（到下一张快照前），**不是该政权的存续时间**。
          // 写进 gwsyear/gweyear 会让信息卡把"唐朝"显示成"存续 1279 – 1299（历时 20 年）"。
          // 故改用 snapYear/snapEnd，信息卡只显示"本图年代快照"。
          snapYear: year,
          snapEnd: endYear,
          isSnapshot: true,
        },
        geometry: f.geometry,
      };
      feat.meta = polygonMeta(f.geometry); // 预计算质心，供标签层使用
      if (feat.meta && feat.meta.c) {
        feat.properties.region = regionOf(feat.meta.c[0], feat.meta.c[1]); // 供信息卡兜底简介
      }
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
    // 传年份："Jin" 在晋朝快照要译"西晋/东晋"（不是女真金）、"Song Empire" 分北宋/南宋
    text: labelChinese
      ? (zhCountry(f.properties.cntry_name, f.properties.snapYear) || f.properties.cntry_name)
      : f.properties.cntry_name,
  }));
  return new TextLayer({
    id: 'hb-territory-label',
    data,
    getPosition: (d) => d.coordinates,
    getText: (d) => d.text,
    getSize: z > 5 ? 16 : 14,
    getColor: [25, 25, 25, 250],
    fontFamily: LABEL_FONT_FAMILY,
    fontWeight: 700,
    fontSettings: labelFontSettings,
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

// 主要河流：只画河流线（不画名称）。名称由独立的 buildRiverLabelLayer 负责，
// 面板上拆成「主要河流」与「河流名称」两个开关，可分别控制。
function buildRiverLineLayer() {
  if (!rivers) return null;
  const z = map ? map.getZoom() : 0;
  return new GeoJsonLayer({
    id: 'river',
    data: rivers,
    stroked: true,
    filled: false,
    getLineColor: [30, 90, 170, 220],
    lineWidthUnits: 'pixels',
    getLineWidth: z > 4 ? 2.2 : 1.4, // 放大后略加粗
    lineWidthMinPixels: 1,
    pickable: false,
  });
}

// 河流名称标签（放大到区域视图才显示，避免世界视图糊成一片）。
// 注意：TextLayer 不能直接吃 FeatureCollection（只有 GeoJsonLayer 能解析 GeoJSON），
// 必须传 features 数组，否则标签层静默渲染为空。
function buildRiverLabelLayer() {
  if (!rivers || labelChars === 'auto') return null;
  const z = map ? map.getZoom() : 0;
  if (z <= 3) return null;
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
  return new TextLayer({
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
    fontFamily: LABEL_FONT_FAMILY,
    fontWeight: 700,
    fontSettings: labelFontSettings,
    characterSet: labelChars,
    updateTriggers: { getText: labelChinese }, // 防御：与山脉层同理，声明文字对开关的依赖
    pickable: false,
  });
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
        fontFamily: LABEL_FONT_FAMILY,
        fontWeight: 700,
        fontSettings: labelFontSettings,
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
// 给定统治国 GW 编码与年份，返回当时的国名。
// 优先取区间包含该年的一片；没有则取"时间上离该年最近"的一片
// （距离按整段区间算：在区间外时才计距离，比只比 startYear 更准，
//  例如查 1910 年的宗主国，应命中 [1886~1918] 而非更早的 [1886~1900]）。
function rulerName(gwcode, year) {
  if (gwcode == null) return null;
  if (SPECIAL_RULERS[gwcode]) return SPECIAL_RULERS[gwcode];
  const arr = gwcodeIndex.get(gwcode);
  if (!arr || !arr.length) return null;
  const dist = (a) => (year < a.startYear ? a.startYear - year : year > a.endYear ? year - a.endYear : 0);
  const hit =
    arr.find((a) => year >= a.startYear && year <= a.endYear) ||
    arr.reduce((best, a) => (!best || dist(a) < dist(best) ? a : best), null);
  return hit ? hit.name : null;
}

// ---- 标签字体配置 ----
// fontFamily 里的字体名含空格，必须加引号，否则部分浏览器解析 ctx.font 失败退回默认字体。
const LABEL_FONT_FAMILY =
  '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';

// deck.gl 的 SDF 字体图集：canvas 宽度固定 1024（MAX_CANVAS_WIDTH），
// 高度 = nextPowOfTwo(行数 × 行高)，行数随字符集增大而增加。
// 一旦高度超过 GPU 的 MAX_TEXTURE_SIZE（桌面常见 16384，部分环境 8192），
// 纹理上传失败 → **所有标签渲染成小方块（豆腐块）**。
// 译名表扩充到 4400+ 条后字符集已达 800+，原先 fontSize:128/buffer:8 会让图集高 32768，
// 直接超限。故按字符集大小自适应选字号，保证图集高度 ≤ 8192。
// 上限取「8192」与「本机 GPU 实际 MAX_TEXTURE_SIZE」的较小值（不同机器差异很大）。
let maxAtlasHeight = 8192;
function detectMaxAtlasHeight() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (max) maxAtlasHeight = Math.min(8192, max);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch (e) {
    /* 探测失败就用默认 8192 */
  }
}

const FONT_SIZE_CANDIDATES = [[64, 4], [48, 4], [32, 3], [24, 2]];
let labelFontSettings = { sdf: true, fontSize: FONT_SIZE_CANDIDATES[0][0], buffer: FONT_SIZE_CANDIDATES[0][1], radius: 8, cutoff: 0.25 };

function pickFontSettings(charCount) {
  const atlasHeight = (F, B) => {
    const perRow = Math.max(1, Math.floor(1024 / (F + 2 * B))); // canvas 宽 1024
    const rows = Math.ceil(charCount / perRow);
    const rowHeight = 1.2 * F + 2 * B; // ascent+descent ≈ 1.2×fontSize
    return Math.pow(2, Math.ceil(Math.log2(Math.max(1, rows * rowHeight)))); // nextPowOfTwo
  };
  for (const [F, B] of FONT_SIZE_CANDIDATES) {
    if (atlasHeight(F, B) <= maxAtlasHeight) {
      return { sdf: true, fontSize: F, buffer: B, radius: F >= 64 ? 8 : 6, cutoff: 0.25 };
    }
  }
  const [F, B] = FONT_SIZE_CANDIDATES[FONT_SIZE_CANDIDATES.length - 1];
  return { sdf: true, fontSize: F, buffer: B, radius: 6, cutoff: 0.25 };
}

// deck.gl TextLayer 的 characterSet：必须显式包含所有用到的字符（默认 auto 只含 ASCII，中文会缺字形）。
// 加载数据后收集全部可能出现的标签字符。
let labelChars = 'auto';
function computeLabelChars() {
  const s = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-()\'/');
  const add = (txt) => { if (txt) for (const ch of txt) s.add(ch); };
  for (const t of territories) add(zhCountry(t.feature.properties.cntry_name, t.startYear) || t.feature.properties.cntry_name);
  if (rivers) for (const f of rivers.features) add(zh(RIVER_ZH, f.properties?.name || ''));
  if (mountains) for (const f of mountains.features) add(zh(MOUNTAIN_ZH, f.properties?.name || ''));
  for (const d of DYNASTIES) {
    add(d.name); add(d.capital);
    if (d.states) for (const s of d.states) { add(s.name); add(s.capital); } // 并立政权名/都城
  }
  for (const v of HB_ZH_VALUES) add(v); // 1886 年前的历史政权译名（如"阿拔斯王朝"）
  labelChars = [...s];
  detectMaxAtlasHeight();
  labelFontSettings = pickFontSettings(s.size);
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
  for (const t of territoriesAtYear(currentYear)) {
    if (!t.meta || !t.meta.c || t.meta.d < minDiag) continue;
    const name = zhCountry(t.feature.properties.cntry_name, currentYear) || t.feature.properties.cntry_name;
    const prev = byName.get(name);
    if (!prev || t.meta.d > prev.meta.d) byName.set(name, t);
  }
  const data = [...byName.values()].map((t) => {
    const name = t.feature.properties.cntry_name;
    return {
      coordinates: t.meta.c,
      text: labelChinese ? (zhCountry(name, currentYear) || name) : name,
    };
  });
  return new TextLayer({
    id: 'territory-label',
    data,
    getPosition: (d) => d.coordinates,
    getText: (d) => d.text,
    getSize: z > 5 ? 16 : 14,
    getColor: [25, 25, 25, 250],
    fontFamily: LABEL_FONT_FAMILY,
    fontWeight: 700,
    fontSettings: labelFontSettings,
    characterSet: labelChars,
    updateTriggers: { getText: labelChinese }, // 防御：声明文字对开关的依赖
    pickable: false,
  });
}

// ---- 中国历代疆域模式图层 ----
// 并立政权配色（战国七雄 / 三国 / 南北朝 / 五代十国）：
// 同一朝代内按政权名分配不同色相，避免相邻敌国连成一整块朱红难以分辨。
const STATE_PALETTE = [
  [178, 84, 58], [92, 108, 148], [126, 132, 76], [150, 96, 132],
  [78, 130, 128], [166, 122, 62], [112, 96, 150], [148, 88, 84],
];
function buildChinaTerritoryLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d || !chinaDynasties) return null;
  // 按年份筛选：并立政权各自带 sStart/sEnd（如辽 907–1125、金 1115–1234），
  // 这样 1115–1125 年辽金同时呈现，1227 年西夏消失、1234 年后金地归蒙古。
  const feats = chinaDynasties.filter(
    (f) => f.properties.id === d.id
      && (f.properties.sStart == null || (currentYear >= f.properties.sStart && currentYear <= f.properties.sEnd))
  );
  if (!feats.length) return null;
  // 各政权分色：同一 feature 集合内按 state 名取色
  const names = [...new Set(feats.map((f) => f.properties.state).filter(Boolean))];
  const colorOf = (f) => {
    if (names.length <= 1) return [178, 84, 58, reliefAlpha(235)]; // 统一王朝：朱红
    const c = STATE_PALETTE[names.indexOf(f.properties.state) % STATE_PALETTE.length];
    return [c[0], c[1], c[2], reliefAlpha(235)];
  };
  return new GeoJsonLayer({
    id: 'china-territory',
    data: { type: 'FeatureCollection', features: feats }, // 战国等多政权并立
    getFillColor: (f) => colorOf(f),
    updateTriggers: { getFillColor: names.join('|') + layersState.relief },
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
      // 疆域层在政区层之下：政区数据空隙处的点击会落到这里。若坐标仍位于某个
      // 政区多边形内（政区层因拾取次序/三角化等偶发未命中），优先弹政区卡。
      const rp = regionPropsAtCoordinate(info.coordinate);
      if (rp && panel) {
        panel.showChinaRegion(rp, d);
        return;
      }
      if (panel) panel.showChinaInfo(d, info.object?.properties?.state, currentYear);
    },
  });
}

// 王朝疆域轮廓层（historical-basemaps 的真实王朝多边形）。
// 【已改为只描边、不填充】此前它与省界拼接层"双层实心叠加"，看起来像凭空多出一个图层：
//   · 北宋：HB 的 Song Empire 轮廓会整块盖在辽、西夏、大理的分色之上；
//   · 中华人民共和国：该轮廓缺台湾、西藏等，实心覆盖反而掩盖了我们省界清单里的完整版图。
// 现在只作为"史实边界参考线"（红色细线）叠在疆域之上，既不遮挡分色也不缺块。
// 每个朝代可能有多个年代的轮廓（如清有 1700/1783/1800），取年份最接近当前年份的那个。
// 注意：**中华人民共和国没有轮廓数据**——HB 的 1960 China 多边形缺西藏/台湾/海南
// （已在 gen-china-outline.mjs 中剔除），此函数对该朝代返回 null，不画参考线；
// 现代中国疆域一律以省界拼接层为准（该层含台湾、西藏、海南及南海诸岛）。
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
    stroked: true,
    filled: false, // 关键：不再用第二个实心多边形覆盖疆域层
    // 配色：先试过深褐 [90,30,18]、深靛紫 [96,58,142]，与砖红填充相比
    // 明度差都不够（都偏暗），线条在色块上"陷"进去。
    // 现改为高饱和正红 —— 既换了色相，也把明度提上来，双维度都能拉开距离。
    getLineColor: [226, 36, 42, 250],
    getLineWidth: 2.2,
    lineWidthMinPixels: 1.4,
    pickable: false,
  });
}

// ── 政区要素与点包含检测（政区层 / 疆域层点击兜底 / 点击托底层共用）─────────
// 当前朝代、当前年份应显示的政区要素（含 <3 时的整朝兜底，与渲染逻辑一致）
function getChinaRegionFeats(d) {
  if (!chinaRegions || !chinaRegions.length) return [];
  let feats = chinaRegions.filter(
    (f) => f.properties.dynasty === d.id && currentYear >= f.properties.beg && currentYear <= f.properties.end
  );
  // 兜底：某些朝代的政区年份区间覆盖不全（如唐末），过滤后过少则显示该朝代全部政区
  if (feats.length < 3) feats = chinaRegions.filter((f) => f.properties.dynasty === d.id);
  return feats;
}

// 射线法点包含检测（支持带内环洞的 Polygon / MultiPolygon）
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInGeometry(pt, geom) {
  if (!geom) return false;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of polys) {
    if (p[0] && pointInRing(pt, p[0])) {
      let inHole = false;
      for (let k = 1; k < p.length; k++) if (pointInRing(pt, p[k])) inHole = true;
      if (!inHole) return true;
    }
  }
  return false;
}

// 点击坐标处的政区属性。仅当政区开关开启时参与匹配；
// CHGIS 数据存在空隙（如西汉的江汉平原、东汉三国两晋的汉江流域大片无政区多边形），
// 空隙处返回 null，由调用方回落到朝代卡。
function regionPropsAtCoordinate(coord) {
  if (!layersState.region || !coord) return null;
  const d = getDynastyAtYear(currentYear);
  if (!d) return null;
  for (const f of getChinaRegionFeats(d)) {
    if (pointInGeometry(coord, f.geometry)) return f.properties;
  }
  return null;
}

// 历代政区界层：CHGIS 州/郡/府/路，只描边不填充，叠在疆域轮廓之上
// （谭其骧《中国历史地图集》式呈现：疆域范围 + 内部政区界）
function buildChinaRegionLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d) return null;
  const feats = getChinaRegionFeats(d);
  if (!feats.length) return null;
  return new GeoJsonLayer({
    id: 'china-regions',
    data: { type: 'FeatureCollection', features: feats },
    stroked: true,
    // 【拾取关键】必须 filled:true，哪怕填充几乎全透明。
    // filled:false 时多边形内部不渲染任何片元，只有 0.5~0.8px 宽的描边可命中
    // → 表现为"点政区内没反应，只有刚好点在界线上才弹卡片"。
    // 拾取有效性由 picking 着色器的有效性标志决定、与填充透明度无关（已核对
    // deck.gl v9 picking 模块源码），因此 alpha=1 的隐形填充可让整块区域可点击，
    // 同时保持"只看见界线"的观感（1/255 的着色肉眼不可辨）。
    filled: true,
    getFillColor: [110, 60, 35, 1],
    getLineColor: [110, 60, 35, 170],
    getLineWidth: 0.8,
    lineWidthMinPixels: 0.5,
    pickable: true,
    autoHighlight: true,
    highlightColor: [226, 36, 42, 70], // 悬停即泛红：明确告诉用户"这块可以点"
    onClick: (info) => {
      if (!info.object || !panel) return;
      chinaInfoOpen = true;
      panel.showChinaRegion(info.object.properties, d);
    },
  });
}

// 隐形点击托底层：垫在中国模式所有图层最下。
// CHGIS 政区数据有空隙（汉江流域、江汉平原等大片无政区多边形），当「历史疆域」
// 关闭时空隙处的点击不再有任何层接住（deck.gl 只回调"被命中"图层的 onClick），
// 表现为"点了没反应"。此层用疆域要素做一层几乎透明的填充接住疆域范围内的全部点击：
// 命中政区多边形 → 政区卡；落在数据空隙 → 朝代卡。
// 仅当政区开关开启时存在（用户显式关掉政区界时不改变任何点击行为）。
function buildChinaClickCatcher() {
  if (!layersState.region) return null;
  const d = getDynastyAtYear(currentYear);
  if (!d || !chinaDynasties) return null;
  const feats = chinaDynasties.filter(
    (f) => f.properties.id === d.id
      && (f.properties.sStart == null || (currentYear >= f.properties.sStart && currentYear <= f.properties.sEnd))
  );
  if (!feats.length) return null;
  return new GeoJsonLayer({
    id: 'china-click-catcher',
    data: { type: 'FeatureCollection', features: feats },
    filled: true,
    stroked: false,
    getFillColor: [0, 0, 0, 1], // alpha=1：隐形但可拾取（有效性标志与 alpha 无关）
    pickable: true,
    autoHighlight: false,
    onClick: (info) => {
      if (!panel || !info.coordinate) return;
      chinaInfoOpen = true;
      const rp = regionPropsAtCoordinate(info.coordinate);
      if (rp) panel.showChinaRegion(rp, d);
      else panel.showChinaInfo(d, null, currentYear);
    },
  });
}

function buildChinaCapitalLayer() {
  const d = getDynastyAtYear(currentYear);
  if (!d) return [];
  // 按年份取当朝政权（同名政权去重：如两条"秦"/"蒙古"只画一个都城点）
  const seen = new Set();
  const points = [];
  for (const s of statesAtYear(d, currentYear)) {
    if (seen.has(s.name) || !s.capitalCoord) continue;
    seen.add(s.name);
    points.push({ coords: s.capitalCoord, text: s.capital, state: s.name });
  }
  if (!points.length && d.capitalCoord) {
    points.push({ coords: d.capitalCoord, text: d.capital, state: null });
  }
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
        if (panel) panel.showChinaInfo(d, info.object?.state, currentYear);
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
      fontFamily: LABEL_FONT_FAMILY,
      fontWeight: 700,
      fontSettings: labelFontSettings,
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
    // 隐形点击托底层垫在最下：疆域关闭时政区数据空隙处的点击也有响应
    const catcher = buildChinaClickCatcher();
    if (catcher) layers.push(catcher);
    if (layersState.territory) {
      // 疆域填充：省界拼接底图【始终绘制】（台湾 / 西藏 / 外蒙古等在我们自己维护的
      // 省份清单里，historical-basemaps 的王朝轮廓常缺这些地区，早期版本用轮廓
      // “替代”底图导致台湾、西藏长期不显示）；王朝轮廓在其上叠加，二者取并集。
      const t = buildChinaTerritoryLayer();
      if (t) layers.push(t);
      layers.push(...buildChinaCapitalLayer());
    }
    // 史实边界参考线：独立开关（不依赖「历史疆域」填充开关，
    // 便于只看轮廓、关掉填充对比时使用）
    if (layersState.outline) {
      const ol = buildChinaOutlineLayer();
      if (ol) layers.push(ol);
    }
    if (layersState.region) {
      const rg = buildChinaRegionLayer();
      if (rg) layers.push(rg);
    }
    if (layersState.river && rivers) {
      const l = buildRiverLineLayer();
      if (l) layers.push(l);
    }
    if (layersState.riverLabel && rivers) {
      const l = buildRiverLabelLayer();
      if (l) layers.push(l);
    }
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
    const l = buildRiverLineLayer();
    if (l) layers.push(l);
  }
  if (layersState.riverLabel && rivers) {
    const l = buildRiverLabelLayer();
    if (l) layers.push(l);
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
    // 悬停提示：仅对「历代政区界」生效，鼠标移到某块政区上就显示"名称（类型）"，
    // 让用户先知道这里可以点（此前无任何 hover 反馈，很容易误判为图层没生效）。
    deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
      getTooltip: ({ object, layer }) => {
        if (!object || layer?.id !== 'china-regions') return null;
        const p = object.properties;
        if (!p?.name) return null;
        const fy = (y) => (y < 0 ? `前${-y}` : `${y}`);
        return {
          text: `${p.name}${p.type ? `（${p.type}）` : ''}\n${p.dynastyName || ''} ${fy(p.beg)}–${fy(p.end)}`,
          style: {
            background: 'rgba(28,24,20,0.92)',
            color: '#f5efe6',
            fontSize: '12px',
            padding: '6px 9px',
            borderRadius: '4px',
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
          },
        };
      },
    });
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
    for (const e of d.events || []) items.push({ t: `${fmtYear(e.year)} ${e.title}`, d: e.desc, cat: e.cat });
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
  // 面板项随模式调整：「历代政区界」仅中国疆域模式有意义（世界模式隐藏该开关）
  if (panel && panel.setMode) panel.setMode(m);
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
          if (chinaInfoOpen && panel) panel.showChinaInfo(getDynastyAtYear(y), undefined, y);
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
            // 注意：必须走 territoriesAtYear（同一国家同年可能有多片年内切片，
            // 用 territories.find 随手取一片会拿到过期的旧疆域/旧属性）
            const t = territoriesAtYear(currentYear).find((t) =>
              props.gwcode != null
                ? t.feature.properties.gwcode === props.gwcode
                : t.feature.properties.cntry_name === props.cntry_name
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
    // 初始模式为世界地图：隐藏只对中国疆域生效的「历代政区界」开关
    if (panel && panel.setMode) panel.setMode(mode);
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
