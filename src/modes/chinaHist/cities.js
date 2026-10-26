// 城市 / 治所数据集（独立模块）
// 收录历代重要都城与区域中心，单列一层，可点击看简介。坐标为现代经纬度（示意位置）。

export const CITIES = [
  { id: 'changan', name: '长安', coord: [108.94, 34.34], founded: '西周', peak: '汉/唐', desc: '西周丰镐、汉唐都城所在。汉唐盛世的政治中心，丝绸之路东端起点。' },
  { id: 'luoyang', name: '洛阳', coord: [112.45, 34.62], founded: '东周', peak: '东汉/北魏/唐', desc: '"十三朝古都"，东汉、曹魏、北魏、隋唐东都。地处中原、扼崤函与虎牢。' },
  { id: 'xianyang', name: '咸阳', coord: [108.70, 34.33], founded: '秦', peak: '秦', desc: '秦孝公迁都于此，秦统一后为帝国都城，渭水北岸宫室连绵。' },
  { id: 'kaifeng', name: '开封', coord: [114.31, 34.80], founded: '战国', peak: '北宋', desc: '战国魏都大梁，五代与北宋东京汴梁。水运发达，《清明上河图》所绘繁华。' },
  { id: 'nanjing', name: '南京', coord: [118.80, 32.06], founded: '三国', peak: '六朝/明初', desc: '孙吴建业、东晋南朝建康、明初京师。六朝金粉、虎踞龙盘。' },
  { id: 'beijing', name: '北京', coord: [116.40, 39.90], founded: '辽', peak: '元/明/清', desc: '辽南京、金中都、元大都、明清京师。华北平原北端、背山面原的战略都会。' },
  { id: 'hangzhou', name: '杭州', coord: [120.15, 30.27], founded: '秦', peak: '南宋', desc: '吴越国都、南宋临安。"上有天堂，下有苏杭"，江南经济文化中心。' },
  { id: 'chengdu', name: '成都', coord: [104.07, 30.67], founded: '战国', peak: '蜀汉', desc: '蜀汉都城，天府之国中心。都江堰灌溉、蜀锦闻名，易守难攻。' },
  { id: 'guangzhou', name: '广州', coord: [113.26, 23.13], founded: '秦', peak: '唐宋', desc: '南海郡治、唐宋市舶重镇，海上丝绸之路的重要口岸。' },
  { id: 'taiyuan', name: '太原', coord: [112.55, 37.87], founded: '春秋', peak: '北汉', desc: '晋阳古城，北朝与五代北汉的重镇，控扼山西高原。' },
  { id: 'datong', name: '平城', coord: [113.30, 40.08], founded: '北魏', peak: '北魏', desc: '北魏前期都城平城（今大同），云冈石窟开凿于此。' },
  { id: 'yecheng', name: '邺城', coord: [114.40, 36.31], founded: '战国', peak: '曹魏/后赵', desc: '曹魏五都之一，后赵、东魏、北齐都城。铜雀台所在。' },
  { id: 'xuchang', name: '许昌', coord: [113.85, 34.03], founded: '三国', peak: '曹魏', desc: '曹操迎汉献帝都许，"挟天子以令诸侯"，曹魏五都之一。' },
  { id: 'jingzhou', name: '江陵', coord: [112.19, 30.35], founded: '春秋', peak: '三国', desc: '荆州治所，长江中游枢纽，兵家必争。赤壁之战前后的争夺焦点。' },
  { id: 'xiangyang', name: '襄阳', coord: [112.14, 32.04], founded: '汉', peak: '三国/宋', desc: '控汉水、扼南北，与樊城夹江相望。"铁打的襄阳"，宋元大战于此。' },
  { id: 'yangzhou', name: '扬州', coord: [119.42, 32.39], founded: '汉', peak: '唐/清', desc: '隋唐大运河枢纽，"扬一益二"，盐商云集的繁华都会。' },
  { id: 'quanzhou', name: '泉州', coord: [118.60, 24.90], founded: '唐', peak: '宋元', desc: '宋元东方第一大港，海上丝绸之路起点之一，"涨海声中万国商"。' },
  { id: 'dunhuang', name: '敦煌', coord: [94.66, 40.14], founded: '汉', peak: '唐', desc: '河西四郡之一，丝路咽喉、莫高窟所在，中西文明交汇之地。' },
];

export function cityById(id) {
  return CITIES.find((c) => c.id === id) || null;
}
