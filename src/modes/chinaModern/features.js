// 第四幅地图「中国近代史」的卡片与图钉数据
// -----------------------------------------------------------------------------
// 卡片统一走 panel.showPlace 的协议：{ name, kind, desc, lines: [[键, 值]], paras: [段] }
//   lines  → 表格化的关键字段（时间/地点/兵力…）
//   paras  → 长文段落（事件背景、过程、结果），专门给近代史用：
//            古代史一张卡三五句话够，近代一场战役、一次事变往往要交代前因后果，
//            塞进单个 desc 字段会变成一大坨难读的文本。
import { eventById, PLACES, PORTS, CONCESSIONS, RAILWAYS } from './data/index.js';
import { timeLabel } from './data/index.js';

// 政权 / 军阀 / 根据地信息卡。控制区分段要逐条列出：同一个实体在不同年份
// 控制的范围和"名义还是实际"都不一样，只写一句简介会把这段差别丢掉。
export function factionCard(info) {
  if (!info) return null;
  const segText = (info.segNotes || [])
    .map((s) => `${s.span}${s.note ? `：${s.note}` : ''}`)
    .join('；');
  // end=2100 是数据层的"延续至今"哨兵值（本图只画到 1950，不能让它就此消失），
  // 直接 Math.floor 会把 2100 当年份显示给用户，必须翻成"至今"。
  const open = info.end >= 2100;
  const span = open
    ? `${Math.floor(info.start)} – 至今`
    : `${Math.floor(info.start)} – ${Math.floor(info.end)} 年`;
  return {
    name: info.name,
    kind: info.typeLabel,
    lines: [
      ['存续', span],
      ['控制区分段', segText],
    ],
    paras: [info.desc],
  };
}

export function eventCard(e) {  if (!e) return null;
  const place = e.placeId ? PLACES[e.placeId] : null;
  const loc = e.loc || (place ? [place.lng, place.lat] : null);
  return {
    name: e.name,
    // 分类放最前，与年份浮层、年表里的徽标同序：先知道"这是打仗还是签约"，再看时代与月份
    kind: `${e.cat ? `${e.cat} · ` : ''}${e.group} · ${timeLabel(e.start)}`,
    lines: [
      ['时间', e.end && e.end !== e.start ? `${timeLabel(e.start)} – ${timeLabel(e.end)}` : timeLabel(e.start)],
      ['地点', place ? place.name : loc ? `${loc[0].toFixed(2)}, ${loc[1].toFixed(2)}` : ''],
      ['类别', (e.tags || []).join(' / ')],
    ],
    paras: e.article || [],
    desc: e.summary,
  };
}

export function portCard(p) {
  if (!p) return null;
  const lines = [
    ['开埠', `${p.opened} 年`],
    ['所在', p.prov || ''],
  ];
  if (p.to) lines.push([p.type === '租借' ? '租借期止' : '废止', `${p.to} 年`]);
  return {
    name: p.name,
    kind: `${p.type}口岸`,
    lines,
    paras: [
      p.type === '约开'
        ? '依不平等条约被迫开放，关税与司法受条约约束，是列强势力进入中国的入口。1943 年《中美新约》《中英新约》废除领事裁判权等主要条约特权，1949 年中华人民共和国成立后帝国主义在华特权被彻底废除，约开口岸制度自此终结。'
        : p.type === '自开'
        ? '清廷或民国自行宣布开放，意在"自开以保权"——用主动通商换取列强不强行索要。1949 年后各口岸并入新的对外贸易体系，"自开"作为一种应对条约体制的政策随之结束。'
        : '以租借形式被外国取得，行政权在租期内由租借国行使。',
    ],
  };
}

export function concessionCard(c) {
  if (!c) return null;
  return {
    name: c.name,
    kind: '租界',
    lines: [
      ['设于', `${c.from} 年`],
      ['收回', c.to >= 1997 ? `${c.to} 年` : `${c.to} 年`],
      ['所属', c.country],
    ],
    paras: [c.note || ''],
  };
}

export function railwayCard(r) {
  if (!r) return null;
  return {
    name: r.name,
    kind: `${r.gauge}`,
    lines: [
      ['起讫', `${r.from} – ${r.to}`],
      ['修筑', `${r.years[0]} – ${r.years[1]} 年`],
      ['别称', r.alias || ''],
    ],
    paras: [r.note || ''],
  };
}

export function sphereCard(s) {
  if (!s) return null;
  return {
    name: `${s.country}势力范围`,
    kind: '势力范围',
    lines: [
      ['时间', `${s.from} – ${s.to} 年`],
      ['范围', (s.provinces || []).join('、') || '（未成事实）'],
    ],
    paras: [s.note || ''],
  };
}

// 近代战争的背景卡（不能复用古代那版：古代用整数年，近代是"年.月"，
// 直接套 fy() 会把 1937.07 显示成 1937.1，月份读不出来）。
export function modernWarCard(w) {
  if (!w) return null;
  const m = w.meta || {};
  const parties = (w.parties || [])
    .map((p) => `${p.name}${p.troops ? `（${p.troops}）` : ''}`)
    .join('　vs　');
  const battles = (w.battles || []).map((b) => b.name).join('；');
  return {
    name: m.title,
    kind: `${m.group || '战争'} · ${m.era || ''}`,
    lines: [
      ['时间', `${timeLabel(m.start)}${m.end && m.end !== m.start ? ` – ${timeLabel(m.end)}` : ''}`],
      ['战场', m.place],
      ['参战方', parties],
      ['结果', m.result],
      ['关键战斗', battles],
    ],
    paras: [m.desc || ''],
  };
}

export { eventById, PORTS, CONCESSIONS, RAILWAYS };
