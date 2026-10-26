// 战争数据集（独立模块，含"军队演进"动态演示所需 schema）
// ---------------------------------------------------------------------------
// 这套 schema 同时用于**内置战争**与未来的**用户导入战争**（编辑器导出同构 JSON）：
//   meta      { title, era, start, end, place, desc, result }
//             战争元信息；start/end 为年（可小数表月/季）；place 战场；
//             desc 是"战争背景/过程"，result 是"结果与影响"
//   parties   [{ id, name, short, color, troops }]
//             参战方；short 用于地图上的军队标签（避免长名糊一片），troops 为兵力
//   forces    [{ party, route:[[lng,lat]...],  t0, t1 }]
//             route 为军队行进轨迹；t0/t1 为出发/抵达年，按时间推进显示
//   battles   [{ name, at, loc:[lng,lat], winner, desc }]
// ---------------------------------------------------------------------------
// 坐标为示意位置（现代经纬度），用于演示"军队沿路线推进、会战爆发"的动态过程。

export const WARS = [
  {
    id: 'changping',
    meta: {
      title: '长平之战', era: '战国', start: -260.6, end: -260.3, place: '长平（今山西高平）',
      desc: '秦昭襄王派白起攻韩上党，赵孝成王以赵括代廉颇迎战。秦军佯退诱敌、断赵军粮道，围困四十六日，赵军四十余万人降后被坑杀。',
      result: '赵国精锐尽失，六国再无力单独抗秦，秦统一天下的格局自此奠定。',
    },
    parties: [
      { id: 'qin', name: '秦军（白起）', short: '秦军', color: '#8a5a3a', troops: '约 60 万' },
      { id: 'zhao', name: '赵军（赵括）', short: '赵军', color: '#1d7a6b', troops: '约 45 万' },
    ],
    forces: [
      { party: 'qin', t0: -260.60, t1: -260.45, route: [[108.70, 34.33], [110.60, 34.80], [112.10, 35.40], [112.92, 35.80]] },
      { party: 'zhao', t0: -260.58, t1: -260.42, route: [[114.49, 36.60], [113.40, 36.10], [112.92, 35.80]] },
    ],
    battles: [
      { name: '长平之战', at: -260.40, loc: [112.92, 35.80], winner: 'qin', desc: '白起分割包围赵军，断粮四十六日；赵括突围战死，降卒尽坑。' },
    ],
  },
  {
    id: 'julu',
    meta: {
      title: '巨鹿之战', era: '秦末', start: -207.8, end: -207.5, place: '巨鹿（今河北平乡）',
      desc: '秦将章邯破项梁后围赵王歇于巨鹿，诸侯救兵皆壁上观。项羽杀宋义夺军，渡漳水后沉船破釜、只持三日粮，九战九捷。',
      result: '秦军主力覆灭，章邯降楚；项羽由是始为诸侯上将军，秦亡之势遂成。',
    },
    parties: [
      { id: 'qin', name: '秦军（章邯/王离）', short: '秦军', color: '#8a5a3a', troops: '约 40 万' },
      { id: 'chu', name: '项羽楚军', short: '楚军', color: '#1d7a6b', troops: '约 5 万' },
    ],
    forces: [
      { party: 'qin', t0: -207.8, t1: -207.6, route: [[108.70, 34.33], [110.92, 34.63], [114.49, 36.60], [115.00, 37.20]] },
      { party: 'chu', t0: -207.70, t1: -207.55, route: [[114.35, 36.10], [115.00, 37.20]] },
    ],
    battles: [
      { name: '巨鹿之战', at: -207.58, loc: [115.00, 37.20], winner: 'chu', desc: '项羽破釜沉舟，以少胜多击溃秦军主力。' },
    ],
  },
  {
    id: 'gaixia',
    meta: {
      title: '垓下之战', era: '楚汉', start: -202.2, end: -202.0, place: '垓下（今安徽灵璧东南）',
      desc: '楚汉相持四年后，刘邦约韩信、彭越合围。韩信以六十万大军设十面埋伏，项羽十万楚军粮尽兵疲，夜闻四面楚歌，军心尽散。',
      result: '项羽突围至乌江自刎，楚汉战争结束，刘邦建立汉朝。',
    },
    parties: [
      { id: 'han', name: '汉军（刘邦/韩信）', short: '汉军', color: '#b2543a', troops: '约 60 万' },
      { id: 'chu', name: '楚军（项羽）', short: '楚军', color: '#1d7a6b', troops: '约 10 万' },
    ],
    forces: [
      { party: 'han', t0: -202.20, t1: -202.06, route: [[113.85, 34.03], [116.50, 33.90], [117.55, 33.55]] },
      { party: 'chu', t0: -202.15, t1: -202.04, route: [[117.18, 34.26], [117.45, 33.85], [117.55, 33.55]] },
    ],
    battles: [
      { name: '垓下之战', at: -202.05, loc: [117.55, 33.55], winner: 'han', desc: '韩信十面埋伏，楚军溃散；项羽率八百骑突围，至乌江自刎。' },
    ],
  },
  {
    id: 'kunyang',
    meta: {
      title: '昆阳之战', era: '新汉之际', start: 23.5, end: 23.8, place: '昆阳（今河南叶县）',
      desc: '王莽遣王邑、王寻率四十二万大军围昆阳，守军仅八九千。刘秀率十三骑突围求援，回师时自将三千敢死队直冲莽军中坚。',
      result: '莽军大溃，王邑仅以身免；新朝主力尽丧，绿林军随即攻入长安，新亡。',
    },
    parties: [
      { id: 'xin', name: '新莽军（王邑/王寻）', short: '新莽军', color: '#7a5aa0', troops: '约 42 万' },
      { id: 'han', name: '汉军（刘秀）', short: '汉军', color: '#1d7a6b', troops: '约 1.7 万' },
    ],
    forces: [
      { party: 'xin', t0: 23.50, t1: 23.66, route: [[112.45, 34.62], [113.20, 34.15], [113.35, 33.62]] },
      { party: 'han', t0: 23.60, t1: 23.72, route: [[114.05, 33.65], [113.35, 33.62]] },
    ],
    battles: [
      { name: '昆阳之战', at: 23.70, loc: [113.35, 33.62], winner: 'han', desc: '刘秀三千敢死队冲击莽军中坚，恰逢雷雨、屋瓦皆飞，莽军自相践踏，滍水为之不流。' },
    ],
  },
  {
    id: 'guandu',
    meta: {
      title: '官渡之战', era: '东汉末年', start: 200.0, end: 200.6, place: '官渡（今河南中牟）',
      desc: '袁绍并河北四州之众南下，曹操以劣势兵力扼守官渡。相持半年，曹操纳许攸之计亲率精锐奇袭乌巢，焚袁军粮草。',
      result: '袁军粮尽军溃，袁绍仅带八百骑北逃；曹操由此统一北方。',
    },
    parties: [
      { id: 'yuan', name: '袁绍军', short: '袁绍军', color: '#7a5aa0', troops: '约 11 万' },
      { id: 'cao', name: '曹操军', short: '曹操军', color: '#b2543a', troops: '约 2 万' },
    ],
    forces: [
      { party: 'yuan', t0: 200.0, t1: 200.42, route: [[114.40, 36.31], [114.55, 35.66], [114.20, 35.15], [114.00, 34.60]] },
      { party: 'cao', t0: 200.08, t1: 200.45, route: [[113.85, 34.03], [114.00, 34.60]] },
    ],
    battles: [
      { name: '官渡之战', at: 200.45, loc: [114.00, 34.60], winner: 'cao', desc: '曹操奇袭乌巢、焚袁绍粮草，以弱胜强。' },
    ],
  },
  {
    id: 'chibi',
    meta: {
      title: '赤壁之战', era: '三国', start: 208.5, end: 209.0, place: '赤壁（今湖北赤壁）',
      desc: '曹操南下取荆州，顺江东下号称八十万众。孙刘结盟，周瑜、程普率水军三万拒于赤壁，黄盖诈降以火船突袭曹军连锁船阵。',
      result: '曹军舟船尽焚、退守北方，三国鼎立之势由此奠定。',
    },
    parties: [
      { id: 'wei', name: '曹操军', short: '曹操军', color: '#b2543a', troops: '约 20 万' },
      { id: 'wu', name: '孙刘联军', short: '孙刘联军', color: '#1d7a6b', troops: '约 5 万' },
    ],
    forces: [
      { party: 'wei', t0: 208.5, t1: 208.86, route: [[113.85, 34.03], [112.36, 32.52], [112.14, 32.04], [112.19, 30.35], [113.40, 30.15]] },
      { party: 'wu', t0: 208.70, t1: 208.95, route: [[115.99, 29.71], [114.30, 30.60], [113.90, 29.72]] },
    ],
    battles: [
      { name: '赤壁之战', at: 208.92, loc: [113.90, 29.72], winner: 'wu', desc: '黄盖火船乘东南风突入曹军水寨，曹军连船尽燃，死者过半。' },
    ],
  },
  {
    id: 'feishui',
    meta: {
      title: '淝水之战', era: '东晋十六国', start: 383.7, end: 384.0, place: '淝水（今安徽寿县）',
      desc: '前秦苻坚统一北方后率众南下，号称投鞭断流。东晋以谢玄八万北府兵迎战，请秦军稍退以便渡河决战。',
      result: '秦军后撤时阵脚大乱，晋军趁势掩杀，苻坚"风声鹤唳、草木皆兵"；前秦随之瓦解，南北对峙格局延续二百年。',
    },
    parties: [
      { id: 'qin', name: '前秦（苻坚）', short: '前秦军', color: '#7a5aa0', troops: '号称百万' },
      { id: 'jin', name: '东晋（谢玄）', short: '北府兵', color: '#1d7a6b', troops: '约 8 万' },
    ],
    forces: [
      { party: 'qin', t0: 383.70, t1: 383.95, route: [[108.94, 34.34], [112.45, 34.62], [114.90, 33.44], [116.78, 32.58], [116.50, 32.40]] },
      { party: 'jin', t0: 383.80, t1: 383.97, route: [[118.80, 32.06], [119.42, 32.39], [116.50, 32.40]] },
    ],
    battles: [
      { name: '淝水之战', at: 383.96, loc: [116.50, 32.40], winner: 'jin', desc: '秦军一退不可复止，晋军渡水猛攻，前秦大军自溃。' },
    ],
  },
  {
    id: 'hulao',
    meta: {
      title: '虎牢关之战', era: '唐初', start: 621.2, end: 621.5, place: '虎牢关（今河南荥阳）',
      desc: '李世民围洛阳王世充，河北窦建德率十余万众来援。李世民留主力围城，自率三千五百玄甲军东据虎牢，扼住夏军咽喉。',
      result: '唐军一举擒窦建德、降王世充，中原、河北尽归唐，统一战争基本完成。',
    },
    parties: [
      { id: 'tang', name: '唐军（李世民）', short: '唐军', color: '#b2543a', troops: '约 3500 精骑' },
      { id: 'xia', name: '夏军（窦建德）', short: '夏军', color: '#7a5aa0', troops: '约 10 余万' },
    ],
    forces: [
      { party: 'tang', t0: 621.20, t1: 621.36, route: [[112.45, 34.62], [113.22, 34.83]] },
      { party: 'xia', t0: 621.22, t1: 621.42, route: [[114.55, 36.65], [114.30, 35.60], [113.90, 35.05], [113.22, 34.83]] },
    ],
    battles: [
      { name: '虎牢之战', at: 621.40, loc: [113.22, 34.83], winner: 'tang', desc: '夏军列阵久疲，唐军玄甲骑自高处冲下，直贯其阵，窦建德被擒。' },
    ],
  },
  {
    id: 'caishi',
    meta: {
      title: '采石之战', era: '南宋', start: 1161.9, end: 1161.98, place: '采石矶（今安徽马鞍山）',
      desc: '金主完颜亮南侵，渡淮直逼长江。宋军主将王权罢职、部众涣散，中书舍人虞允文临危督师，聚溃兵一万八千扼守采石。',
      result: '宋军以海鳅船冲撞金军舟师，金军大败；完颜亮为部下所杀，南宋转危为安。',
    },
    parties: [
      { id: 'jin', name: '金军（完颜亮）', short: '金军', color: '#7a5aa0', troops: '约 15 万' },
      { id: 'song', name: '宋军（虞允文）', short: '宋军', color: '#1d7a6b', troops: '约 1.8 万' },
    ],
    forces: [
      { party: 'jin', t0: 1161.90, t1: 1161.96, route: [[117.30, 33.00], [118.35, 31.75], [118.45, 31.65]] },
      { party: 'song', t0: 1161.93, t1: 1161.98, route: [[118.78, 32.06], [118.60, 31.85], [118.45, 31.65]] },
    ],
    battles: [
      { name: '采石之战', at: 1161.97, loc: [118.45, 31.65], winner: 'song', desc: '宋军车船、海鳅船横冲金军舟师，以霹雳炮焚其船，金军大溃。' },
    ],
  },
  {
    id: 'yashan',
    meta: {
      title: '崖山海战', era: '南宋末', start: 1279.15, end: 1279.25, place: '崖门（今广东新会）',
      desc: '元将张弘范率水军追至崖山，宋臣张世杰以千余艘战船结成一字长阵死守。元军据海口断其水源、粮道，南北夹击。',
      result: '宋军大溃，陆秀夫负幼帝赵昺投海，南宋覆亡，元朝统一全国。',
    },
    parties: [
      { id: 'yuan', name: '元军（张弘范）', short: '元军', color: '#7a5aa0', troops: '约 2 万' },
      { id: 'song', name: '宋军（张世杰）', short: '宋军', color: '#1d7a6b', troops: '约 20 万' },
    ],
    forces: [
      { party: 'yuan', t0: 1279.15, t1: 1279.22, route: [[113.26, 23.13], [113.10, 22.60], [113.10, 22.10]] },
      { party: 'song', t0: 1279.16, t1: 1279.23, route: [[113.45, 22.45], [113.20, 22.25], [113.10, 22.10]] },
    ],
    battles: [
      { name: '崖山海战', at: 1279.23, loc: [113.10, 22.10], winner: 'yuan', desc: '元军借潮汐南北夹攻，宋阵瓦解；陆秀夫负帝投海，十万军民殉国。' },
    ],
  },
  {
    id: 'poyang',
    meta: {
      title: '鄱阳湖之战', era: '元末', start: 1363.55, end: 1363.72, place: '鄱阳湖康山（今江西余干）',
      desc: '陈友谅率舟师六十万围攻洪都，朱元璋亲率二十万救援，两军决战鄱阳湖。朱军以小舟灵活机动，用火器、火筏攻陈军巨舰。',
      result: '陈友谅中流矢而死，汉政权瓦解；朱元璋尽取江西、湖广，为北伐灭元扫清后方。',
    },
    parties: [
      { id: 'zhu', name: '朱元璋军', short: '朱军', color: '#b2543a', troops: '约 20 万' },
      { id: 'chen', name: '陈友谅军', short: '陈军', color: '#7a5aa0', troops: '约 60 万' },
    ],
    forces: [
      { party: 'zhu', t0: 1363.55, t1: 1363.66, route: [[118.78, 32.06], [117.20, 30.60], [116.22, 29.73], [116.60, 29.05]] },
      { party: 'chen', t0: 1363.56, t1: 1363.64, route: [[115.99, 29.71], [116.40, 29.30], [116.60, 29.05]] },
    ],
    battles: [
      { name: '鄱阳湖之战', at: 1363.66, loc: [116.60, 29.05], winner: 'zhu', desc: '火筏乘风焚陈军巨舰，湖水尽赤；陈友谅突围时中箭身亡。' },
    ],
  },
  {
    id: 'sarhu',
    meta: {
      title: '萨尔浒之战', era: '明末', start: 1619.28, end: 1619.36, place: '萨尔浒（今辽宁抚顺东）',
      desc: '明廷集四路大军合击后金都城赫图阿拉，杨镐分兵进击。努尔哈赤集中八旗兵力，采取"凭尔几路来，我只一路去"的内线作战。',
      result: '五日内连破三路明军，明军文武将吏死者三百余、士兵四万余人；后金由此转入战略进攻。',
    },
    parties: [
      { id: 'ming', name: '明军（杨镐）', short: '明军', color: '#b2543a', troops: '约 8.8 万' },
      { id: 'jin', name: '后金（努尔哈赤）', short: '后金军', color: '#7a5aa0', troops: '约 6 万' },
    ],
    forces: [
      { party: 'ming', t0: 1619.28, t1: 1619.33, route: [[123.43, 41.80], [123.80, 41.83], [124.00, 41.85]] },
      { party: 'jin', t0: 1619.29, t1: 1619.35, route: [[124.80, 41.70], [124.30, 41.80], [124.00, 41.85]] },
    ],
    battles: [
      { name: '萨尔浒之战', at: 1619.35, loc: [124.00, 41.85], winner: 'jin', desc: '八旗先破萨尔浒明军大营，再回师逐个击破各路，五日三捷。' },
    ],
  },
];

export function warById(id) {
  return WARS.find((w) => w.id === id) || null;
}

// 该年份是否有战争在进行（按整数年落入区间判断）
export function warsAtYear(year) {
  return WARS.filter((w) => year >= Math.floor(w.meta.start) && year <= Math.ceil(w.meta.end));
}

// 动画驱动用的"在演战争"：指定 focusId 时只演这一场（列表页跳转后单独回放）。
export function activeWars(year, focusId) {
  const ws = warsAtYear(year);
  if (!focusId) return ws;
  const one = ws.filter((w) => w.id === focusId);
  return one.length ? one : ws;
}

// 列表页的"大时代"分桶（比 meta.era 粗：era 是精确时段，用于卡片副标题；
// 列表页按大时代分组，12 场战争才不会变成 12 个单条标题）
const ERA_BUCKETS = [
  { until: -221, name: '先秦' },
  { until: 220, name: '秦汉' },
  { until: 589, name: '三国两晋南北朝' },
  { until: 907, name: '隋唐' },
  { until: 1271, name: '宋辽金夏' },
  { until: 1368, name: '元' },
  { until: 1644, name: '明' },
];
function eraBucket(year) {
  for (const b of ERA_BUCKETS) if (year < b.until) return b.name;
  return '清及以后';
}

// 战争列表页数据：按大时代分组、组内按年份排序
export function warListGroups() {
  const byEra = new Map();
  for (const w of WARS.slice().sort((a, b) => a.meta.start - b.meta.start)) {
    const k = eraBucket(w.meta.start);
    if (!byEra.has(k)) byEra.set(k, []);
    byEra.get(k).push(w);
  }
  return [...byEra.entries()].map(([era, wars]) => ({ era, wars }));
}

// 战区包围盒 → 跳转时的地图中心与缩放
export function warView(w) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = ([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const f of w.forces || []) (f.route || []).forEach(add);
  for (const b of w.battles || []) add(b.loc);
  if (!Number.isFinite(minX)) return { center: [104, 34], zoom: 4.6 };
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 0.8);
  // 屏幕宽约 1000px：可见经度 ≈ 1000 * 360 / (256 * 2^z) → 反解 zoom
  const zoom = Math.max(4.2, Math.min(8, Math.log2((1000 * 360) / (256 * span * 2.4))));
  return { center: [cx, cy], zoom };
}
