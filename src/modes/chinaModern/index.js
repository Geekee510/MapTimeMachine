// 第四幅地图「中国近代史」核心模块（1840–1950）
// =============================================================================
// 与第三幅图（中国古代史）的关系：
//   · 控制区的数据模型**完全复用** polity / seg（provinces 关键词 → 省界并集 → dissolve），
//     所以几何生成直接调用 chinaHist/territoryGen，不复制一份代码；
//   · 但渲染语义不同：古代是"王朝此消彼长"，近代是"主权框架内多层并存"——
//     1937 年的江苏同时存在国民政府（名义）、日军（点线）、汪伪（政权）、新四军（游击）。
//     因此近代必须**分层叠色**，靠绘制顺序 + 透明度表达"名义 / 实际 / 游击"，
//     合并成一块色会把近代史最重要的结构抹掉。
//   · 另有三类古代没有的要素：势力范围、租界与通商口岸、铁路网。
//
// 数据一律来自 ./data（唯一出口），本文件只做"数据 → deck.gl 图层"的转换。
// =============================================================================
import { GeoJsonLayer, ScatterplotLayer, TextLayer, PathLayer, LineLayer } from '@deck.gl/layers';
import { buildPolityGeometries } from '../chinaHist/territoryGen.js';
import { chaikinLine } from '../../lib/geo.js';
import { resolveAdcodes } from '../../data/polities/index.js';
import { FACTIONS, factionsAtYear } from './data/factions.js';
import { PLACES } from './data/places.js';
import {
  EVENTS,
  eventsAtYear,
  ongoingEventsAtYear,
  eventCoord,
  stageAtYear,
  PORTS,
  CONCESSIONS,
  SPHERES,
  railwaysAtYear,
  timeLabel,
  tkey,
} from './data/index.js';

export const CHINA_MODERN_MIN = 1840;
// 1950 是终点而不是 1949：大陆统一走完了 1950 整整一年（云南 2 月、西昌 3 月、
// 海南岛 5 月 1 日、昌都 10 月）。停在 1949 会读成"西南、海南一直没回来"，
// 而国民政府也还据着海南——那一年的年末快照本来就把这些讲清楚了。
export const CHINA_MODERN_MAX = 1950;

// 几何缓存命名空间：近代实体里也有 `qing`，与古代史同名但切片不同，
// 两者共用缓存会把对方算好的几何直接拿走（见 territoryGen 的说明）。
const NS = 'modern';

// ── 绘制顺序与透明度 ────────────────────────────────────────────────────────
// 顺序按"谁压在谁身上"排：中央政权在最下（底色），军阀 / 租借地 / 伪政权 / 日军
// 依次叠上，中共根据地与解放区最上（它们往往是"嵌在别人地盘里"的块）。
// 透明度按"控制性质"给：名义政权最淡、实际占领最深、游击区居中。
const LAYERED_IDS = {
  leased: ['uk:hk', 'pt:macau', 'jp:tw', 'ru:kwantung', 'de:jiaozhou', 'uk:weihai', 'fr:guangzhouwan'],
  puppet: ['manchukuo', 'mengjiang', 'wangwei'],
  base: null, // 以 base: / soviet 判定
};

function rankOf(f) {
  const id = f.id;
  if (f.type === 'central') return 10;
  if (LAYERED_IDS.leased.includes(id)) return 30;
  if (LAYERED_IDS.puppet.includes(id)) return 40;
  if (id === 'japan:occupied') return 50;
  if (id === 'soviet' || id.startsWith('base:')) return 60;
  return 20; // 太平天国 / 捻军 / 各系军阀
}

const FILL_ALPHA = {
  // 透明度比古代史高（那边是 105）：近代的控制区颜色本身偏灰（清是土黄、民国是蓝灰），
  // 再压低就只剩一片灰雾，实测 92 时"清 vs 民国 vs 军阀"几乎分不出来。
  central: 138,
  warlord: 110,
  leased: 180,
  puppet: 100,
  occupied: 85, // 点线占领：只刷一层薄色，不然整省涂黑会盖掉底下所有层
  // 根据地/解放区 70：数据只能到"省"这一级，若按 132 上色，1940 年华北华东会连成
  // 一大片红，看起来像"中共已控制半个中国"，与史实（乡村游击、城镇仍是日伪）差得远。
  // 压到 70 后读作"这一带有根据地活动"，具体范围靠点击卡片里的说明补。
  base: 70,
};

function fillAlphaOf(f) {
  const r = rankOf(f);
  if (r === 10) return FILL_ALPHA.central;
  if (r === 30) return FILL_ALPHA.leased;
  if (r === 40) return FILL_ALPHA.puppet;
  if (r === 50) return FILL_ALPHA.occupied;
  if (r === 60) return FILL_ALPHA.base;
  return FILL_ALPHA.warlord;
}

function shade(c, k = 0.62) {
  return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
}

// 标签专用简称：只影响地图上的文字，卡片仍用全名。
const LABEL_SHORT = {
  wangwei: '汪伪政府',
  mengjiang: '蒙疆',
  manchukuo: '满洲国',
  japan: '日军占领',
  'japan:occupied': '日军占领',
};

// 政权驻地坐标：factions 里存的是 capitalId（地名表键），几何生成器要的是坐标。
function capitalCoordOf(f) {
  const p = PLACES[f.capitalId];
  if (p) return [p.lng, p.lat];
  return null;
}

// 租借地这类实体没有 capitalId（旅大、胶澳、威海卫、广州湾……），
// 若不补一个锚点，territoryGen 的标签点会退回到 [104,36] ——
// 结果六个租借地的名字全叠在四川中部同一个点上，糊成一团（实测如此）。
// 这里用它们手绘补丁的顶点均值作为锚点，标签就落在自己那块地上。
function patchCentroid(seg) {
  const rings = seg.patches || [];
  let sx = 0, sy = 0, n = 0;
  for (const ring of rings) {
    for (const pt of ring) { sx += pt[0]; sy += pt[1]; n++; }
  }
  return n ? [sx / n, sy / n] : null;
}

// 给几何生成器补上 capitalCoord（它靠这个把标签放在驻地所在省的最内缩点）。
// 优先级：切片自己的 capitalId > 实体 capitalId > 手绘补丁质心。
// 切片级 capitalId 是必须的：国民政府抗战期间迁都重庆，若仍用实体上的南京，
// 南京又不在它当年的辖区内，标签点会退化成"最大省份"（新疆），跑到地图边角上。
function segWithCapital(f, seg) {
  if (seg.capitalCoord) return seg;
  const p = seg.capitalId ? PLACES[seg.capitalId] : null;
  const cap = (p ? [p.lng, p.lat] : null) || capitalCoordOf(f) || patchCentroid(seg);
  return cap ? { ...seg, capitalCoord: cap } : seg;
}

// ── 控制区 ──────────────────────────────────────────────────────────────────

// 几何的经度跨度（度）。用来判断"这块地有多宽"，进而压字号。
// 台湾只有 1.4 度宽，若仍按中央政权的 25px 写"国民政府"，四个字会横跨整个海峡、
// 压到福建沿海上去（实测如此）。所以标签字号必须同时看 rank 和实际跨度。
function geoSpan(geo) {
  let lo = 180, hi = -180;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      if (c[0] < lo) lo = c[0];
      if (c[0] > hi) hi = c[0];
      return;
    }
    for (const x of c) walk(x);
  };
  for (const f of geo.features) if (f.geometry) walk(f.geometry.coordinates);
  return hi > lo ? hi - lo : 0;
}

export function buildModernTerritoryLayers(opts = {}) {
  const { year, chinaProvinces, labelChars, labelFontSettings, labelFontFamily, onPick } = opts;
  if (!chinaProvinces) return [];
  const ctx = { provinceFeatures: chinaProvinces, ns: NS };
  const acts = factionsAtYear(year)
    .map((f) => ({ f, r: rankOf(f) }))
    .sort((a, b) => a.r - b.r || b.f.start - a.f.start);

  const fills = [];
  const outlines = [];
  const labels = [];

  for (const { f } of acts) {
    const alpha = fillAlphaOf(f);
    for (const seg of f.activeSegs) {
      const geo = buildPolityGeometries(f, segWithCapital(f, seg), ctx);
      if (!geo || !geo.features.length) continue;
      // 填充用 dissolve 出来的**并集轮廓**，不用逐省 polygon。
      // 原因：DataV 省界在相邻省份之间存在重叠带，逐省填充会在省界上叠出
      // 一块更深的色斑（1840 年外兴安岭那个"三角"就是黑蒙边界重叠造成的，
      // 调透明度也消不掉——两块半透明同色叠在一起必然更深）。
      // 并集轮廓是按边计数溶解出来的，环必闭合且互不重叠，顺带把填充要素
      // 从数百个省 polygon 降到几个环，每帧重建便宜很多。
      for (const g of geo.outline || []) {
        fills.push({
          type: 'Feature',
          properties: { factionId: f.id, color: f.color, alpha, note: seg.note || '' },
          geometry: g.geometry,
        });
        outlines.push({
          type: 'Feature',
          properties: { factionId: f.id, color: f.color, rank: rankOf(f) },
          geometry: g.geometry,
        });
      }
      // 一个实体可能有多个切片同时生效（如苏区的三块），标签只取面积最大的一块
      if (geo.labelPoint) {
        const prev = labels.find((x) => x.id === f.id);
        if (!prev) {
          labels.push({
            id: f.id,
            coordinates: geo.labelPoint,
            text: f.name,
            rank: rankOf(f),
            width: geoSpan(geo),
          });
        }
      }
    }
  }

  const layers = [];
  if (fills.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'modern-territory',
        data: { type: 'FeatureCollection', features: fills },
        stroked: false, // 内部省界不描边，否则一片色块会被切成棋盘
        filled: true,
        getFillColor: (d) => {
          const c = d.properties.color;
          return [c[0], c[1], c[2], d.properties.alpha];
        },
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
        onClick: (info) => {
          if (info.object && onPick) onPick(info.object.properties.factionId);
        },
      })
    );
  }
  if (outlines.length) {
    layers.push(
      new GeoJsonLayer({
        id: 'modern-territory-outline',
        data: { type: 'FeatureCollection', features: outlines },
        stroked: true,
        filled: false,
        getLineColor: (d) => {
          const c = shade(d.properties.color, 0.58);
          // 底层（中央政权）轮廓稍淡，让上层的界线更突出
          return [c[0], c[1], c[2], d.properties.rank <= 10 ? 170 : 215];
        },
        getLineWidth: 2,
        lineWidthMinPixels: 1.3,
        pickable: false,
      })
    );
  }
  // 政权名：只给"看得见"的层做标签（占领区太淡，标签反而误导成实控；
  // 租借地只有一两个县大小，名字比地还长，靠点击看卡片即可）
  const labelData = labels
    .filter((x) => x.rank !== 30 && x.rank !== 50)
    // 傀儡政权的全名太长（"伪蒙疆联合自治政府"），在华北这一小块地上会把
    // 根据地名挤走；标签用简称，全名留给卡片。
    .map((x) => ({ ...x, text: LABEL_SHORT[x.id] || x.text }));
  if (labelData.length) {
    layers.push(
      new TextLayer({
        id: 'modern-territory-label',
        data: labelData,
        getPosition: (d) => d.coordinates,
        getText: (d) => d.text,
        // 分级字号：中央 25 > 地方实力派 18 > 傀儡 15 > 根据地 14。
        // 近代同一块地上常有 4~5 个名字，字号不分级会糊成一片。
        // 再加一道跨度封顶：地名长度不该超过那块地的宽度（台湾、陕甘宁、各租借地都会踩到）。
        getSize: (d) => {
          const base = d.rank <= 10 ? 25 : d.rank === 20 ? 18 : d.rank === 40 ? 15 : 14;
          const w = d.width || 0;
          const cap = w < 2 ? 13 : w < 4 ? 15 : w < 7 ? 18 : base;
          return Math.min(base, cap);
        },
        getColor: (d) =>
          d.rank >= 60 ? [190, 52, 40, 255] : d.rank <= 10 ? [255, 252, 244, 255] : [255, 246, 230, 250],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [46, 30, 20, 235],
        strokeWidth: 3.2,
      })
    );
  }
  return layers;
}

// ── 势力范围（1898–1905 的"瓜分"图景）───────────────────────────────────────
// 只是"不割让照会 / 铁路与矿权"的示意范围，**不是领土**：透明度压到 34，
// 且只在 1898 年之后、相关年份区间内出现，避免和真正的控制区混淆。
export function buildModernSphereLayers(opts = {}) {
  const { year, chinaProvinces, onPick } = opts;
  if (!chinaProvinces) return [];
  const feats = [];
  for (const s of SPHERES) {
    if (year < s.from || year > s.to) continue;
    const adcodes = resolveAdcodes(s.provinces, chinaProvinces);
    for (const code of adcodes) {
      const f = chinaProvinces.find((x) => String(x.properties?.adcode) === String(code));
      if (!f?.geometry) continue;
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const poly of polys) {
        feats.push({
          type: 'Feature',
          properties: { country: s.country, color: s.color },
          geometry: { type: 'Polygon', coordinates: poly },
        });
      }
    }
  }
  if (!feats.length) return [];
  return [
    new GeoJsonLayer({
      id: 'modern-sphere',
      data: { type: 'FeatureCollection', features: feats },
      stroked: false,
      filled: true,
      getFillColor: (d) => {
        const c = d.properties.color;
        return [c[0], c[1], c[2], 46];
      },
      pickable: true,
      onClick: (info) => {
        if (!info.object || !onPick) return;
        const s = SPHERES.find((x) => x.country === info.object.properties.country);
        if (s) onPick(s);
      },
    }),
  ];
}

// ── 铁路网 ──────────────────────────────────────────────────────────────────
// 站点之间用**开放 Chaikin**磨圆：直接连折线会画出穿山越岭的硬直线，
// 而真实铁路是沿河谷、等高线绕行的。progress<1 时只画到"已修通"的那一段。
function smoothStations(stations) {
  return chaikinLine(stations.map((s) => [s[0], s[1]]), 3);
}

function slicePath(path, frac) {
  if (frac >= 1) return path;
  const total = path.length - 1;
  const cut = Math.max(1, Math.round(total * frac));
  return path.slice(0, cut + 1);
}

// ── 铁路符号 ────────────────────────────────────────────────────────────────
// 地图集里的铁路画法是"一条实线 + 沿线密排的短枕木"，远看就是 ╪╪╪。
// 枕木间距必须按**屏幕像素**换算成经纬度：若写死经纬度，缩小后枕木挤成一条实线、
// 放大后稀得看不出是铁路。纬度方向再按 1/cos(lat) 补偿，否则北方线段的枕木会明显偏短。
const RAIL_TIE_STEP_PX = 9;  // 相邻枕木的中心距
const RAIL_TIE_HALF_PX = 3.4; // 枕木半长（比主线宽，才能从两侧探出来）

function railTies(line, zoom) {
  // 枕木按像素定距，放得越大条数越多；z≥11 已是在看一座城，主线 + 衬边足够，
  // 再铺枕木只会让每帧多算上万段几何。
  if (zoom >= 11) return [];
  const dpp = 360 / (512 * Math.pow(2, zoom)); // 1 像素对应多少经度
  const step = RAIL_TIE_STEP_PX * dpp;
  const half = RAIL_TIE_HALF_PX * dpp;
  const out = [];
  let togo = 0; // 距下一根枕木还差多远；跨段带下去，避免每段起点都补一根
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const k = Math.max(0.2, Math.cos((((y1 + y2) / 2) * Math.PI) / 180));
    // 在"经度 × cos(纬度)"的局部平面上量长，取法线才垂直于屏幕上看到的那条线
    const dx = (x2 - x1) * k;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const ux = dx / len;
    const uy = dy / len;
    let s = togo;
    while (s < len) {
      const cx = x1 + (ux * s) / k;
      const cy = y1 + uy * s;
      const ox = (uy * half) / k; // 法线 = (-uy, ux)，换回经度要再除 cos
      const oy = ux * half;
      out.push({ a: [cx - ox, cy + oy], b: [cx + ox, cy - oy] });
      s += step;
    }
    togo = s - len;
  }
  return out;
}

export function buildModernRailwayLayers(opts = {}) {
  const { year, labelChars, labelFontSettings, labelFontFamily, zoom = 4, onPick } = opts;
  const rs = railwaysAtYear(year);
  if (!rs.length) return [];
  const data = rs.map((r) => {
    const line = smoothStations(r.stations);
    const visible = slicePath(line, r.progress);
    return { ...r, line, visible, ties: railTies(visible, zoom) };
  });
  const RAIL = [58, 38, 24, 240];
  const layers = [
    // 外衬：铁路要跨过灰、蓝、红各种底色，直接画深棕线在深色区里会"消失"，
    // 先垫一条浅色线把铁路从底色里剥出来（地图集里铁路也常带白色衬边）
    new PathLayer({
      id: 'modern-railway-casing',
      data,
      getPath: (d) => d.visible,
      getColor: [255, 250, 240, 190],
      getWidth: 4,
      widthUnits: 'pixels',
      capRounded: false,
      jointRounded: true,
      pickable: false,
    }),
    // 主线
    new PathLayer({
      id: 'modern-railway',
      data,
      getPath: (d) => d.visible,
      getColor: RAIL,
      getWidth: 2.2,
      widthUnits: 'pixels',
      capRounded: false,
      jointRounded: true,
      pickable: true,
      onClick: (info) => {
        if (info.object && onPick) onPick(info.object);
      },
    }),
    // 枕木：与主线同色，从主线两侧各探出 3px，合起来就是 ╪╪╪
    new LineLayer({
      id: 'modern-railway-tie',
      data: data.flatMap((d) => d.ties),
      getSourcePosition: (d) => d.a,
      getTargetPosition: (d) => d.b,
      getColor: RAIL,
      getWidth: 1.4,
      widthUnits: 'pixels',
      pickable: false,
    }),
  ];
  // 路名：只在放大到一定级别时出现，否则 17 条线的名字会互相压住
  if (zoom >= 4.2) {
    layers.push(
      new TextLayer({
        id: 'modern-railway-label',
        data: data.filter((d) => d.progress > 0.6),
        getPosition: (d) => d.stations[Math.floor(d.stations.length / 2)],
        getText: (d) => d.name,
        getSize: 13.5,
        getColor: [74, 48, 30, 250],
        getPixelOffset: [0, -15],
        fontFamily: labelFontFamily,
        fontWeight: 700,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [255, 250, 240, 235],
        strokeWidth: 3.5,
      })
    );
  }
  return layers;
}

// ── 通商口岸与租界 ──────────────────────────────────────────────────────────
const PORT_COLOR = {
  约开: [168, 64, 46], // 条约强开：砖红
  自开: [56, 96, 130], // 自行开放：靛蓝
  租借: [122, 82, 132], // 租借地：紫
};

export function buildModernPortLayers(opts = {}) {
  const { year, labelChars, labelFontSettings, labelFontFamily, zoom = 4, onPick } = opts;
  // p.to 为该类口岸的终止年（含该年）：约开/自开口岸 1949 年随新中国废除帝国主义
  // 在华特权而终结，台湾两口 1895 年随割让离开中国口岸体系，香港、澳门两块
  // 殖民地延续到回归为止——1949 年之后地图上只剩这两个"租借"口岸。
  const ports = PORTS.filter((p) => p.opened <= year && (!p.to || year <= p.to));
  if (!ports.length) return [];
  const layers = [
    new ScatterplotLayer({
      id: 'modern-port',
      data: ports,
      getPosition: (d) => [d.lng, d.lat],
      radiusUnits: 'pixels',
      getRadius: 4,
      radiusMinPixels: 3,
      getFillColor: (d) => [...(PORT_COLOR[d.type] || [120, 120, 120]), 235],
      stroked: true,
      getLineColor: [255, 250, 240, 230],
      lineWidthMinPixels: 1.2,
      pickable: true,
      onClick: (info) => {
        if (info.object && onPick) onPick(info.object);
      },
    }),
  ];
  if (zoom >= 4.4) {
    layers.push(
      new TextLayer({
        id: 'modern-port-label',
        data: ports,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => d.name,
        getSize: 12.5,
        getColor: [62, 40, 26, 250],
        getPixelOffset: [0, -12],
        fontFamily: labelFontFamily,
        fontWeight: 600,
        fontSettings: labelFontSettings,
        characterSet: labelChars,
        pickable: false,
        stroke: true,
        getStrokeColor: [255, 252, 245, 235],
        strokeWidth: 3.5,
      })
    );
  }
  return layers;
}

export function buildModernConcessionLayers(opts = {}) {
  const { year, labelChars, labelFontSettings, labelFontFamily, onPick } = opts;
  const list = CONCESSIONS.filter((c) => year >= c.from && year <= c.to);
  if (!list.length) return [];
  return [
    new ScatterplotLayer({
      id: 'modern-concession',
      data: list,
      getPosition: (d) => [d.lng, d.lat],
      radiusUnits: 'pixels',
      getRadius: 7,
      radiusMinPixels: 5,
      filled: false,
      stroked: true,
      getLineColor: [140, 60, 110, 245],
      lineWidthMinPixels: 2,
      pickable: true,
      onClick: (info) => {
        if (info.object && onPick) onPick(info.object);
      },
    }),
    new TextLayer({
      id: 'modern-concession-label',
      data: list,
      getPosition: (d) => [d.lng, d.lat],
      getText: (d) => d.name,
      getSize: 13,
      getColor: [104, 26, 84, 252],
      // 上海一城就有公共租界 + 法租界 + 英租界，标签全压在下方会糊成一团；
      // 按条目奇偶上下交替，最近的几个就能错开。
      getPixelOffset: (d, { index }) => [0, index % 2 ? 16 : -16],
      fontFamily: labelFontFamily,
      fontWeight: 700,
      fontSettings: labelFontSettings,
      characterSet: labelChars,
      pickable: false,
      stroke: true,
      getStrokeColor: [255, 250, 245, 240],
      strokeWidth: 3.5,
    }),
  ];
}

// ── 事件图钉（DOM Marker，见 ui/pinLayer.js）────────────────────────────────
export const EVENT_GROUP_COLOR = {
  晚清: '#a8763e',
  军阀: '#8a6a9a',
  红军: '#b23c34',
  抗战: '#5c423c',
  解放: '#c0442c',
};

export function modernEventPins(year) {
  const Y = Number(year);
  const yStart = Y * 100;      // 当年 1 月
  const yEnd = Y * 100 + 12;   // 当年 12 月
  const pool = [];
  for (const e of EVENTS) {
    // 只画"当年发生或当年仍在进行"的事件：跨年事件（如长征 1934.10–1936.10）
    // 在其存续的每一年都留一个点，单年事件只在当年出现。
    if (tkey(e.start) > yEnd || tkey(e.end) < yStart) continue;
    pool.push(e);
  }
  // 同一年的图钉常挤成一团（1937 年的上海一带一次能挤 6 个，1949 年的长三角、
  // 华南沿海同样密集），叠在一起既点不中也看不清。按网格去重：每格只留
  // weight 最高的一个。格子取 0.6 度（zoom 4 下约 55px），相邻城市不会被误合并，
  // 被舍掉的次要事件在「大事年表」里仍能查到，不丢信息。
  const CELL = 0.6;
  const best = new Map();
  for (const e of pool) {
    const c = eventCoord(e);
    const k = `${Math.round(c[0] / CELL)}:${Math.round(c[1] / CELL)}`;
    const cur = best.get(k);
    if (!cur || (e.weight || 1) > (cur.weight || 1)) best.set(k, e);
  }
  return [...best.values()]
    .sort((a, b) => a.start - b.start) // 稳定渲染顺序；同权时先到者留下，即时间更早的
    .map((e) => ({
      id: `ev-${e.id}`,
      kind: 'event',
      coord: eventCoord(e),
      // 每一个图钉都带标题。早先只给 weight ≥ 3 的事件标名，理由是"一年里常有
      // 七八条，全部带字会糊成一片"；但去重之后每年实际只剩 4~6 颗图钉
      // （最多 1935 年的 6 颗，且沿长征路线拉得很开），全留名字读得下。
      // 无名的钉子在这一层里毫无意义：点开才知道是什么事，等于逼人逐个点。
      label: e.name,
      // 避让优先级：撞字时先保住分量重的（同 weight 时按时间先后，早的优先）
      labelPriority: e.weight || 1,
      color: EVENT_GROUP_COLOR[e.group] || '#8a6a3e',
      payload: { eventId: e.id },
    }));
}

// ── 信息卡 / 年份事件 ───────────────────────────────────────────────────────
export function getFactionInfo(id, year, opts = {}) {
  const f = FACTIONS.find((x) => x.id === id);
  if (!f) return null;
  const active = factionsAtYear(year).find((x) => x.id === id);
  const segs = active ? active.activeSegs : [];
  let geo = null;
  if (opts.chinaProvinces) {
    const ctx = { provinceFeatures: opts.chinaProvinces, ns: NS };
    for (const s of segs) {
      const g = buildPolityGeometries(f, segWithCapital(f, s), ctx);
      if (g?.labelPoint) { geo = g; break; }
    }
  }
  return {
    id: f.id,
    name: f.name,
    type: rankOf(f) <= 10 ? 'central' : 'parallel',
    typeLabel:
      rankOf(f) <= 10 ? '中央政权' : rankOf(f) >= 60 ? '革命根据地 / 解放区' : rankOf(f) >= 40 ? '占领当局 / 傀儡政权' : '地方政权',
    start: f.start,
    end: f.end,
    desc: f.desc,
    segNotes: segs.map((s) => ({
      // s.end=2100 同为哨兵值：分段尾注显示"至今"而非 2100 年
      span: s.end >= 2100
        ? `${timeLabel(s.start)} – 至今`
        : `${timeLabel(s.start)} – ${timeLabel(s.end)}`,
      note: s.note || '',
    })),
    centroid: geo ? geo.labelPoint : capitalCoordOf(f),
  };
}

export function getModernYearEvents(year) {
  const st = stageAtYear(year);
  const items = eventsAtYear(year).map((e) => ({
    t: `${timeLabel(e.start)} ${e.name}`,
    d: e.summary,
    cat: e.cat,
  }));
  // 跨年而未结束的事件单列，不与"本年发生"混在一起：
  // 混在一起会把 1841 年读成"鸦片战争爆发于 1841"，其实它 1840 就打了。
  const ongoing = ongoingEventsAtYear(year).map((e) => ({
    t: e.name,
    d: e.summary,
    cat: e.cat,
    span: `${timeLabel(e.start)} – ${timeLabel(e.end)}`,
  }));
  const tail = ongoing.length ? ` · 另有 ${ongoing.length} 件进行中` : '';
  return {
    title: `📜 ${year} 年 · ${st.title}（当年 ${items.length} 件大事${tail}）`,
    items,
    ongoing,
  };
}

export { stageAtYear, eventsAtYear, ongoingEventsAtYear, eventCoord, EVENTS };
