// 统一「政权 + 疆域」数据模型（第二幅图「中国疆域」与第三幅图「中国历史」共用）
// =============================================================================
//
// ## 为什么是"运行时规范化"而不是"生成一个数据文件"
// 几何与归属只写在 `src/data/china.js` 的 DYNASTIES 里（第二幅图的构建管线也读它）。
// 本模块把它规范化成统一的 polity 结构，**不产出第二份数据文件**，因此不存在
// "两份数据各自漂移"的问题——这是上一版最担心、也最容易踩的坑。
//
// ## polity 结构
//   {
//     id           唯一 id（朝代级用 dynasty id；并立政权用 "朝代id:政权名"）
//     name         中文名
//     type         'central' 中央王朝 | 'parallel' 并立政权
//     color        [r,g,b] 显式配色（不再靠"按索引猜色"）
//     era          所属朝代 id（用于分组/语境）
//     eraName      所属朝代中文名
//     start / end  整体存续（= 所有 seg 的并集区间）
//     desc         简介（并立政权取自己的 desc，中央王朝取朝代 desc）
//     events       重大事件（只有中央王朝/统一王朝带；并立政权不继承，避免张冠李戴）
//     capital / capitalCoord
//     modern       true = 近代（民国/PRC），第三幅图不做近代史，由消费方按年份上限过滤
//     segs         时间切片数组 —— **这是"扩张/更迭动态"的数据基础**
//   }
//
// ## seg（时间切片）
//   { start, end, provinces, patches, rawKey, capital, capitalCoord, note }
//   · provinces  中文关键词数组（与 china.js 一致，如 '陕西'）；运行时经
//                resolveAdcodes() 解析成 adcode。保留关键词而非 precomputed adcode，
//                是为了维持"单一数据源、零漂移"。
//   · patches    手绘环数组 [[[lng,lat],...], ...]，超出现代国境的疆土
//                （渲染时 Chaikin 磨圆）
//   · patchKeys  具名补丁（'mongolia'）：由 territoryGen 用国界轮廓现场拼出，
//                与省界共享顶点，dissolve 后不产生内部接缝
//   · rawKey     外部真实几何键（夏 'Xia' / 西周 'Zhoa'），取自 china_preqin.geojson。
//   · 三者可叠加：provinces 为主体，patches/rawKey 作为补充。
//
// ## 与第二幅图的关系
// 第二幅图（build-time 生成 china_dynasties.geojson）暂不改动，仍读 china.js；
// 本模块让第三幅图直接吃到同一份数据（22 朝代 / 63 政权条目），
// 无需手工重录，也不会出现两套数据不一致。
// =============================================================================

import { DYNASTIES } from '../china.js';

// 配色：中央王朝统一砖红；并立政权按序取调色板。
// 调色板与第二幅图 STATE_PALETTE 完全一致，并立政权从索引 1 起取
// （索引 0 的砖红留给中央王朝；分裂期无中央王朝时也跳过，避免把并立政权涂成"正统"色）。
const CENTRAL_COLOR = [178, 84, 58];
const PARALLEL_PALETTE = [
  [178, 84, 58], [92, 108, 148], [126, 132, 76], [150, 96, 132],
  [78, 130, 128], [166, 122, 62], [112, 96, 150], [148, 88, 84],
];

// 外蒙古（今蒙古国）大致范围：china.js 里 '蒙古' 这一项不在 DataV 省界数据内，
// 第二幅图用 CShapes 蒙古国几何补上；第三幅图改用 patchKey:'mongolia' ——
// 由 territoryGen 用**中国国界轮廓的北段**（与省界共享顶点）+ 一条北向弧线现场拼出，
// 这样补丁与省界严丝合缝，dissolve 时公共边成对消掉，不会在疆域内部画出一个大圆圈。
const EXTRA_PATCH_KEYS = {
  'tang:唐': { segIndexes: [0], keys: ['mongolia'] },
  yuan: { segIndexes: [0], keys: ['mongolia'] },
  // 清还要外东北（1858/1860 前，含库页岛）与巴尔喀什湖以东（1864 前）。
  // 第三幅图每个朝代只画一个"极盛"切片，所以按极盛疆域补全；
  // 近代史那幅图有 1860/1864 两条时间切片，会按时失地（见 chinaModern/data/factions.js）。
  qing: { segIndexes: [0], keys: ['mongolia', 'outer-manchuria', 'balkhash'] },
};

// 判断某个并立政权是否应算作"中央王朝"（决定配色与是否画进历史疆域底图）。
// 依据：政权名与朝代名互相包含（唐/唐、北宋/北宋、五代十国/五代（中原））；
// 三国、南北朝、战国、春秋这类"名不对应"的一律算并立。
function isCentralName(stateName, dynastyName) {
  const base = String(stateName).split('（')[0];
  return stateName === dynastyName
    || base === dynastyName
    || dynastyName.startsWith(base)
    || stateName.startsWith(dynastyName);
}

function buildPolities() {
  const list = [];

  for (const d of DYNASTIES) {
    const modern = d.start >= 1900; // 民国 / PRC
    const base = {
      era: d.id,
      eraName: d.name,
      modern,
    };

    // —— 有并立政权：同名政权合并成一个 polity，多个时间点成为多个 seg ——
    if (d.states && d.states.length) {
      const byName = new Map();
      for (const st of d.states) {
        if (!byName.has(st.name)) byName.set(st.name, []);
        byName.get(st.name).push(st);
      }
      const names = [...byName.keys()];
      const centralNames = new Set(names.filter((n) => isCentralName(n, d.name)));
      let parallelIdx = 0; // 并立政权取色序号（从调色板索引 1 起）

      for (const name of names) {
        const srcs = byName.get(name)
          .slice()
          .sort((a, b) => (a.start ?? d.start) - (b.start ?? d.start));
        const isCentral = centralNames.has(name);
        const color = isCentral
          ? CENTRAL_COLOR
          : PARALLEL_PALETTE[(++parallelIdx) % PARALLEL_PALETTE.length];

        const segs = srcs.map((st) => ({
          start: st.start ?? d.start,
          end: st.end ?? d.end,
          provinces: st.provinces || [],
          patches: Array.isArray(st.bounds) ? st.bounds : [],
          patchKeys: [],
          rawKey: null,
          capital: st.capital,
          capitalCoord: st.capitalCoord,
          note: st.note,
        }));

        const p = {
          ...base,
          id: `${d.id}:${name}`,
          name,
          type: isCentral ? 'central' : 'parallel',
          color,
          start: Math.min(...segs.map((s) => s.start)),
          end: Math.max(...segs.map((s) => s.end)),
          desc: srcs[0].desc || '',
          // 事件只给中央王朝：并立政权继承朝代事件会张冠李戴（如把安史之乱挂到吐蕃头上）
          events: isCentral ? (d.events || []) : [],
          capital: srcs[0].capital,
          capitalCoord: srcs[0].capitalCoord,
          segs,
        };
        applyExtraPatches(p);
        list.push(p);
      }
      continue;
    }

    // —— 统一王朝：单个 polity，单 seg ——
    const segs = [{
      start: d.start,
      end: d.end,
      provinces: d.provinces || [],
      patches: Array.isArray(d.bounds) ? d.bounds : [],
      patchKeys: [],
      rawKey: d.hbName || null,
      capital: d.capital,
      capitalCoord: d.capitalCoord,
      note: null,
    }];
    const p = {
      ...base,
      id: d.id,
      name: d.name,
      type: 'central',
      color: CENTRAL_COLOR,
      start: d.start,
      end: d.end,
      desc: d.desc || '',
      events: d.events || [],
      capital: d.capital,
      capitalCoord: d.capitalCoord,
      segs,
    };
    applyExtraPatches(p);
    list.push(p);
  }

  return list;
}

function applyExtraPatches(p) {
  const extra = EXTRA_PATCH_KEYS[p.id];
  if (!extra) return;
  for (const i of extra.segIndexes) {
    const seg = p.segs[i];
    if (!seg) continue;
    seg.patchKeys = [...(seg.patchKeys || []), ...extra.keys];
  }
}

export const POLITIES = buildPolities();

const _byId = new Map(POLITIES.map((p) => [p.id, p]));

export function polityById(id) {
  return _byId.get(id) || null;
}

// 当前年份所属"朝代骨架"（只含 id/名称/起止，不含几何）。
// 语义与第二幅图 getDynastyAtYear 完全一致：**取最后一个命中的**，
// 使朝代交界年归新朝（220 年显示三国而非东汉、960 年显示北宋而非五代）。
//
// 为什么必须按朝代过滤：同一个政权会出现在多个朝代的 states 里
// （金同时挂在北宋/南宋、西夏同、吐蕃诸部同）。不按朝代收敛，
// 1200 年会同时冒出两个"金"、两个"西夏"。
function currentEra(year) {
  let found = null;
  for (const d of DYNASTIES) {
    if (year >= d.start && year <= d.end) found = d;
  }
  return found;
}

// 某年份生效的 polity 列表。每个返回项在 polity 基础上多一个 `seg` 字段，
// 表示该年应使用的时间切片。
//
// ⚠️ 同一政权可能有**多个重叠切片**（如蒙古 1206/1219/1228/1235/1255 五段扩张，
//    后一段包含前一段的省份）。此时取 **start 最大** 的那一段 = 该年的最终疆域状态，
//    否则会画出五块叠色。
export function politiesAtYear(year, opts = {}) {
  const { includeModern = false } = opts;
  const era = currentEra(year);
  if (!era) return [];
  const out = [];
  for (const p of POLITIES) {
    if (p.modern && !includeModern) continue;
    if (p.era !== era.id) continue; // 只取当前朝代骨架下的政权
    if (year < p.start || year > p.end) continue;
    let best = null;
    for (const s of p.segs) {
      if (year < s.start || year > s.end) continue;
      if (!best || s.start > best.start) best = s;
    }
    if (!best) continue;
    out.push({ ...p, seg: best });
  }
  return out;
}

// 当前年份所属朝代（供第三幅图的时间轴读数/信息卡语境使用）
export function eraAtYear(year) {
  return currentEra(year);
}

// 中文关键词 → adcode 列表。
// 语义与第二幅图的构建脚本 gen-china.mjs 保持一致（name.includes(kw)），
// 因此两幅图对同一批关键词的解析结果相同。
// '蒙古'（外蒙古）不在 DataV 中国省界数据内，由 patches 补丁表达，这里直接跳过。
export function resolveAdcodes(keywords, provinceFeatures) {
  const out = [];
  if (!keywords || !provinceFeatures) return out;
  for (const kw of keywords) {
    if (kw === '蒙古') continue;
    for (const f of provinceFeatures) {
      const name = f.properties?.name || '';
      if (!name.includes(kw)) continue;
      const code = String(f.properties?.adcode ?? '');
      if (code && !out.includes(code)) out.push(code);
    }
  }
  return out;
}

// 外部真实几何键 → GeoJSON geometry（夏 'Xia' / 西周 'Zhoa'，来自 china_preqin.geojson）
export function resolveRawGeometry(rawKey, preqinFeatures) {
  if (!rawKey || !preqinFeatures) return null;
  const f = preqinFeatures.find(
    (x) => x.properties?.name_en === rawKey || x.properties?.name === rawKey
  );
  return f ? f.geometry : null;
}
