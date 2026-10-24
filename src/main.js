import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css'; // 关键修复：此前样式从未被引入，导致 #map 高度为 0（地图不可见）、.hidden 失效（加载提示永不消失）
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { loadCShapes } from './data/loaders.js';
import { zhCountry, zh, RIVER_ZH, MOUNTAIN_ZH } from './data/i18n.js';
import { DYNASTIES, getDynastyAtYear } from './data/china.js';
import { getWorldEvents } from './data/worldEvents.js';
import { createTimeline } from './ui/timeline.js';
import { createPanel } from './ui/panel.js';

const YEAR_MIN = 1886;
const YEAR_MAX = 2023;
const CHINA_MIN = -2070;
const CHINA_MAX = 1912;
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
const layersState = { territory: true, river: true, mountain: true, lake: false, basemapLand: false };
let labelChinese = true; // 中文标签开关：true=中文（无译名回退英文），false=英文原名
let mode = 'world'; // 视图模式：'world' 世界地图 | 'china' 中国历代疆域
let chinaDynasties = null; // china_dynasties.geojson 的 features 数组
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
  return STATUS_COLOR[props.status] || [170, 170, 170, 245];
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
      const t = buildChinaTerritoryLayer();
      if (t) layers.push(t);
      layers.push(...buildChinaCapitalLayer());
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
  // 世界模式（原有逻辑）
  if (layersState.territory) {
    layers.push(buildTerritoryLayer());
    const lbl = buildTerritoryLabelLayer();
    if (lbl) layers.push(lbl);
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
  const info = document.getElementById('info');
  if (info) info.classList.add('hidden');
  const ie = document.getElementById('info-events');
  if (ie) { ie.classList.add('hidden'); ie.innerHTML = ''; }
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
          if (props && props.cntry_name) {
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
      onToggleLayer: (k, v) => {
        if (k === 'zh') {
          labelChinese = v;
        } else {
          layersState[k] = v;
          if (k === 'basemapLand') applyBasemapLand();
        }
        updateLayers();
        if (panel && panel.rerender) panel.rerender(); // 刷新打开中的信息卡（简介+事件随语言/图层同步）
      },
      onReset: () => map.flyTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM, duration: 800 }),
    });
    // 世界/中国模式切换
    document.getElementById('mode-world')?.addEventListener('click', () => setMode('world'));
    document.getElementById('mode-china')?.addEventListener('click', () => setMode('china'));
    loadChina().then(() => { if (mode === 'china') updateLayers(); }); // 后台加载中国疆域
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
