// 第三幅地图「中国历史地图」政权数据集（核心闭环：汉/唐/明 + 三国/南北朝/五代十国）
//
// 合规说明：以下几何均为**自建近似矢量**（中央王朝复用 china_outline 的 HB 快照轮廓，
// 并立政权为手绘示意多边形），不依赖、不复制谭其骧《中国历史地图集》等受版权保护的精确描绘。
// 仅作历史示意，精度为"示意级"，已在信息卡标注。
//
// 字段：
//   id        唯一标识
//   name      中文名
//   type      'central' 中央王朝 | 'parallel' 并立政权（三国/南北朝/五代十国等）
//   color     RGB 填充色（中央统一暖红，并立政权分色便于区分敌国）
//   start/end 存续年份（负数=公元前）
//   geom      {outline:'west-han'} 复用 china_outline 中同名王朝轮廓
//             {ring:[[lon,lat]...]} 手绘近似多边形（并立政权）
//   labelCoord [lon,lat] 政权名标签放置点（手动落在疆域内部，避免 centroid 偏到边界）
//   capital   都城名
//   capitalCoord [lon,lat]
//   desc      简介
//   events    重大事件 [{year,title,desc}]

export const POLITIES = [
  // —— 中央王朝（关键帧：当前为单轮廓，后续可补多关键帧做扩张插值）——
  {
    id: 'west-han', name: '西汉', type: 'central', color: [178, 84, 58],
    start: -202, end: 9, geom: { outline: 'west-han' },
    labelCoord: [108, 37],
    capital: '长安', capitalCoord: [108.95, 34.27],
    desc: '刘邦建立的统一的中央集权王朝，文景之治与汉武盛世奠定汉民族根基，奠定此后两千年大一统范式。疆域东临大海、西逾葱岭、北抵阴山、南包岭南。',
    events: [
      { year: -138, title: '张骞首次出使西域', desc: '凿空之旅，开通丝绸之路。' },
      { year: -134, title: '罢黜百家，独尊儒术', desc: '董仲舒献策，儒家成为正统。' },
      { year: -119, title: '卫青霍去病大破匈奴', desc: '漠北之战，匈奴远遁。' },
    ],
  },
  {
    id: 'east-han', name: '东汉', type: 'central', color: [178, 84, 58],
    start: 25, end: 220, geom: { outline: 'east-han' },
    labelCoord: [111, 33.5],
    capital: '洛阳', capitalCoord: [112.45, 34.62],
    desc: '刘秀重建汉室，定都洛阳。光武中兴后人口恢复，但后期外戚宦官交替专权，黄巾之乱后陷入军阀割据，走向三国。',
    events: [
      { year: 105, title: '蔡伦改进造纸术', desc: '推动文明传播。' },
      { year: 184, title: '黄巾之乱', desc: '太平道起义，汉室衰微。' },
    ],
  },
  {
    id: 'tang', name: '唐', type: 'central', color: [178, 84, 58],
    start: 618, end: 907, geom: { outline: 'tang' },
    labelCoord: [104, 36],
    capital: '长安', capitalCoord: [108.95, 34.27],
    desc: '李渊建立的盛世王朝，贞观之治与开元盛世国力鼎盛，万邦来朝。安史之乱后由盛转衰，藩镇割据、宦官专权。',
    events: [
      { year: 626, title: '玄武门之变', desc: '李世民即位，开启贞观之治。' },
      { year: 755, title: '安史之乱', desc: '由盛转衰的转折点。' },
      { year: 838, title: '会昌灭佛', desc: '武宗大规模裁汰佛寺。' },
    ],
  },
  {
    id: 'ming', name: '明', type: 'central', color: [178, 84, 58],
    start: 1368, end: 1644, geom: { outline: 'ming' },
    labelCoord: [110, 33],
    capital: '北京', capitalCoord: [116.40, 39.90],
    desc: '朱元璋推翻元朝建立，定都南京后迁北京。郑和下西洋、修《永乐大典》、建紫禁城。后期党争与边患，亡于农民起义与女真入关。',
    events: [
      { year: 1405, title: '郑和下西洋', desc: '七下西洋，远抵非洲东岸。' },
      { year: 1421, title: '迁都北京', desc: '天子守国门。' },
      { year: 1644, title: '甲申之变', desc: '李自成破京，崇祯自缢，清军入关。' },
    ],
  },

  // —— 并立政权：三国（220–280）——
  // 边界约定：北以秦岭—淮河与蜀/吴相隔，东止于海岸（吴本就濒海，沿山东/江苏/浙江/福建海岸线），
  // 不再把手绘多边形伸进海里；魏与蜀在秦岭相接、魏与吴在长江北岸相接、蜀与吴在长江沿线相接。
  {
    id: 'wei', name: '曹魏', type: 'parallel', color: [92, 108, 148],
    start: 220, end: 266, geom: { ring: [
      [104, 35], [110, 33], [114, 31.5], [118, 32], [121, 33], [121, 37],
      [118, 40.5], [114, 41.5], [110, 42], [105, 41], [101, 38],
    ] },
    labelCoord: [113, 37],
    capital: '洛阳', capitalCoord: [112.45, 34.62],
    desc: '曹操奠基、曹丕代汉所建，据中原与北方，国力最强。正始改制、司马氏专权，终为西晋所代。',
    events: [{ year: 263, title: '魏灭蜀汉', desc: '三分归一的开端。' }],
  },
  {
    id: 'shu', name: '蜀汉', type: 'parallel', color: [126, 132, 76],
    start: 221, end: 263, geom: { ring: [
      [106, 33], [110, 31], [112, 30], [110, 27], [108, 25], [102, 24],
      [99, 25], [98, 28], [103, 31],
    ] },
    labelCoord: [105, 30],
    capital: '成都', capitalCoord: [104.07, 30.67],
    desc: '刘备以汉室宗亲名义立于巴蜀，诸葛亮六出祁山北伐未果，后主降魏。',
    events: [{ year: 234, title: '诸葛亮病逝五丈原', desc: '北伐中道崩殂。' }],
  },
  {
    id: 'wu', name: '孙吴', type: 'parallel', color: [150, 96, 132],
    start: 222, end: 280, geom: { ring: [
      [112, 31], [114, 31], [118, 32], [121, 33], [121, 28], [119, 25],
      [116, 23], [110, 22], [108, 24], [108, 30], [110, 31],
    ] },
    labelCoord: [117, 29],
    capital: '建业', capitalCoord: [118.80, 32.06],
    desc: '孙权据江东，据长江之险，开发江南，航运与海外交往兴盛。',
    events: [{ year: 280, title: '晋灭吴', desc: '三国归晋。' }],
  },

  // —— 并立政权：南北朝（420–589）——
  {
    id: 'nanbeichao-north', name: '北朝', type: 'parallel', color: [78, 130, 128],
    start: 420, end: 589, geom: { ring: [
      [104, 35], [110, 33], [114, 31.5], [118, 32], [121, 33], [121, 37],
      [118, 40.5], [114, 41.5], [110, 42], [105, 41], [101, 38],
    ] },
    labelCoord: [113, 38],
    capital: '平城/洛阳', capitalCoord: [112.45, 34.62],
    desc: '北魏及随后的东魏、西魏、北齐、北周等北方政权，孝文帝汉化改革深刻影响后世；最终北周外戚杨坚代周建隋。',
    events: [{ year: 494, title: '北魏孝文帝迁都洛阳', desc: '全面推行汉化。' }],
  },
  {
    id: 'nanbeichao-south', name: '南朝', type: 'parallel', color: [166, 122, 62],
    start: 420, end: 589, geom: { ring: [
      [112, 31], [114, 31], [118, 32], [121, 33], [121, 28], [119, 25],
      [116, 23], [110, 22], [108, 24], [108, 30], [110, 31],
    ] },
    labelCoord: [114, 28],
    capital: '建康', capitalCoord: [118.80, 32.06],
    desc: '宋、齐、梁、陈相继立于江南，门阀士族鼎盛，佛教兴盛（如南朝四百八十寺），文化繁丽而国力渐弱。',
    events: [{ year: 589, title: '隋灭陈', desc: '南北重归一统。' }],
  },

  // —— 并立政权：五代十国（907–979）——
  {
    id: 'wudai', name: '五代', type: 'parallel', color: [112, 96, 150],
    start: 907, end: 960, geom: { ring: [
      [106, 34], [111, 33], [115, 32], [119, 33], [120, 37], [117, 40],
      [112, 41], [107, 41],
    ] },
    labelCoord: [114, 37],
    capital: '汴梁', capitalCoord: [114.30, 34.80],
    desc: '中原相继的后梁、后唐、后晋、后汉、后周五个短命王朝，武人专政、政权频替，最终由后周大将赵匡胤黄袍加身建宋。',
    events: [{ year: 959, title: '后周世宗北伐', desc: '功败垂成，次年赵匡胤陈桥兵变。' }],
  },
  {
    id: 'shiguo', name: '十国', type: 'parallel', color: [148, 88, 84],
    start: 907, end: 979, geom: { ring: [
      [115, 32], [119, 33], [120, 29], [118, 25], [114, 23], [110, 22],
      [108, 24], [108, 30], [111, 31],
    ] },
    labelCoord: [115, 26],
    capital: '金陵/成都等', capitalCoord: [118.80, 32.06],
    desc: '南方与山西先后存在的十余个割据政权（前蜀、后蜀、吴、南唐、吴越、楚、闽、南汉、南平、北汉等），经济文化相对安定繁荣。',
    events: [{ year: 975, title: '宋灭南唐', desc: '李煜被俘，"问君能有几多愁"。' }],
  },
];

export function polityById(id) {
  return POLITIES.find((p) => p.id === id) || null;
}
