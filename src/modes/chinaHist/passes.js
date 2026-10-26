// 关隘数据集（独立模块）
// 关隘对历史军事走向影响极大（扼守山川孔道），单列一层，永远显示、可点击看简介。
// 坐标为示意位置（现代经纬度），desc 说明其战略地位与相关战事。
// 数据为自建整理（公开史料常识），不依赖受版权保护的地图描绘。

export const PASSES = [
  { id: 'hangu', name: '函谷关', coord: [110.92, 34.63], dynasties: ['秦', '汉'], desc: '关中东部门户，扼崤函古道。"一夫当关，万夫莫开"，秦据此东出、六国攻秦多阻于此。' },
  { id: 'tongguan', name: '潼关', coord: [110.25, 34.55], dynasties: ['汉末', '唐'], desc: '取代函谷关的关中东大门，据黄河与秦岭之间隘口。安史之乱中哥舒翰失守潼关，长安遂陷。' },
  { id: 'wuguan', name: '武关', coord: [110.65, 33.62], dynasties: ['秦', '汉'], desc: '关中东南门户，通南阳、荆襄。刘邦由此入关中；秦末楚汉争夺要地。' },
  { id: 'xiaoguan', name: '萧关', coord: [106.20, 36.00], dynasties: ['汉'], desc: '关中西北门户，控扼陇山、防御匈奴，汉文帝时匈奴曾破萧关入塞。' },
  { id: 'sanguan', name: '散关', coord: [106.85, 34.02], dynasties: ['汉', '三国'], desc: '即大散关，关中通汉中的秦岭要道。诸葛亮北伐、宋金对峙皆争此。' },
  { id: 'jianmen', name: '剑门关', coord: [105.58, 32.20], dynasties: ['三国', '唐'], desc: '入蜀天险，两崖如剑、一径可通。姜维退守剑门拒钟会，为"蜀道之难"代表。' },
  { id: 'yangping', name: '阳平关', coord: [106.55, 33.10], dynasties: ['三国'], desc: '汉中西部门户，控褒斜、金牛道。曹操与刘备争夺汉中时的重要据点。' },
  { id: 'jiameng', name: '葭萌关', coord: [105.72, 32.42], dynasties: ['三国'], desc: '蜀北门户，刘备入蜀、张飞战马超之地，扼嘉陵江上游。' },
  { id: 'hulao', name: '虎牢关', coord: [113.22, 34.83], dynasties: ['汉', '唐'], desc: '洛阳东部门户，扼汜水。三英战吕布（演义）与唐初李世民虎牢之战均在此。' },
  { id: 'jingsing', name: '井陉关', coord: [114.02, 38.02], dynasties: ['秦', '汉'], desc: '太行八陉之一，河北通山西的孔道。韩信背水一战破赵即出此道。' },
  { id: 'yanmen', name: '雁门关', coord: [112.88, 39.22], dynasties: ['汉', '宋', '明'], desc: '代北屏障，扼勾注山。李牧、卫青、杨家将皆曾镇守，是中原御北的关键。' },
  { id: 'ningwu', name: '宁武关', coord: [112.30, 39.00], dynasties: ['明'], desc: '明代内长城"外三关"之一，与偏头、雁门互为大原北面屏障。' },
  { id: 'zijing', name: '紫荆关', coord: [115.10, 39.42], dynasties: ['明'], desc: '太行八陉之蒲阴陉，京师西南屏障。明土木之变后瓦剌曾由此逼京。' },
  { id: 'juyong', name: '居庸关', coord: [116.08, 40.30], dynasties: ['明'], desc: '京师北大门，扼军都陉。与山海关、嘉峪关并称长城三大关。' },
  { id: 'shanhai', name: '山海关', coord: [119.75, 40.01], dynasties: ['明'], desc: '"天下第一关"，扼辽西走廊、山海之间。明末吴三桂开关引清军入关。' },
  { id: 'jiayuguan', name: '嘉峪关', coord: [98.30, 39.80], dynasties: ['明'], desc: '明长城西端雄关，"天下第一雄关"，控河西走廊西口。' },
  { id: 'yumenguan', name: '玉门关', coord: [93.90, 40.35], dynasties: ['汉'], desc: '汉通西域的门户，"春风不度玉门关"，丝绸之路出塞要隘。' },
  { id: 'yangguan', name: '阳关', coord: [94.05, 39.93], dynasties: ['汉'], desc: '汉通西域南道门户，"西出阳关无故人"，与玉门关分扼南北两道。' },
  { id: 'pingxing', name: '平型关', coord: [113.72, 39.32], dynasties: ['明'], desc: '内长城关隘，晋北通冀西的孔道。1937 年平型关大捷即在此附近。' },
  { id: 'niangziguan', name: '娘子关', coord: [113.83, 37.90], dynasties: ['唐', '明'], desc: '太行井陉西口，晋冀咽喉，因平阳公主率娘子军驻守得名。' },
];

export function passById(id) {
  return PASSES.find((p) => p.id === id) || null;
}
