// 中国近代史数据层 —— 统一出口
// =============================================================================
// 消费方只从这里 import，不要直接摸子文件（便于将来整体替换数据源）。
//
// 典型用法：
//   import { eventsAtYear, factionsAtYear, modernWarsAtYear, stageAtYear } from '@/modes/chinaModern/data';
// =============================================================================

import { LATE_QING } from './events/late-qing.js';
import { WARLORD } from './events/warlord.js';
import { REDARMY } from './events/redarmy.js';
import { ANTI_JAPANESE } from './events/anti-japanese.js';
import { CIVIL_WAR } from './events/civil-war.js';
import { PLACES } from './places.js';
import { FACTIONS } from './factions.js';
import { MODERN_WARS } from './wars.js';
import { TREATIES, PORTS, CONCESSIONS } from './treaties.js';
import { RAILWAYS } from './railways.js';
import { UNITS } from './redarmy.js';
import { STAGES, TOPICS } from './narrative.js';
import { catOf } from './eventCats.js';

export { PLACES } from './places.js';
export { FACTIONS, factionsAtYear, segsAtYear } from './factions.js';
export { MODERN_WARS, modernWarById, modernWarsAtYear, modernWarGroups } from './wars.js';
export { TREATIES, PORTS, CONCESSIONS, SPHERES } from './treaties.js';
export { RAILWAYS, railwaysAtYear } from './railways.js';
export { UNITS, EVOLUTION, LONG_MARCH, PENDING } from './redarmy.js';
export { STAGES, TOPICS } from './narrative.js';
export { EVENT_CATS, catOf } from './eventCats.js';

export const EVENT_GROUPS = ['晚清', '军阀', '红军', '抗战', '解放'];

// ── 时间编码 ────────────────────────────────────────────────────────────
// 全库统一 `年.月`（月份两位十进制）：1937.07 = 1937 年 7 月，1949.10 = 1949 年 10 月。
// **不要**用"小数年"（0.5 = 年中）——两者混用会导致 1937.10 被当成 1 月，排序全错。
// 需要数值比较时一律走 tkey()，不要直接比大小（1937.1 与 1937.10 数值相等）。
export function tkey(t) {
  const y = Math.floor(t + 1e-9);
  const m = Math.round((t - y) * 100);
  return y * 100 + m;
}

/** 1937.07 → "1937 年 7 月"；月份为 0 时只写年。 */
export function timeLabel(t) {
  const y = Math.floor(t + 1e-9);
  const m = Math.round((t - y) * 100);
  return m ? `${y} 年 ${m} 月` : `${y} 年`;
}

export const EVENTS = [...LATE_QING, ...WARLORD, ...REDARMY, ...ANTI_JAPANESE, ...CIVIL_WAR]
  .slice()
  .sort((a, b) => a.start - b.start);

// 分类随数据一起挂上（`cat` = 政/外/战/经/文/科）。放在这里而不是写进每条事件，
// 是为了让 5 个事件文件的格式保持一致，分类口径也只有一处可改。
// 就地赋值而非 map 出新对象：调用方（图钉、年表）拿到的仍是同一批引用。
for (const e of EVENTS) if (!e.cat) e.cat = catOf(e);

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

export function eventById(id) {
  return BY_ID.get(id) || null;
}

/** 该年正在发生或在当年发生的事件（含跨年事件）。 */
export function eventsAtYear(year) {
  const y = Number(year);
  // 只收**发生在本年**的事件：年份读数点开的是"这一年之内的事"，
  // 按区间重叠判断会把 1899 年起的义和团运动塞进 1901 年的清单，
  // 与"1901 年"这个标题自相矛盾。跨年事件归入其起始年，后续年份由
  // 地图图钉（按年内重叠）继续显示其"仍在进行"。
  return EVENTS.filter((e) => Math.floor(e.start) === y);
}

/** 本年内**仍在进行**的事件：去年或更早开始，到本年尚未结束。
 *  与 eventsAtYear 互补——后者只认"本年发生"，跨年事件若只靠它，
 *  鸦片战争在 1841、1842 两年就凭空消失了。两者有意分开列。 */
export function ongoingEventsAtYear(year) {
  const y = Number(year);
  return EVENTS.filter((e) => Math.floor(e.start) < y && Math.floor(e.end) >= y);
}

/** 按分组取事件，用于年表侧栏。 */
export function eventsByGroup() {
  return EVENT_GROUPS.map((g) => ({ group: g, events: EVENTS.filter((e) => e.group === g) }));
}

/** 事件坐标：优先 loc，其次查 placeId，再退回地图中心。 */
export function eventCoord(e) {
  if (e.loc) return e.loc;
  const p = PLACES[e.placeId];
  return p ? [p.lng, p.lat] : [104.0, 34.0];
}

/** 阶段综述：返回该年份所属的阶段（用阶段起点判断，落在最后阶段之后则取最后一篇）。 */
export function stageAtYear(year) {
  const y = Number(year);
  let cur = null;
  for (const s of STAGES) {
    if (y >= s.period[0]) cur = s;
  }
  return cur || STAGES[0];
}

/** 地名在指定年份的称呼（处理京师/北平、奉天/沈阳、江宁/南京等）。 */
export function placeNameAt(placeId, year) {
  const p = PLACES[placeId];
  if (!p) return placeId;
  if (!p.alias) return p.name;
  const keys = Object.keys(p.alias).map(Number).sort((a, b) => a - b);
  let name = p.name;
  for (const k of keys) {
    if (year >= k) name = p.alias[k];
  }
  return name;
}

/** 数据体检：给地图页一个"数据是否齐"的快速摘要。 */
export function dataSummary() {
  const years = EVENTS.map((e) => e.start);
  return {
    events: EVENTS.length,
    span: [Math.min(...years), Math.max(...EVENTS.map((e) => e.end))],
    factions: FACTIONS.length,
    wars: MODERN_WARS.length,
    ports: PORTS.length,
    concessions: CONCESSIONS.length,
    treaties: TREATIES.length,
    railways: RAILWAYS.length,
    units: UNITS.length,
    stages: STAGES.length,
    topics: TOPICS.length,
  };
}
