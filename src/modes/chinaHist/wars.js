// 战争数据集（独立模块，含"军队演进"动态演示所需 schema）
// ---------------------------------------------------------------------------
// 这套 schema 同时用于**内置战争**与未来的**用户导入战争**（编辑器导出同构 JSON）：
//   meta      { title, era, start, end }      战争元信息，start/end 为年（可小数表月/季）
//   parties   [{ id, name, color }]           参战方（color 用 #rrggbb）
//   forces    [{ party, route:[[lng,lat]...],  t0, t1, events:[{at,loc,label}] }]
//             route 为军队行进轨迹；t0/t1 为出发/抵达年，TripsLayer 按时间推进显示
//   battles   [{ name, at, loc:[lng,lat], winner, desc }]
// ---------------------------------------------------------------------------
// 坐标为示意位置（现代经纬度），用于演示"军队沿路线推进、会战爆发"的动态过程。

export const WARS = [
  {
    id: 'julu', meta: { title: '巨鹿之战', era: '秦末', start: -207.8, end: -207.5 },
    parties: [
      { id: 'qin', name: '秦军（章邯/王离）', color: '#8a5a3a' },
      { id: 'chu', name: '项羽楚军', color: '#1d7a6b' },
    ],
    forces: [
      { party: 'qin', t0: -207.8, t1: -207.6, route: [[108.70, 34.33], [110.92, 34.63], [114.49, 36.60], [115.00, 37.20]] },
      { party: 'chu', t0: -207.70, t1: -207.55, route: [[114.35, 36.10], [115.00, 37.20]] },
    ],
    battles: [{ name: '巨鹿之战', at: -207.58, loc: [115.00, 37.20], winner: 'chu', desc: '项羽破釜沉舟，以少胜多击溃秦军主力，秦亡之势遂成。' }],
  },
  {
    id: 'guandu', meta: { title: '官渡之战', era: '东汉末年', start: 200.0, end: 200.6 },
    parties: [
      { id: 'yuan', name: '袁绍军', color: '#7a5aa0' },
      { id: 'cao', name: '曹操军', color: '#b2543a' },
    ],
    forces: [
      { party: 'yuan', t0: 200.0, t1: 200.42, route: [[114.40, 36.31], [114.55, 35.66], [114.20, 35.15], [114.00, 34.60]] },
      { party: 'cao', t0: 200.08, t1: 200.45, route: [[113.85, 34.03], [114.00, 34.60]] },
    ],
    battles: [{ name: '官渡之战', at: 200.45, loc: [114.00, 34.60], winner: 'cao', desc: '曹操奇袭乌巢、焚袁绍粮草，以弱胜强，奠定统一北方的基础。' }],
  },
  {
    id: 'chibi', meta: { title: '赤壁之战', era: '三国', start: 208.5, end: 209.0 },
    parties: [
      { id: 'wei', name: '曹操军', color: '#b2543a' },
      { id: 'wu', name: '孙刘联军', color: '#1d7a6b' },
    ],
    forces: [
      { party: 'wei', t0: 208.5, t1: 208.86, route: [[113.85, 34.03], [112.36, 32.52], [112.14, 32.04], [112.19, 30.35], [113.40, 30.15]] },
      { party: 'wu', t0: 208.70, t1: 208.95, route: [[115.99, 29.71], [114.30, 30.60], [113.90, 29.72]] },
    ],
    battles: [{ name: '赤壁之战', at: 208.92, loc: [113.90, 29.72], winner: 'wu', desc: '孙刘联军以火攻大破曹军水师，奠定三国鼎立之势。' }],
  },
  {
    id: 'feishui', meta: { title: '淝水之战', era: '东晋十六国', start: 383.7, end: 384.0 },
    parties: [
      { id: 'qin', name: '前秦（苻坚）', color: '#7a5aa0' },
      { id: 'jin', name: '东晋（谢玄）', color: '#1d7a6b' },
    ],
    forces: [
      { party: 'qin', t0: 383.70, t1: 383.95, route: [[108.94, 34.34], [112.45, 34.62], [114.90, 33.44], [116.78, 32.58], [116.50, 32.40]] },
      { party: 'jin', t0: 383.80, t1: 383.97, route: [[118.80, 32.06], [119.42, 32.39], [116.50, 32.40]] },
    ],
    battles: [{ name: '淝水之战', at: 383.96, loc: [116.50, 32.40], winner: 'jin', desc: '东晋八万北府兵击溃前秦号称百万大军，"投鞭断流"变"风声鹤唳"，前秦随之瓦解。' }],
  },
];

export function warById(id) {
  return WARS.find((w) => w.id === id) || null;
}

// 该年份是否有战争在进行（按整数年落入区间判断）
export function warsAtYear(year) {
  return WARS.filter((w) => year >= Math.floor(w.meta.start) && year <= Math.ceil(w.meta.end));
}
