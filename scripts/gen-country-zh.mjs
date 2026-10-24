// 一次性生成 src/data/country-zh.json：全部国家中文译名映射
// 数据源：mledoze/countries（含 zho 通用名），加 CShapes 历史政权别名
// 运行：node scripts/gen-country-zh.mjs
import fs from 'node:fs';

const SRC = './_mledoze.json';
const OUT = './src/data/country-zh.json';

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // 去音标
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// CShapes 历史政权/特殊命名的中文（mledoze 不含或对不上）
const MANUAL_ZH = {
  'Austria-Hungary': '奥匈帝国',
  'Russia (Soviet Union)': '俄罗斯（苏联）',
  'Russia': '俄罗斯',
  'Soviet Union': '苏联',
  'Germany (Prussia)': '德国（普鲁士）',
  'Prussia': '普鲁士',
  'Turkey (Ottoman Empire)': '土耳其（奥斯曼帝国）',
  'Ottoman Empire': '奥斯曼帝国',
  'Iran (Persia)': '伊朗（波斯）',
  'Persia': '波斯',
  'Myanmar (Burma)': '缅甸',
  'Burma': '缅甸',
  'Sri Lanka (Ceylon)': '斯里兰卡（锡兰）',
  'Ceylon': '锡兰',
  'Cambodia (Kampuchea)': '柬埔寨',
  'Kampuchea': '民主柬埔寨',
  'Belarus (Byelorussia)': '白俄罗斯',
  'Byelorussia': '白俄罗斯',
  'Burkina Faso (Upper Volta)': '布基纳法索（上沃尔特）',
  'Upper Volta': '上沃尔特',
  'Madagascar (Malagasy)': '马达加斯加',
  'Tanzania (Tanganyika)': '坦桑尼亚（坦噶尼喀）',
  'Tanganyika': '坦噶尼喀',
  'Zimbabwe (Rhodesia)': '津巴布韦（罗得西亚）',
  'Rhodesia': '罗得西亚',
  'Rumania': '罗马尼亚',
  'Surinam': '苏里南',
  'Kyrgyz Republic': '吉尔吉斯斯坦',
  'Bosnia-Herzegovina': '波斯尼亚和黑塞哥维那',
  'Bosnia': '波斯尼亚',
  'Herzegovina': '黑塞哥维那',
  'Macedonia (FYROM/North Macedonia)': '北马其顿',
  'Congo, Democratic Republic of (Zaire)': '刚果民主共和国（扎伊尔）',
  'Zaire': '扎伊尔',
  'Congo': '刚果（布）',
  "Korea, People's Republic of": '朝鲜',
  'Korea, Republic of': '韩国',
  'Korea': '朝鲜',
  'Vietnam (Annam/Cochin China/Tonkin)': '越南（安南/交趾/东京）',
  'Annam': '安南',
  'Vietnam, Democratic Republic of': '越南民主共和国（北越）',
  'Vietnam, Republic of': '越南共和国（南越）',
  'Yemen (Arab Republic of Yemen)': '也门（阿拉伯也门共和国）',
  'Yemen, People\u2019s Republic of': '也门人民民主共和国（南也门）',
  'German Democratic Republic': '民主德国（东德）',
  'German Federal Republic': '联邦德国（西德）',
  'Czechoslovakia': '捷克斯洛伐克',
  'Yugoslavia': '南斯拉夫',
  'Serbia': '塞尔维亚',
  'Montenegro': '黑山',
  'Taiwan': '中国台湾',
  'Tibet': '西藏地方',
  'United States of America': '美国',
  'United States': '美国',
  'United Kingdom': '英国',
  'Great Britain': '英国',
  'Ivory Coast': '科特迪瓦',
  'Czech Republic': '捷克',
  'South Korea': '韩国',
  'North Korea': '朝鲜',
  'Swaziland (Eswatini)': '斯威士兰（埃斯瓦蒂尼）',
  'Cape Colony': '开普殖民地',
  'Natal': '纳塔尔殖民地',
  'Transvaal': '德兰士瓦',
  'Orange Free State': '奥兰治自由邦',
  'British Bechuanaland': '英属贝专纳',
  'British Cameroons': '英属喀麦隆',
  'British Togoland': '英属多哥兰',
  'Kamerun': '喀麦隆（德属）',
  'German Togoland': '德属多哥兰',
  'German Solomon Islands': '德属所罗门群岛',
  'Italian Somaliland': '意属索马里',
  'British Somaliland (Somaliland Republic)': '英属索马里兰',
  'Spanish Sahara': '西属撒哈拉',
  'Spanish Morocco': '西属摩洛哥',
  'Southern zone of Spanish Morocco': '西属摩洛哥南部区',
  'Spanish West Africa': '西属西非',
  'French West Africa': '法属西非',
  'French Guyana': '法属圭亚那',
  'French Polynesia': '法属波利尼西亚',
  'New Caledonia and Dependencies': '新喀里多尼亚',
  'German New Guinea (Kaiser Wilhelmsland)': '德属新几内亚',
  'New Guinea (German New Guinea) (Kaiser Wilhelmsland)': '德属新几内亚',
  'West Irian (Dutch New Guinea)': '西伊里安（荷属新几内亚）',
  'Dutch New Guinea': '荷属新几内亚',
  'Straits Settlements': '海峡殖民地',
  'Federated Malay States': '马来联邦',
  'Unfederated Malay States': '马来属邦',
  'Sabah (North Borneo)': '沙巴（北婆罗洲）',
  'North Borneo': '北婆罗洲',
  'Sarawak': '沙捞越',
  'Zanzibar': '桑给巴尔',
  'Lagos': '拉各斯殖民地',
  'Oil Rivers Protectorate': '油河保护国',
  'Northern Nigeria': '北尼日利亚',
  'Southern Nigeria': '南尼日利亚',
  'Northeastern Rhodesia': '东北罗得西亚',
  'Northwestern Rhodesia': '西北罗得西亚',
  'Federation of Rhodesia and Nyasaland': '罗得西亚与尼亚萨兰联邦',
  'Federation of South Arabia': '南阿拉伯联邦',
  'East Aden Protectorate': '亚丁保护国（东部）',
  'Aden': '亚丁殖民地',
  'Danzig': '但泽自由市',
  'Bokhara': '布哈拉汗国',
  'Khiva': '希瓦汗国',
  'Hawaii': '夏威夷王国/领地',
  'Alaska': '阿拉斯加',
  'New South Wales': '新南威尔士',
  'Queensland': '昆士兰',
  'Victoria': '维多利亚',
  'South Australia': '南澳大利亚',
  'Western Australia': '西澳大利亚',
  'Tasmania': '塔斯马尼亚',
  'Newfoundland': '纽芬兰',
  'Southern Sakhalin Island': '南萨哈林（库页岛南部）',
  'Gaza': '加沙地带',
  'West Bank': '约旦河西岸',
  'Jammu and Kashmir': '查谟和克什米尔',
  'Kashmir (North, Azad)': '克什米尔（北部/自由克什米尔）',
  'Papua': '巴布亚',
  'Inini': '伊尼尼（法属圭亚那内地）',
  'Guadeloupe': '瓜德罗普',
  'Martinique': '马提尼克',
  'Reunion': '留尼汪',
  'Puerto Rico': '波多黎各',
  'Moldova': '摩尔多瓦',
  'Italy/Sardinia': '意大利/撒丁王国',
  'Sardinia': '撒丁王国',
  'Malta': '马耳他',
  'Bahamas': '巴哈马',
  'Barbados': '巴巴多斯',
  'Belize': '伯利兹',
  'Brunei': '文莱',
  'Cape Verde': '佛得角',
  'Comoros': '科摩罗',
  'Djibouti': '吉布提',
  'East Timor': '东帝汶',
  'Equatorial Guinea': '赤道几内亚',
  'Eritrea': '厄立特里亚',
  'Fiji': '斐济',
  'Gambia': '冈比亚',
  'Guyana': '圭亚那',
  'Jamaica': '牙买加',
  'Maldives': '马尔代夫',
  'Mauritius': '毛里求斯',
  'Pahang': '彭亨',
  'Perak': '霹雳',
  'Selangore': '雪兰莪',
  'Singapore': '新加坡',
  'Solomon Islands': '所罗门群岛',
  'South Sudan': '南苏丹',
  'Eswatini': '斯威士兰',
  'Trinidad and Tobago': '特立尼达和多巴哥',
  'Rwanda-Urundi': '卢旺达-布隆迪（比利时托管地）',
};

const m = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const map = {}; // normKey -> zh

for (const c of m) {
  const zhName = c.translations?.zho?.common;
  if (!zhName) continue;
  const keys = [c.name.common, c.name.official, ...(c.altSpellings || [])];
  for (const k of keys) {
    const n = norm(k);
    if (n && !map[n]) map[n] = zhName;
  }
}
// 手工条目优先（含 CShapes 原始名直接索引 + 去括号索引）
for (const [en, zhName] of Object.entries(MANUAL_ZH)) {
  map[norm(en)] = zhName;
  const stripped = en.replace(/\s*\(.*\)\s*$/, '').trim();
  if (stripped && stripped !== en) map[norm(stripped)] = zhName;
}

// 覆盖率核查：用 CShapes 全部 252 国名
const cs = JSON.parse(fs.readFileSync('./public/data/cshapes-2.1.geojson', 'utf8'));
const names = [...new Set(cs.features.map((f) => f.properties.cntry_name))];
const missing = [];
for (const n of names) {
  const hit = map[norm(n)] || map[norm(n.replace(/\s*\(.*\)\s*$/, ''))] || map[norm(n.split(/[,(]/)[0])];
  if (!hit) missing.push(n);
}
console.log('CShapes countries:', names.length, ' covered:', names.length - missing.length, ' missing:', missing.length);
if (missing.length) console.log('MISSING:', JSON.stringify(missing, null, 0));

fs.writeFileSync(OUT, JSON.stringify(map, null, 0), 'utf8');
console.log('written:', OUT, fs.statSync(OUT).size, 'bytes,', Object.keys(map).length, 'keys');
