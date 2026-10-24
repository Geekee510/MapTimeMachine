// 中文译名：全量国家映射由 scripts/gen-country-zh.mjs 从 mledoze/countries 生成（252 国全覆盖），
// 河流/山脉仍用手工表。未收录的回退英文原名。
import COUNTRY_ALL from './country-zh.json';

export const COUNTRY_ZH = COUNTRY_ALL;

export const RIVER_ZH = {
  'Huang': '黄河', 'Chang Jiang': '长江', 'Yangtze': '长江', 'Xi Jiang': '西江',
  'Amur': '黑龙江', 'Mekong': '湄公河', 'Ganges': '恒河', 'Indus': '印度河',
  'Brahmaputra': '布拉马普特拉河', 'Tigris': '底格里斯河', 'Euphrates': '幼发拉底河',
  'Al Furat': '幼发拉底河', 'Firat': '幼发拉底河', 'Ertis': '额尔齐斯河',
  'Nile': '尼罗河', 'Congo': '刚果河', 'Niger': '尼日尔河', 'Volga': '伏尔加河',
  'Danube': '多瑙河', 'Donau': '多瑙河', 'Rhine': '莱茵河', 'Rhône': '罗讷河',
  'Po': '波河', 'Ebro': '埃布罗河', 'Seine': '塞纳河', 'Loire': '卢瓦尔河',
  'Thames': '泰晤士河', 'Amazonas': '亚马逊河', 'Paraná': '巴拉那河',
  'Mississippi': '密西西比河', 'Missouri': '密苏里河', 'Colorado': '科罗拉多河',
  'Rio Grande': '格兰德河', 'Yangtze River': '长江', 'Yellow River': '黄河',
  'Murray': '墨累河', 'Mackenzie': '马更些河', 'Lena': '勒拿河', 'Yenisey': '叶尼塞河',
  'Yenisei': '叶尼塞河', 'Ob': '鄂毕河', 'Irtysh': '额尔齐斯河', 'Zambezi': '赞比西河',
  'Shatt al Arab': '阿拉伯河', 'Syr Darya': '锡尔河', 'Amu Darya': '阿姆河',
  'Tarim': '塔里木河', 'Salween': '萨尔温江', 'Ili': '伊犁河', 'Helmand': '赫尔曼德河',
  'Jordan': '约旦河', 'Orontes': '奥龙特斯河', 'Vistula': '维斯瓦河', 'Oder': '奥得河',
  'Elbe': '易北河', 'Dnieper': '第聂伯河', 'Dniepr': '第聂伯河', 'Dnipro': '第聂伯河',
  'Don': '顿河', 'Ural': '乌拉尔河', 'Kolyma': '科雷马河', 'Indigirka': '因迪吉尔卡河',
  'Yukon': '育空河', 'Columbia': '哥伦比亚河', 'Ohio': '俄亥俄河', 'Tennessee': '田纳西河',
  'São Francisco': '圣弗朗西斯科河', 'Orinoco': '奥里诺科河', 'Magdalena': '马格达莱纳河',
  'Blue Nile': '青尼罗河', 'White Nile': '白尼罗河', 'Senegal': '塞内加尔河',
  'Volta': '沃尔特河', 'Limpopo': '林波波河', 'Okavango': '奥卡万戈河',
  'Darling': '达令河', 'Murrumbidgee': '马兰比吉河',
  'Rhein': '莱茵河', 'Dniester': '德涅斯特河', 'Tisza': '蒂萨河', 'Theiss': '蒂萨河',
  'Drava': '德拉瓦河', 'Save': '萨瓦河', 'Sava': '萨瓦河', 'Daugava': '道加瓦河',
  'Neman': '涅曼河', 'Niemen': '涅曼河', 'Kama': '卡马河', 'Oka': '奥卡河',
  'Tagus': '塔霍河', 'Tajo': '塔霍河', 'Douro': '杜罗河', 'Duero': '杜罗河',
  'Marne': '马恩河', 'Moselle': '摩泽尔河', 'Main': '美因河', 'Weser': '威悉河',
  'Shannon': '香农河', 'Adriatic-drainage': '亚得里亚海诸河',
  // 主要河流补充
  'Abay': '阿巴伊河', 'Albert Nile': '艾伯特尼罗河', 'Atbara': '阿特巴拉河',
  'Angara': '安加拉河', 'Biya': '比亚河', 'Gan': '赣江', 'Han': '汉江',
  'Grande': '格兰德河', 'Alabama': '阿拉巴马河', 'Albany': '奥尔巴尼河',
  'Athabasca': '阿萨巴斯卡河', 'Back': '巴克河', 'Churchill': '丘吉尔河',
  'Coppermine': '铜矿河', 'Dalälven': '达尔河', 'El Bahr el Azraq': '青尼罗河',
  'Arkansas': '阿肯色河', 'Red River': '红河', 'Brahmaputra River': '布拉马普特拉河',
  'Syr': '锡尔河', 'Amu': '阿姆河', 'Neva': '涅瓦河', 'Dniester River': '德涅斯特河',
  'Prut': '普鲁特河', 'Bug': '布格河', 'Daugava River': '道加瓦河',
  'Garonne': '加龙河', 'Dordogne': '多尔多涅河', 'Rhône River': '罗讷河',
  // 主要世界河流（扩充，覆盖 Natural Earth 中的主要河名）
  'Abay': '阿巴伊河', 'Alabama': '阿拉巴马河', 'Albany': '奥尔巴尼河', 'Albert Nile': '艾伯特尼罗河',
  'Aldan': '阿尔丹河', 'Allegheny': '阿勒格尼河', 'Anadyr': '阿纳德尔河', 'Angara': '安加拉河',
  'Araguaia': '阿拉瓜亚河', 'Argun': '额尔古纳河', 'Ariège': '阿里耶日河', 'Athabasca': '阿萨巴斯卡河',
  'Ayeyarwady': '伊洛瓦底江', 'Back': '巴克河', 'Bafing': '巴芬河', 'Bahr el Jebel': '杰贝尔河',
  'Bahr el Zeraf': '泽拉夫河', 'Bamingui': '巴明吉河', 'Barito': '巴里托河', 'Barwon': '巴旺河',
  'Benue': '贝努埃河', 'Benoué': '贝努埃河', 'Bénoué': '贝努埃河', 'Biya': '比亚河',
  'Bío-Bío': '比奥比奥河', 'Borcea': '博尔恰河', 'Braco Menor': '布拉科梅诺尔河', 'Brahmaputra': '布拉马普特拉河',
  'Branco': '布朗库河', 'Bratul Chillia': '基利亚支流', 'Bratul Sfintu Gheorghe': '圣格奥尔基支流',
  'Bratul Sulina': '苏利纳支流', 'Brazos': '布拉索斯河', 'Busira': '布西拉河', 'Caquetá': '卡克塔河',
  'Chari': '沙里河', 'Chattahoochee': '查特胡奇河', 'Chattooga': '查托加河', 'Chenab': '奇纳布河',
  'Chixoy': '奇索伊河', 'Chubut': '丘布特河', 'Chulyshman': '丘雷什曼河', 'Churchill': '丘吉尔河',
  'Coco': '科科河', 'Copper': '库珀河', 'Cubango': '库班戈河', 'Culuene': '库卢埃内河',
  'Dadu': '大渡河', 'Daly': '戴利河', 'Damietta Branch': '达米埃塔支流', 'Desaguadero': '德斯阿瓜德罗河',
  'Dicle': '底格里斯河', 'Digul': '迪古尔河', 'Dihang': '迪汉河', 'Dnepre': '第聂伯河',
  'Double Mountain Fork Brazos': '布拉索斯河', 'Duero': '杜罗河', 'El Bahr el Abyad': '白尼罗河',
  'El Bahr el Azraq': '青尼罗河', 'Ertis': '额尔齐斯河', 'Ertix': '额尔齐斯河', 'Finlay': '芬利河',
  'Fitzroy': '菲茨罗伊河', 'Fraser': '弗雷泽河', 'Genala': '格纳拉河', 'Gharraf Canal': '格拉夫运河',
  'Gila': '希拉河', 'Glomma': '格洛马河', 'Godävari': '戈达瓦里河', 'Göta älv': '约塔河',
  'Great Pee Dee': '大皮迪河', 'Guaporé': '瓜波雷河', 'Hailar': '海拉尔河', 'Heilong Jiang': '黑龙江',
  'Holston': '霍尔斯坦河', 'Hong': '红河', 'Hongshui': '红水河', 'Hudson': '哈德逊河',
  'Ideriyn': '伊德尔河', 'Indaiá': '因达亚河', 'Irrawaddy Delta': '伊洛瓦底江三角洲', 'Ishikari': '石狩川',
  'Ismailiya Canal': '伊斯梅利亚运河', 'Japurá': '雅普拉河', 'Jequitinhonha': '热基蒂尼奥尼亚河',
  'Jinsha': '金沙江', 'Jubba': '朱巴河', 'Juruena': '茹鲁埃纳河', 'Kadéï': '卡代河',
  'Kafue': '卡富埃河', 'Kagera': '卡盖拉河', 'Kamchatka': '堪察加河', 'Kapuas': '卡普阿斯河',
  'Kasai': '卡赛河', 'Katherine': '凯瑟琳河', 'Kayan': '卡扬河', 'Kem': '凯姆河',
  'Kemijoki': '凯米河', 'Khatanga': '哈坦加河', 'Kheta': '赫塔河', 'Kibali': '基巴利河',
  'Klamath': '克拉马斯河', 'Kokemäenjoki': '科凯迈基河', 'Konqi': '孔雀河', 'Koukourou': '库库鲁河',
  'Koyukuk': '科尤库克河', 'Krishna': '克里希纳河', 'Kuskokwim': '卡斯科奎姆河', 'Kwango': '宽果河',
  'Kyzyl-Khem': '克孜勒赫姆河', 'La Grande Rivière': '大河', 'Lancang': '澜沧江', 'Lek': '莱克河',
  'Liao': '辽河', 'Liard': '利亚德河', 'Lom': '洛姆河', 'Lower Tunguska': '下通古斯河',
  'Lualaba': '卢阿拉巴河', 'Madeira': '马德拉河', 'Madison': '麦迪逊河', 'Madre de Dios': '马德雷德迪奥斯河',
  'Mahäna Nadï': '马哈纳河', 'Malyy Yenisey': '小叶尼塞河', 'Mamberamo': '曼伯拉莫河', 'Mamoré': '马莫雷河',
  'Mananantanana': '马纳南塔纳纳河', 'Mangoky': '曼戈基河', 'Maquan': '玛曲', 'Marañón': '马拉尼翁河',
  'Mendoza': '门多萨河', 'Meta': '梅塔河', 'Min': '岷江', 'Mitchell': '米切尔河',
  'Mouhoun': '穆胡恩河', 'N. Fork Kuskokwim': '卡斯科奎姆河北岔', 'Nakanbé': '纳坎贝河', 'Nanpan': '南盘江',
  'Narmada': '讷尔默达河', 'Naryn': '纳伦河', 'Nederrijn': '下莱茵河', 'Negro': '内格罗河',
  'Nelson': '纳尔逊河', 'Neuquén': '内乌肯河', 'Neva': '涅瓦河', 'Niagara': '尼亚加拉河',
  'Nmai': '恩梅河', 'North Saskatchewan': '北萨斯喀彻温河', 'Nu': '怒江', 'Olenekskaya Protoka': '奥列尼奥克河',
  'Olenëk': '奥列尼奥克河', 'Omo': '奥莫河', 'Orange': '奥兰治河', 'Ord': '奥德河',
  'Ottawa': '渥太华河', 'Ouham': '瓦姆河', 'Pamir': '帕米尔河', 'Panama Canal': '巴拿马运河',
  'Panj': '喷赤河', 'Paraiba': '帕拉伊巴河', 'Paranaíba': '巴拉那伊巴河', 'Peace': '皮斯河',
  'Pechora': '伯朝拉河', 'Pend Oreille': '彭德奥雷耶河', 'Pilcomayo': '皮尔科马约河', 'Pit': '皮特河',
  'Porcupine': '豪猪河', 'Potomac': '波托马克河', 'Purari': '普拉里河', 'Purús': '普鲁斯河',
  'Pánuco': '帕努科河', 'Quan': '渠江', 'R. des Outaouais': '渥太华河', 'Rainy': '雷尼河',
  'Rhin': '莱茵河', 'Rio Grande': '格兰德河', 'Rosetta Branch': '罗塞塔支流', 'Ruki': '鲁基河',
  'Rupert': '鲁珀特河', 'Ruvuma': '鲁伍马河', 'Río Grande de Santiago': '圣地亚哥大河',
  'S. Branch Potomac': '波托马克河南岔', 'Sacramento': '萨克拉门托河', 'Saint John': '圣约翰河',
  'Salado': '萨拉多河', 'San Joaquin': '圣华金河', 'San Juan': '圣胡安河', 'Sanaga': '萨纳加河',
  'Sangha': '桑加河', 'Santa Cruz': '圣克鲁斯河', 'Saskatchewan': '萨斯喀彻温河', 'Sassandra': '萨桑德拉河',
  'Savannah': '萨凡纳河', 'Selenge': '色楞格河', 'Semliki': '塞姆利基河', 'Setit': '塞蒂特河',
  'Severnaya Dvina': '北德维纳河', 'Shiquan': '石泉河', 'Shire': '希雷河', 'Shishhid Gol': '希什希德河',
  'Skeena': '斯基纳河', 'Slave': '斯拉维河', 'Snake': '斯内克河', 'Songhua': '松花江',
  'Soroksari Duna': '索罗克萨里河', 'South Saskatchewan': '南萨斯喀彻温河', 'Sprague': '斯普拉格河',
  'St. Clair': '圣克莱尔河', 'St. Lawrence': '圣劳伦斯河', 'Stikine': '斯蒂金河', 'Suez Canal': '苏伊士运河',
  'Sukhona': '苏霍纳河', 'Susitna': '苏西特纳河', 'Sutlej': '萨特莱杰河', 'Svir': '斯维尔河',
  'São Francisco': '圣弗朗西斯科河', 'Sénégal': '塞内加尔河', 'Tapajós': '塔帕若斯河', 'Taritatu': '塔里塔图河',
  'Taz': '塔兹河', 'Tejo': '特茹河', 'Teslin': '特斯林河', 'Thelon': '塞隆河',
  'Tisa': '蒂萨河', 'Tobol': '托博尔河', 'Tocantins': '托坎廷斯河', 'Tom': '托木河',
  'Tongtian': '通天河', 'Trofimovskaya Protoka': '特罗菲莫夫卡河', 'Tshuapa': '楚阿帕河', 'Tugaloo': '图加卢河',
  'Tumatskaya Protoka': '图马茨卡亚河', 'Tuotuo': '沱沱河', 'Ubangi': '乌班吉河', 'Ucayali': '乌卡亚利河',
  'Uele': '韦莱河', 'Uruguay': '乌拉圭河', 'Usumacinta': '乌苏马辛塔河', 'Vaal': '瓦尔河',
  'Verde': '佛得河', 'Verkhniy Yenisey': '上叶尼塞河', 'Victoria Nile': '维多利亚尼罗河', 'Vilyuy': '维柳伊河',
  'Vorma': '沃尔马河', 'Vuoksi': '沃克西河', 'Vychegda': '维切格达河', 'Waal': '瓦尔河',
  'Wabash': '沃巴什河', 'Waikato': '怀卡托河', 'Waitaki': '怀塔基河', 'Weir': '威尔河',
  'Willamette': '威拉米特河', 'Winnipeg': '温尼伯河', 'Xar Moron': '西拉木伦河', 'Xi': '西江',
  'Xiliao': '西辽河', 'Xingu': '欣古河', 'Xun': '浔江', 'Yadkin': '亚德金河',
  'Yamuna': '亚穆纳河',   'Yarkant': '叶尔羌河', 'Yarlung': '雅鲁藏布江', 'Yuan': '沅江',
  'Za': '扎河', 'Tanana': '塔纳诺河', 'Bykovskaya Protoka': '贝科夫斯卡亚支流',
  'Ferenc Csatorna': '费伦茨运河', 'Indragi': '因德拉吉河',
};

export const MOUNTAIN_ZH = {
  // 主要世界山脉（核心）
  'Himalaya': '喜马拉雅山脉', 'Himalayas': '喜马拉雅山脉', 'Alps': '阿尔卑斯山脉',
  'Andes': '安第斯山脉', 'Cordillera': '科迪勒拉山系', 'Rocky Mountains': '落基山脉',
  'Rockies': '落基山脉', 'Appalachian Mountains': '阿巴拉契亚山脉',
  'Appalachians': '阿巴拉契亚山脉', 'Ural Mountains': '乌拉尔山脉', 'Urals': '乌拉尔山脉',
  'Caucasus': '高加索山脉', 'Kunlun': '昆仑山脉', 'Kunlun Shan': '昆仑山脉',
  'Tien Shan': '天山山脉', 'Tian Shan': '天山山脉', 'Tibet': '青藏高原',
  'Qinghai-Xizang Plateau': '青藏高原', 'Tibetan Plateau': '青藏高原',
  'Pamirs': '帕米尔高原', 'Hindu Kush': '兴都库什山脉', 'Atlas Mountains': '阿特拉斯山脉',
  'Atlas': '阿特拉斯山脉', 'Altai': '阿尔泰山脉', 'Altay': '阿尔泰山脉',
  'Pyrenees': '比利牛斯山脉', 'Scandes': '斯堪的纳维亚山脉', 'Scandinavian Mountains': '斯堪的纳维亚山脉',
  'Apennines': '亚平宁山脉', 'Carpathians': '喀尔巴阡山脉', 'Carpathian Mountains': '喀尔巴阡山脉',
  'Great Dividing Range': '大分水岭', 'Drakensberg': '德拉肯斯山脉',
  'Ethiopian Plateau': '埃塞俄比亚高原', 'Iranian Plateau': '伊朗高原',
  'Karakoram': '喀喇昆仑山脉', 'Sayan': '萨彦岭', 'Sayan Mountains': '萨彦岭',
  'Stanovoy': '外兴安岭', 'Stanovoy Range': '外兴安岭', 'Zagros': '扎格罗斯山脉',
  'Zagros Mountains': '扎格罗斯山脉', 'Elburz': '厄尔布尔士山脉', 'Alborz': '厄尔布尔士山脉',
  'Anatolia': '安纳托利亚高原', 'Arabian Peninsula': '阿拉伯半岛高原',
  'Massif Central': '法国中央高原', 'Meseta': '梅塞塔高原', 'Oural': '乌拉尔山脉',
  'Great Rift Valley': '东非大裂谷', 'Ahaggar': '阿哈加尔高原', 'Tibesti': '提贝斯提高原',
  'Sierra Madre': '马德雷山脉', 'Brazilian Highlands': '巴西高原',
  'Guiana Highlands': '圭亚那高原', 'Patagonia': '巴塔哥尼亚高原',
  'Kamchatka': '堪察加半岛', 'Chersky': '切尔斯基山脉', 'Verkhoyansk': '维尔霍扬斯克山脉',
  'Yablonoi': '雅布洛诺夫山脉', 'Khingan': '兴安岭', 'Greater Khingan': '大兴安岭',
  'Shan Plateau': '掸邦高原', 'Deccan': '德干高原', 'Indian Peninsula': '印度半岛',
  'Kilimanjaro': '乞力马扎罗山', 'Kenya': '肯尼亚山', 'Vinson': '文森峰',
  'Elbrus': '厄尔布鲁士山', 'Mont Blanc': '勃朗峰', 'Fuji': '富士山',
  // 亚洲
  'Lesser Caucasus': '小高加索山脉', 'Pontic Mountains': '庞廷山脉', 'Balkan Mountains': '巴尔干山脉',
  'Balkan Mts.': '巴尔干山脉', 'Dinaric Alps': '迪纳拉山脉', 'Taurus Mts.': '托罗斯山脉',
  'Lebanon Mts.': '黎巴嫩山脉', 'Anti Atlas': '反阿特拉斯山脉', 'Haut Atlas': '高阿特拉斯山脉',
  'Atlas Tellien': '泰勒阿特拉斯山脉', 'Moyen Atlas': '中阿特拉斯山脉', 'Atlas Saharien': '撒哈拉阿特拉斯',
  'Aïr Mts.': '艾尔山脉', 'Ahaggar Mountains': '阿哈加尔山脉', 'Tibesti Mts.': '提贝斯提高原',
  'Kopet Dag Mts.': '科佩特山', 'Paropamisus Ra.': '帕罗帕米苏斯山', 'Sulaiman Ra.': '苏莱曼岭',
  'Kirthar Ra.': '吉尔塔尔岭', 'Central Makran': '中部莫克兰', 'Al Hajar Mts.': '哈杰尔山脉',
  'Tuwayq Mts.': '图韦克山脉', 'Hejaz Mts.': '汉志山脉', 'Asir Mts.': '阿西尔山脉',
  'Hadhramaut': '哈德拉毛高原', 'Kuh Rud Mountains': '库鲁德山脉', 'Zagros Mountains': '扎格罗斯山脉',
  'Elburz Mountains': '厄尔布尔士山脉', 'Alborz Mountains': '厄尔布尔士山脉',
  'Karakoram Ra.': '喀喇昆仑山脉', 'Hindu Kush Range': '兴都库什山脉',
  'Pamir': '帕米尔高原', 'Kunlun Mountains': '昆仑山脉', 'Tian Shan Mountains': '天山山脉',
  'Altun Mts.': '阿尔金山脉', 'Qilian Mountains': '祁连山脉', 'Quilian Mountains': '祁连山脉',
  'Nan Ling Mts.': '南岭', 'Taihang Mts.': '太行山脉', 'Lüliang Mts.': '吕梁山脉',
  'Qinling Mountains': '秦岭', 'Dabie Mts.': '大别山脉', 'Wuyi Mts.': '武夷山脉',
  'Yin Mts.': '阴山山脉', 'Lesser Khingan Range': '小兴安岭', 'Greater Khingan Range': '大兴安岭',
  'Sikhote-Alin Range': '锡霍特山脉', 'Sikhote-Alin\' Range': '锡霍特山脉',
  'Khingan Range': '兴安岭', 'Yablonovyy Range': '雅布洛诺夫山脉', 'Stanovoy Upland': '外兴安岭',
  'Eastern Sayan Mts.': '东萨彦岭', 'Western Sayan Mts.': '西萨彦岭', 'Tannu-Ola Ra.': '唐努乌拉岭',
  'Abakanskiy Ra.': '阿巴坎岭', 'Sayan Mountains': '萨彦岭', 'Koryak Range': '科里亚克山脉',
  'Kolyma Range': '科雷马山脉', 'Cherskiy Range': '切尔斯基山脉', 'Chukchi Range': '楚科奇山脉',
  'Suntar-Khayata Range': '孙塔尔哈亚塔山脉', 'Dzhugdzhur Range': '朱格朱尔山脉',
  'Momskiy Mts.': '莫姆斯基山脉', 'Bureinskiy Ra.': '布列亚岭', 'Yam Alin Range': '亚姆阿林岭',
  'Verkhoyansk Range': '维尔霍扬斯克山脉', 'Kara-Tau Range': '卡拉套山脉',
  'Tarbagatay Ra.': '塔尔巴哈台岭', 'Borohoro Mts.': '博罗霍罗山', 'Alataw Mts.': '阿拉套山',
  'Dzungarian Alatau': '准噶尔阿拉套', 'Trans-Altai Gobi': '外阿尔泰戈壁', 'Gobi Altai': '戈壁阿尔泰',
  'Hangayn Mts.': '杭爱山脉', 'Hamgyong Mts.': '咸镜山脉', 'Maoke Mts.': '毛克山脉',
  'Owen Stanley Ra.': '欧文斯坦利岭', 'New Guinea Highlands': '新几内亚高地',
  'MacDonnell Ranges': '麦克唐奈山脉', 'Flinders Ranges': '弗林德斯山脉', 'Blue Mts.': '蓝山',
  'Australian Alps': '澳大利亚阿尔卑斯山脉', 'Darling Range': '达令山脉', 'Hamersley Ra.': '哈默斯利岭',
  'Gregory Ra.': '格雷戈里岭', 'Selwyn Ra.': '塞尔温岭', 'Selwyn Mts.': '塞尔温山脉',
  'Great Victoria Desert': '大维多利亚沙漠', 'Musgrave Ranges': '马斯格雷夫山脉',
  'Western Plateau': '西部高原', 'Aravalli Range': '阿拉瓦利岭', 'Arvalli Ra.': '阿拉瓦利岭',
  'Vindhya Range': '温迪亚山脉', 'Satpura Range': '萨特普拉山脉', 'Western Ghats': '西高止山',
  'Eastern Ghats': '东高止山', 'Southern Ghats': '南高止山', 'Deccan Plateau': '德干高原',
  'Siwalik Hills': '西瓦利克丘陵', 'Naga Hills': '那加丘陵', 'Khasi Hills': '卡西丘陵',
  'Chin Hills': '钦丘陵', 'Arakan Yoma': '若开山脉', 'Shan Hills': '掸邦高原',
  'Dângrêk Ra.': '扁担山脉', 'Dalou Mts.': '达娄山脉', 'Annamite Range': '安南山脉',
  'Chaîne Annamitique': '安南山脉', 'Truong Son': '长山山脉',
  // 欧洲
  'Jura': '汝拉山脉', 'Harz': '哈尔茨山', 'Vosges': '孚日山脉', 'Ardennes': '阿登高原',
  'Sudetes Mts.': '苏台德山脉', 'Erzgebirge': '厄尔士山脉', 'Böhmerwald': '波希米亚林山',
  'Transylvanian Alps': '南喀尔巴阡山脉', 'Tatra Mts.': '塔特拉山脉', 'Pindus Mts.': '品都斯山脉',
  'Calabria': '卡拉布里亚山脉', 'Grampian Mts.': '格兰扁山脉', 'Cambrian Mts.': '坎布里亚山脉',
  'Appennini': '亚平宁山脉', 'Dinaric Alps Range': '迪纳拉山脉',
  'Cordillera Cantábrica': '坎塔布连山脉', 'Sierra Nevada': '内华达山脉', 'Sierra Morena': '莫雷纳山脉',
  'S. Nevada': '内华达山脉', 'Cantabrian Mountains': '坎塔布连山脉',
  'Scandinavian Mountains Range': '斯堪的纳维亚山脉', 'Kjølen Mountains': '基奥伦山脉',
  'Vatnajökull': '瓦特纳冰原', 'Caledonian': '加里东造山带', 'Massif Armoricain': '阿莫里卡丘陵',
  // 非洲
  'Atlas Tellien Range': '泰勒阿特拉斯山脉', 'Middle Atlas': '中阿特拉斯山脉',
  'Sahara Atlas': '撒哈拉阿特拉斯', 'Aïr Mountains': '艾尔山脉', 'Mitumba Mts.': '米通巴山脉',
  'Ruwenzori Range': '鲁文佐里山脉', 'Marrah Mts.': '马拉山脉', 'Ennedi Plat.': '恩内迪高原',
  'Tibesti Mountains': '提贝斯提高原', 'Ahaggar Mountains': '阿哈加尔高原',
  'Hoggar': '阿哈加尔高原', 'Adamawa Plateau': '阿达马瓦高原', 'Jos Plateau': '乔斯高原',
  'Fouta Djallon': '富塔贾隆高原', 'Guinea Highlands': '几内亚高地', 'Ethiopian Highlands': '埃塞俄比亚高地',
  'Libyan Plateau': '利比亚高原', 'Arabian Plateau': '阿拉伯高原', 'Yemen Plateau': '也门高原',
  'Abyssinian Plateau': '阿比西尼亚高原', 'Drakensberg Mountains': '德拉肯斯山脉',
  'Cape Ranges': '开普山脉', 'Sierra Leone Peninsula': '塞拉利昂半岛', 'Loma Mts.': '洛马山脉',
  'Lebombo Mts.': '莱邦博山脉', 'Great Karroo': '大卡鲁高原', 'Northern Karroo': '北卡鲁',
  'Witwatersrand': '威特沃特斯兰德岭', 'Magaliesberg': '马加利斯堡', 'Drakensberg Range': '德拉肯斯山脉',
  // 北美洲
  'Brooks Range': '布鲁克斯山脉', 'Alaska Range': '阿拉斯加山脉', 'Coast Mountains': '海岸山脉',
  'Coast Ranges': '海岸山脉', 'Cascade Range': '喀斯喀特山脉', 'Sierra Nevada Range': '内华达山脉',
  'Sierra Madre Occidental': '西马德雷山脉', 'Sierra Madre Oriental': '东马德雷山脉',
  'Sierra Madre del Sur': '南马德雷山脉', 'Sierra Madre Oriental Range': '东马德雷山脉',
  'Sierra Madre Occidental Range': '西马德雷山脉', 'Sierra Madre del Sur Range': '南马德雷山脉',
  'Mackenzie Mts.': '马更些山脉', 'Rocky Mountain Range': '落基山脉', 'Wasatch Range': '瓦萨奇山脉',
  'Front Range': '弗兰特岭', 'Bitterroot Range': '苦根岭', 'Blue Ridge': '蓝岭',
  'Cascade Mountains': '喀斯喀特山脉', 'Klamath Mts.': '克拉马斯山脉', 'Ouachita Mts.': '沃希托山脉',
  'Ozark Plateau': '欧扎克高原', 'Ozark Highlands': '欧扎克高地', 'Black Hills': '布莱克丘陵',
  'Salmon River Mts.': '萨蒙河山脉', 'Columbia Mts.': '哥伦比亚山脉', 'Cassiar Mts.': '卡西亚山脉',
  'Caribou Mts.': '驯鹿山脉', 'Ogilvie Mts.': '奥吉尔维山脉', 'Wrangell Mts.': '兰格尔山脉',
  'Chugach Mts.': '楚加奇山脉', 'Torngat Mts.': '托恩盖特山脉', 'Birch Mts.': '伯奇山脉',
  'Mogollon Rim': '莫戈隆边缘', 'Edwards Plateau': '爱德华兹高原', 'Colorado Plateau': '科罗拉多高原',
  'Columbia Plat.': '哥伦比亚高原', 'Fraser Plateau': '弗雷泽高原', 'Yukon Plateau': '育空高原',
  'Superior Upland': '苏必利尔高地', 'Laurentian Upland': '劳伦高地', 'Adirondack': '阿迪朗达克山',
  'Appalachian Mts.': '阿巴拉契亚山脉', 'Cumberland Plat.': '坎伯兰高原',
  // 南美洲
  'Sierra de Perijá': '佩里哈山脉', 'Cordillera Occidental': '西科迪勒拉',
  'Cordillera Oriental': '东科迪勒拉', 'Cordillera Central': '中科迪勒拉',
  'Cordillera Real': '皇家科迪勒拉', 'Cord. Occidental': '西科迪勒拉',
  'Cord. Oriental': '东科迪勒拉', 'Cord. Central': '中科迪勒拉',
  'Cord. de Mérida': '梅里达山脉', 'Andes Mountains': '安第斯山脉',
  'Serra do Mar': '滨海山脉', 'Serra Geral': '热拉尔山脉', 'Serra da Mantiqueira': '曼蒂凯拉山脉',
  'Serra do Espinhaço': '埃斯皮尼亚索山脉', 'Serra de Pakaraima': '帕卡赖马山脉',
  'Serra da Ibiapaba': '伊比亚巴山脉', 'Serra Acaraí': '阿卡赖山脉', 'Serra de Curupira': '库鲁皮拉山脉',
  'Tumuc-Humac Mts.': '图穆库马克山脉', 'Wilhelmina Gebergte': '威廉明娜山脉',
  'Cuchilla Grande': '大库奇利亚', 'Brazilian Highlands Range': '巴西高原',
  'Guiana Highlands Range': '圭亚那高原', 'Patagonia Plateau': '巴塔哥尼亚高原',
  'Sierras Pampeanas': '潘佩阿纳斯山脉', 'Piedmont': '皮埃蒙特', 'Yungas': '永加斯',
  'Planalto Central': '巴西中央高原', 'Planalto da Borborema': '博博雷马高原',
  'Chapada do Araripe': '阿拉里皮高原', 'Serra do Espinhaço Range': '埃斯皮尼亚索山脉',
  // 大洋洲 / 南极
  'Southern Alps': '南阿尔卑斯山脉', 'N.I. Volcanic Plateau': '北岛火山高原',
  'Transantarctic Mountains': '横贯南极山脉', 'Ellsworth Mountains': '埃尔斯沃思山脉',
  'Queen Maude Mountains': '毛德王后山脉', 'Prince Charles Mountains': '查尔斯王子山脉',
  'Pensacola Mountains': '彭萨科拉山脉', 'Executive Committee Range': '行政委员会山脉',
  'Admiralty Mountains': '海军部山脉', 'Queen Alexandra Range': '亚历山德拉王后山脉',
  'Prince Albert Mountains': '阿尔伯特王子山脉', 'Scott Mountains': '斯科特山脉',
  'Shackleton Range': '沙克尔顿山脉', 'Ford Ranges': '福特山脉', 'Jones Mountains': '琼斯山脉',
  'Napier Mountains': '纳皮尔山脉', 'Flood Range': '弗勒德山脉',
  'Hollick-Kenyon Plateau': '霍利克-凯尼恩高原', 'Rockefeller Plateau': '洛克菲勒高原',
  'Polar Plateau': '极地高原', 'American Highland': '美国高地',
  // 俄罗斯/西伯利亚高原
  'Central Siberian Plateau': '中西伯利亚高原', 'Mongolian Plateau': '蒙古高原',
  'Putorana Plateau': '普托拉纳高原', 'Aldan Upland': '阿尔丹高地', 'Lena-Aldan Plateau': '勒拿-阿尔丹高原',
  'Central Russian Upland': '中俄高地', 'Volga Upland': '伏尔加高地', 'Dnieper Upland': '第聂伯高地',
  'Azov Upland': '亚速高地', 'Stavropol Plateau': '斯塔夫罗波尔高原',
  'Okhotsk-Kolyma Upland': '鄂霍次克-科雷马高地', 'Kazakh Upland': '哈萨克高地',
  'Ustyurt Plateau': '乌斯秋尔特高原', 'Loess Plateau': '黄土高原', 'Yungui Plateau': '云贵高原',
  'Khorat Plat.': '呵叻高原', 'Altiplanicie Mexicana': '墨西哥高原', 'Altiplano': '阿尔蒂普拉诺高原',
  'Katanga Plateau': '加丹加高原', 'Bié Plateau': '比耶高原', 'Huíla Plateau': '威拉高原',
  'Chota Nagpur Plateau': '乔塔那格浦尔高原', 'Deccan Plateau Range': '德干高原',
  'Kimberley Plateau': '金伯利高原', 'Buckland Tableland': '巴克兰台地',
  'Atherton Tableland': '阿瑟顿台地', 'Barkly Tableland': '巴克利台地', 'Plat. du Tademaït': '塔德迈特高原',
  'Jilf al Kabir Plateau': '大吉勒夫高原', 'Jabal al Abyad Plateau': '白色高原',
  'Tagant': '塔甘特高原', 'Hadramaut Plateau': '哈德拉毛高原', 'Arabian Shield': '阿拉伯地盾',
  'Guiana Shield': '圭亚那地盾', 'Selvas': '塞尔瓦斯', 'Planalto do Mato Grosso': '马托格罗索高原',
  'Central Highlands': '中部高地', 'Hardanger-vidda': '哈当厄高原', 'Finnmarks-vidda': '芬马克高原',
  'Tibet Plateau': '青藏高原', 'Plateau of Tibet': '青藏高原', 'Tibetan Plateau Range': '青藏高原',
  'Himalaya Mountains': '喜马拉雅山脉', 'Andes Range': '安第斯山脉', 'Alps Mountains': '阿尔卑斯山脉',
  // 漏网补译（Natural Earth 特殊拼写 / 缩写 / 大写 / S.(Serra) 前缀）
  'Alti-Planicie Mexicana': '墨西哥高原', 'Península Ibérica': '伊比利亚半岛',
  'Ahmar Mts.': '阿赫马尔山脉', 'Al Haruj al Aswad': '哈鲁杰火山高原', 'Al Jabal al Akhdar': '绿山',
  'Barisan Mountains': '巴里桑山脉', 'Crystal Mountains': '水晶山脉', 'Campos Sertao': '塞尔唐草原',
  'Central Bruhui Range': '中央布鲁赫山脉', 'Chaine des Mongos': '蒙戈山脉', 'Cord. Cantábrica': '坎塔布连山脉',
  'Dome A': '阿古斯穹丘', 'Dome A (Argus)': '阿古斯穹丘', 'Dome C': '查理穹丘', 'Dome C (Charlie)': '查理穹丘',
  'Dome F': '富士穹丘', 'Dome F (Fuji)': '富士穹丘', 'Er Rif': '里夫山脉', 'Groot Karasberge': '大卡拉斯山脉',
  'Hentiyn Mts.': '亨蒂山脉', 'Horn Plat.': '合恩高原', 'Inyanga Mts.': '伊尼扬加山脉',
  'Jabal bin Ghunaymah': '本古奈迈山', 'Karatau': '卡拉套山脉', 'Karatau Range': '卡拉套山脉',
  'Khomas Highland': '霍马斯高地', 'Maya Mts.': '玛雅山脉', 'Mbang Mts.': '姆班山脉',
  'Muchinga Mts.': '穆钦加山脉', 'Ogo Mts.': '奥戈山脉', 'S. Dourada': '杜拉达山脉',
  'S. de Pakaraima': '帕卡赖马山脉', 'S. do Cachimbo': '卡钦博山脉', 'S. do Piaui': '皮奥伊山脉',
  'S. dos Gradaús': '格拉道斯山脉', 'Sredinnyy': '中堪察加山脉', 'Sredinnyy Range': '中堪察加山脉',
  'Salt Ra.': '盐岭', 'Salt Range': '盐岭', 'Sierra Chiapas': '恰帕斯山脉', 'Talos Dome': '塔洛斯穹丘',
};

// 归一化（与生成脚本一致）：小写、去音标、去标点、压空格
function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// historical-basemaps 的历史政权译名（1886 年前的世界疆域）。
// COUNTRY_ZH 是按 CShapes 现代国名生成的，缺少 Han Empire / Great Khanate 这类古代政权，
// 故单独维护一张常用表；未收录的仍回退英文原名。
const HB_ZH = {
  // 中国
  'Han': '汉', 'Han Empire': '汉（汉朝）', 'Han Zhao': '汉赵（前赵）',
  'Tang Empire': '唐（唐朝）', 'Song Empire': '宋（宋朝）',
  'Ming Empire': '明（明朝）', 'Ming Chinese Empire': '明（明朝）', 'Post-Ming Warlords': '南明政权',
  'Manchu Empire': '清（清朝）', 'Qing Empire': '清（清朝）', 'Manchuria': '满洲（中国东北）',
  'Great Khanate': '元（大汗国）', 'Mongol Empire': '蒙古帝国', 'Mongols': '蒙古',
  'Chagatai Khanate': '察合台汗国', 'Ilkhanate': '伊儿汗国',
  'Khanate of the Golden Horde': '金帐汗国', 'Khanate of Sibir': '西伯利亚汗国',
  'Crimean Khanate': '克里米亚汗国', 'Kazan Khanate': '喀山汗国', 'Astrakhan Khanate': '阿斯特拉罕汗国',
  'Khiva Khanate': '希瓦汗国', 'Bukara Khanate': '布哈拉汗国', 'Quazaq Khanate': '哈萨克汗国',
  'Khanate of Kazan': '喀山汗国', 'central Asian khanates': '中亚诸汗国', 'Bokhara Khanate': '布哈拉汗国',
  'Tibet': '吐蕃 / 西藏', 'Tibetan Empire': '吐蕃', 'Tibetans': '吐蕃',
  'Xixia': '西夏', 'Liao': '辽', 'Jin': '金', 'Jin Empire': '金',
  'Xia': '夏', 'Zhangzhung Kingdom': '象雄',
  // 亚洲其他
  'Japan': '日本', 'Korea': '朝鲜', 'Goryeo': '高丽', 'Joseon': '朝鲜',
  'Ryukyu': '琉球', 'Dai Viet': '大越', 'Champa': '占城', 'Khmer Empire': '高棉帝国（吴哥）',
  'Ayutthaya': '阿瑜陀耶', 'Sukhothai': '素可泰', 'Pagan': '蒲甘', 'Srivijaya': '三佛齐',
  'Kushan Empire': '贵霜帝国', 'Kushan Principalities': '贵霜诸公国',
  'Maurya': '孔雀王朝', 'Gupta': '笈多王朝', 'Satavahanihara': '百乘王朝',
  'Chola': '朱罗王朝', 'Chandellas': '昌德拉王朝', 'Chauhans': '乔汉王朝',
  'Vijayanagara': '毗奢耶那伽罗', 'Delhi Sultanate': '德里苏丹国',
  'Mughal Empire': '莫卧儿帝国', 'Timurid Empire': '帖木儿帝国',
  'Persia': '波斯', 'Achaemenid Empire': '波斯（阿契美尼德）', 'Sassanian Empire': '萨珊波斯',
  'Parthian Empire': '帕提亚（安息）', 'Seljuk': '塞尔柱',
  'Abbasid Caliphate': '阿拔斯王朝', 'Umayyad Caliphate': '倭马亚王朝',
  'Rashidun Caliphate': '正统哈里发国', 'Fatimid Caliphate': '法蒂玛王朝',
  'Mamluk Sultanate': '马穆鲁克苏丹国', 'Safavid Empire': '萨法维（波斯）',
  'Ottoman Empire': '奥斯曼帝国', 'Turkey (Ottoman Empire)': '奥斯曼帝国',
  // 欧洲
  'Roman Empire': '罗马帝国', 'Byzantine Empire': '拜占庭帝国', 'Eastern Roman Empire': '拜占庭帝国',
  'Holy Roman Empire': '神圣罗马帝国', 'Franks': '法兰克', 'Frankish Empire': '法兰克帝国',
  'Kievan Rus': '基辅罗斯', 'Novgorod': '诺夫哥罗德', 'Muscovy': '莫斯科公国',
  'Bulgaria': '保加利亚', 'Bulgar Khanate': '保加利亚汗国',
  'Cuman Khanates': '库曼汗国', 'Khanty': '汉特', 'Hanover': '汉诺威',
  'Vikings': '维京', 'Norse': '诺斯（维京）',
  // 非洲 / 美洲 / 其他
  'Ghana': '加纳帝国', 'Empire of Ghana': '加纳帝国',
  'Mali Empire': '马里帝国', 'Songhai': '桑海帝国', 'Kanem': '卡涅姆',
  'Aksum': '阿克苏姆', 'Ethiopia': '埃塞俄比亚',
  'Aztec Empire': '阿兹特克帝国', 'Inca Empire': '印加帝国', 'Maya': '玛雅',
  'Cahokia': '卡霍基亚', 'Anasazi': '阿纳萨齐', 'Mississippian culture': '密西西比文化',
  'Cochin China': '交趾支那（越南南部）', 'French Indochina': '法属印度支那',
};

// 供 deck.gl TextLayer 的 characterSet 使用：历史政权译名里的汉字也要包含，
// 否则 1886 年前的世界标签会出现缺字形（空白方块）。
export const HB_ZH_VALUES = Object.values(HB_ZH);

// 取中文译名，未收录则回退原名。依次尝试：历史政权表 → 原名 → 去括号 → 括号前主名
export function zhCountry(en) {
  if (!en) return en;
  const hb = HB_ZH[en];
  if (hb) return hb;
  return (
    COUNTRY_ZH[norm(en)] ||
    COUNTRY_ZH[norm(en.replace(/\s*\(.*\)\s*$/, ''))] ||
    COUNTRY_ZH[norm(en.split(/[,(]/)[0])] ||
    null
  );
}

// 山脉/河流译名匹配：数据里的名称常带 Mountains/Mts./Range/Plateau 等后缀或变体
// （如 "Kunlun Mountains"、"Caucasus Mts."、"Dnipro"），而译名表只存主名。
// 用归一化索引 + 去后缀 + 首词三级匹配，最大化命中率。
const SUFFIX_RE = /\b(mountains?|mounts?|mts?\.?|range|ranges?|ra\.?|ridge|plateau|plateaux|plat\.?|upland|highlands?|hills?|massif|gebirge|gebergte|shield|sierra|serra|cordillera|cord\.?|montes|montagna|gebirgszug|chain|chaîne)\b/gi;
let _zhIndexCache = new WeakMap();
function zhIndex(mapObj) {
  let idx = _zhIndexCache.get(mapObj);
  if (!idx) {
    idx = new Map();
    for (const k in mapObj) idx.set(norm(k), mapObj[k]);
    _zhIndexCache.set(mapObj, idx);
  }
  return idx;
}
export function zh(mapObj, en) {
  if (!en) return en;
  if (mapObj[en]) return mapObj[en]; // 精确
  const idx = zhIndex(mapObj);
  const n = norm(en);
  if (idx.has(n)) return idx.get(n); // 归一化精确
  const stripped = en.replace(SUFFIX_RE, ' ').replace(/\s+/g, ' ').trim();
  const ns = norm(stripped);
  if (ns && idx.has(ns)) return idx.get(ns); // 去后缀
  const fw = n.split(' ')[0];
  if (fw && idx.has(fw)) return idx.get(fw); // 首词兜底
  return en;
}

// 中英并列展示名：有中文则「中文（English）」，否则原样
export function bilingual(zhName, en) {
  return zhName && zhName !== en ? `${zhName}（${en}）` : en;
}
