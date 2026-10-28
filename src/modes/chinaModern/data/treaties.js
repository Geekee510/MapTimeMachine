// 条约 / 通商口岸 / 租界 / 势力范围（1842–1999，口岸与租借地各有止年）
// =============================================================================
// 这四类是近代史独有的图层，古代史模式没有对应物。
//
// 数据来源与精度说明：
//   条约年份与主要条款取学界通行表述；口岸开辟年份取条约签订年（实际开埠可能晚 1–2 年）；
//   租界面积为常见口径，不同史料相差较大，只作量级参考，故不列出。
//   口岸点自带经纬度（数量多且多为小城镇，不并入 places.js，避免主表膨胀）。
// =============================================================================

// ── 条约 ────────────────────────────────────────────────────────────────
export const TREATIES = [
  { id: 'nanjing-1842', name: '《南京条约》', year: 1842, placeId: 'nanjing', with: '英国',
    terms: ['割香港岛', '赔款 2100 万银元', '开广州、厦门、福州、宁波、上海五口', '协定关税', '废除公行'],
    effect: '中国近代第一个不平等条约，条约体系由此建立' },
  { id: 'humen-1843', name: '《虎门条约》', year: 1843, placeId: 'humen', with: '英国',
    terms: ['领事裁判权', '片面最惠国待遇', '租地建屋永租权'],
    effect: '把"不平等"从赔款割地扩展到司法与最惠国条款' },
  { id: 'wangxia-1844', name: '《望厦条约》', year: 1844, placeId: 'macau', with: '美国',
    terms: ['扩大领事裁判权', '兵船可入通商口岸', '12 年后可修约'],
    effect: '其他列强援例取得同等特权' },
  { id: 'huangpu-1844', name: '《黄埔条约》', year: 1844, placeId: 'guangzhou', with: '法国',
    terms: ['取得同上特权', '可在通商口岸建教堂'],
    effect: '传教权自此成为条约权利' },
  { id: 'ailing-1858', name: '《瑷珲条约》', year: 1858, placeId: 'blagoveshchensk', with: '俄国',
    terms: ['割黑龙江以北 60 余万平方公里', '乌苏里江以东共管'],
    effect: '沙俄割占中国领土的开端' },
  { id: 'tianjin-1858', name: '《天津条约》', year: 1858, placeId: 'tianjin', with: '英、法、美、俄',
    terms: ['增开十处口岸', '公使驻京', '外国人可入内地游历传教', '赔款 600 万两'],
    effect: '列强势力由沿海深入内地' },
  { id: 'beijing-1860', name: '《北京条约》', year: 1860, placeId: 'beijing', with: '英、法、俄',
    terms: ['割九龙司', '开天津', '赔款增至 800 万两', '准许华工出国'],
    effect: '《天津条约》全部兑现，圆明园被焚' },
  { id: 'xibei-1864', name: '《勘分西北界约记》', year: 1864, placeId: 'tacheng', with: '俄国',
    terms: ['割巴尔喀什湖以东以南 44 万平方公里'],
    effect: '西北边界大幅内移' },
  { id: 'yili-1881', name: '《伊犁条约》', year: 1881, placeId: 'yili', with: '俄国',
    terms: ['收回伊犁大部', '割霍尔果斯河以西', '赔款 900 万卢布', '俄商在新疆贸易暂不纳税'],
    effect: '曾纪泽谈判争回部分权益，但仍失地赔款' },
  { id: 'zhongfa-1885', name: '《中法新约》', year: 1885, placeId: 'tianjin', with: '法国',
    terms: ['承认法国对越南的保护权', '开云南、广西两处通商'],
    effect: '清廷"不败而败"，西南门户开放' },
  { id: 'shimonoseki-1895', name: '《马关条约》', year: 1895, placeId: 'shimonoseki', with: '日本',
    terms: ['割台湾、澎湖、辽东（后赎回）', '赔款 2 亿两', '开沙市、重庆、苏州、杭州', '允许在华设厂'],
    effect: '割地赔款规模空前，设厂权开启资本输出' },
  { id: 'elu-1896', name: '《中俄密约》', year: 1896, placeId: 'moscow', with: '俄国',
    terms: ['允俄修筑中东铁路', '开放松花江航行'],
    effect: '俄国势力深入满洲，为日俄战争埋因' },
  { id: 'jiaozhou-1898', name: '《胶澳租界条约》', year: 1898, placeId: 'qingdao', with: '德国',
    terms: ['租借胶州湾 99 年', '修筑胶济铁路', '山东路矿优先权'],
    effect: '德国以山东为势力范围' },
  { id: 'lvda-1898', name: '《旅大租地条约》', year: 1898, placeId: 'lvshun', with: '俄国',
    terms: ['租借旅顺、大连 25 年', '修筑南满铁路'],
    effect: '俄国控制辽东半岛' },
  { id: 'xinjie-1898', name: '《展拓香港界址专条》', year: 1898, placeId: 'hongkong', with: '英国',
    terms: ['租借新界及附近岛屿 99 年'],
    effect: '香港殖民地范围定型' },
  { id: 'xinchou-1901', name: '《辛丑条约》', year: 1901, placeId: 'beijing', with: '十一国',
    terms: ['赔款 4.5 亿两（本息约 9.8 亿两）', '划使馆界驻兵', '拆大沽炮台', '禁止军火进口两年'],
    effect: '中国半殖民地化程度最深的一份条约' },
  { id: 'minsi-1915', name: '中日"民四条约"', year: 1915, placeId: 'beijing', with: '日本',
    terms: ['承认日本继承德国在山东权益', '南满、东蒙特权', '汉冶萍公司合办'],
    effect: '二十一条交涉的结果，5 月 9 日被定为国耻日' },
  { id: 'jiuguo-1922', name: '《九国公约》', year: 1922, placeId: 'washington', with: '美、英、日等九国',
    terms: ['尊重中国主权与领土完整', '门户开放、机会均等'],
    effect: '中国回到列强共同支配的局面，日本独吞中国的企图受挫' },
  { id: 'zhongsu-1945', name: '《中苏友好同盟条约》', year: 1945, placeId: 'moscow', with: '苏联',
    terms: ['承认外蒙古现状（独立）', '共管中长铁路', '旅顺为共用海军基地'],
    effect: '以雅尔塔密约为蓝本，损害中国主权' },
];

// ── 通商口岸（type：'约开' = 条约强开，'自开' = 中国政府自开，'租借' = 租借地口岸）──
// to = 该口岸作为"这一类口岸"的终止年（含该年）：
//   1949 —— 约开/自开口岸制度随中华人民共和国成立（废除帝国主义在华特权）而终结；
//            1949 年后的口岸已归入新的对外贸易体系，不再是半殖民地性质的"约开"；
//   1895 —— 台南、淡水随《马关条约》割让离开中国口岸体系（1895–1945 为日本口岸）；
//   其余 —— 租借地按实际收回/回归年：青岛 1922、威海卫 1930、旅大 1945、广州湾 1945、
//            香港 1997、澳门 1999（后两者在 1950 年仍是殖民地，图上继续显示）。
// 1949 年之后约开口岸已不存在：1943 年《中美新约》《中英新约》废除领事裁判权等主要条约
// 特权，租界此前已陆续收回（汉口、九江 1927，镇江 1929，厦门 1930，上海 1943 交还、
// 天津 1945–1947）；1949 年新中国"打扫干净屋子再请客"，条约口岸制度自此终结。
export const PORTS = [
  // 1842 五口
  { name: '广州', lng: 113.26, lat: 23.13, prov: '广东', opened: 1842, type: '约开', to: 1949 },
  { name: '厦门', lng: 118.09, lat: 24.48, prov: '福建', opened: 1842, type: '约开', to: 1949 },
  { name: '福州', lng: 119.30, lat: 26.08, prov: '福建', opened: 1842, type: '约开', to: 1949 },
  { name: '宁波', lng: 121.55, lat: 29.87, prov: '浙江', opened: 1842, type: '约开', to: 1949 },
  { name: '上海', lng: 121.47, lat: 31.23, prov: '上海', opened: 1842, type: '约开', to: 1949 },
  // 1858《天津条约》十口
  { name: '牛庄（营口）', lng: 122.23, lat: 40.67, prov: '辽宁', opened: 1858, type: '约开', to: 1949 },
  { name: '登州（烟台）', lng: 121.45, lat: 37.46, prov: '山东', opened: 1858, type: '约开', to: 1949 },
  { name: '台湾（台南）', lng: 120.21, lat: 22.99, prov: '台湾', opened: 1858, type: '约开', to: 1895 },
  { name: '淡水', lng: 121.44, lat: 25.17, prov: '台湾', opened: 1858, type: '约开', to: 1895 },
  { name: '潮州（汕头）', lng: 116.68, lat: 23.35, prov: '广东', opened: 1858, type: '约开', to: 1949 },
  { name: '琼州（海口）', lng: 110.33, lat: 20.03, prov: '海南', opened: 1858, type: '约开', to: 1949 },
  { name: '汉口', lng: 114.28, lat: 30.62, prov: '湖北', opened: 1858, type: '约开', to: 1949 },
  { name: '九江', lng: 115.99, lat: 29.71, prov: '江西', opened: 1858, type: '约开', to: 1949 },
  { name: '南京', lng: 118.80, lat: 32.06, prov: '江苏', opened: 1858, type: '约开', to: 1949 },
  { name: '镇江', lng: 119.45, lat: 32.20, prov: '江苏', opened: 1858, type: '约开', to: 1949 },
  // 1860《北京条约》
  { name: '天津', lng: 117.20, lat: 39.13, prov: '天津', opened: 1860, type: '约开', to: 1949 },
  { name: '大沽', lng: 117.70, lat: 38.98, prov: '天津', opened: 1860, type: '约开', to: 1949 },
  // 1876《烟台条约》
  { name: '宜昌', lng: 111.29, lat: 30.69, prov: '湖北', opened: 1876, type: '约开', to: 1949 },
  { name: '芜湖', lng: 118.38, lat: 31.33, prov: '安徽', opened: 1876, type: '约开', to: 1949 },
  { name: '温州', lng: 120.70, lat: 28.00, prov: '浙江', opened: 1876, type: '约开', to: 1949 },
  { name: '北海', lng: 109.12, lat: 21.48, prov: '广西', opened: 1876, type: '约开', to: 1949 },
  // 1881《伊犁条约》
  { name: '嘉峪关', lng: 98.29, lat: 39.77, prov: '甘肃', opened: 1881, type: '约开', to: 1949 },
  { name: '吐鲁番', lng: 89.19, lat: 42.95, prov: '新疆', opened: 1881, type: '约开', to: 1949 },
  { name: '哈密', lng: 93.51, lat: 42.83, prov: '新疆', opened: 1881, type: '约开', to: 1949 },
  { name: '乌鲁木齐', lng: 87.62, lat: 43.82, prov: '新疆', opened: 1881, type: '约开', to: 1949 },
  // 1890 中英《藏印条约》
  { name: '亚东', lng: 88.93, lat: 27.48, prov: '西藏', opened: 1890, type: '约开', to: 1949 },
  // 1895《马关条约》四口
  { name: '沙市', lng: 112.24, lat: 30.31, prov: '湖北', opened: 1895, type: '约开', to: 1949 },
  { name: '重庆', lng: 106.55, lat: 29.56, prov: '重庆', opened: 1895, type: '约开', to: 1949 },
  { name: '苏州', lng: 120.58, lat: 31.30, prov: '江苏', opened: 1895, type: '约开', to: 1949 },
  { name: '杭州', lng: 120.16, lat: 30.27, prov: '浙江', opened: 1895, type: '约开', to: 1949 },
  // 1898 之后各国续索
  { name: '吴淞', lng: 121.50, lat: 31.40, prov: '上海', opened: 1898, type: '约开', to: 1949 },
  { name: '秦皇岛', lng: 119.60, lat: 39.94, prov: '河北', opened: 1898, type: '自开', to: 1949 },
  { name: '安东', lng: 124.38, lat: 40.13, prov: '辽宁', opened: 1903, type: '约开', to: 1949 },
  { name: '奉天', lng: 123.43, lat: 41.80, prov: '辽宁', opened: 1903, type: '约开', to: 1949 },
  { name: '长沙', lng: 112.94, lat: 28.23, prov: '湖南', opened: 1902, type: '约开', to: 1949 },
  { name: '万县', lng: 108.40, lat: 30.81, prov: '重庆', opened: 1902, type: '约开', to: 1949 },
  { name: '安庆', lng: 117.06, lat: 30.53, prov: '安徽', opened: 1902, type: '约开', to: 1949 },
  { name: '惠州', lng: 114.41, lat: 23.11, prov: '广东', opened: 1902, type: '约开', to: 1949 },
  { name: '江门', lng: 113.08, lat: 22.58, prov: '广东', opened: 1902, type: '约开', to: 1949 },
  { name: '南宁', lng: 108.32, lat: 22.82, prov: '广西', opened: 1907, type: '自开', to: 1949 },
  { name: '梧州', lng: 111.28, lat: 23.48, prov: '广西', opened: 1897, type: '约开', to: 1949 },
  { name: '三水', lng: 112.90, lat: 23.17, prov: '广东', opened: 1897, type: '约开', to: 1949 },
  { name: '昆明', lng: 102.83, lat: 24.88, prov: '云南', opened: 1905, type: '自开', to: 1949 },
  { name: '济南', lng: 117.00, lat: 36.65, prov: '山东', opened: 1904, type: '自开', to: 1949 },
  { name: '潍县', lng: 119.10, lat: 36.71, prov: '山东', opened: 1904, type: '自开', to: 1949 },
  { name: '周村', lng: 117.85, lat: 36.80, prov: '山东', opened: 1904, type: '自开', to: 1949 },
  { name: '无锡', lng: 120.30, lat: 31.57, prov: '江苏', opened: 1896, type: '自开', to: 1949 },
  { name: '海州', lng: 119.16, lat: 34.60, prov: '江苏', opened: 1921, type: '自开', to: 1949 },
  { name: '浦口', lng: 118.72, lat: 32.09, prov: '江苏', opened: 1912, type: '自开', to: 1949 },
  { name: '郑州', lng: 113.62, lat: 34.75, prov: '河南', opened: 1922, type: '自开', to: 1949 },
  { name: '张家口', lng: 114.89, lat: 40.77, prov: '河北', opened: 1922, type: '自开', to: 1949 },
  { name: '归绥', lng: 111.75, lat: 40.84, prov: '内蒙古', opened: 1921, type: '自开', to: 1949 },
  { name: '包头', lng: 109.84, lat: 40.66, prov: '内蒙古', opened: 1923, type: '自开', to: 1949 },
  { name: '青岛', lng: 120.38, lat: 36.07, prov: '山东', opened: 1898, type: '租借', to: 1922 },
  { name: '大连', lng: 121.61, lat: 38.91, prov: '辽宁', opened: 1898, type: '租借', to: 1945 },
  { name: '旅顺', lng: 121.26, lat: 38.81, prov: '辽宁', opened: 1898, type: '租借', to: 1945 },
  { name: '威海卫', lng: 122.12, lat: 37.51, prov: '山东', opened: 1898, type: '租借', to: 1930 },
  { name: '广州湾（湛江）', lng: 110.36, lat: 21.27, prov: '广东', opened: 1899, type: '租借', to: 1945 },
  { name: '香港', lng: 114.17, lat: 22.32, prov: '香港', opened: 1841, type: '租借', to: 1997 },
  { name: '澳门', lng: 113.55, lat: 22.20, prov: '澳门', opened: 1849, type: '租借', to: 1999 },
];

// ── 租界与租借地 ────────────────────────────────────────────────────────
// kind：'public' 公共租界 | 'national' 专管租界 | 'leased' 租借地 | 'colony' 殖民地
export const CONCESSIONS = [
  { id: 'sh-public', name: '上海公共租界', city: '上海', lng: 121.47, lat: 31.24, country: '英美', from: 1863, to: 1941, kind: 'public',
    note: '英美租界 1863 年合并，1941 年日军进占，1943 年名义交还' },
  { id: 'sh-fr', name: '上海法租界', city: '上海', lng: 121.46, lat: 31.22, country: '法国', from: 1849, to: 1943, kind: 'national' },
  { id: 'gz-shameen', name: '广州沙面租界', city: '广州', lng: 113.24, lat: 23.11, country: '英、法', from: 1859, to: 1945, kind: 'national' },
  { id: 'tj-british', name: '天津英租界', city: '天津', lng: 117.21, lat: 39.12, country: '英国', from: 1860, to: 1945, kind: 'national' },
  { id: 'tj-fr', name: '天津法租界', city: '天津', lng: 117.20, lat: 39.13, country: '法国', from: 1861, to: 1945, kind: 'national' },
  { id: 'tj-jp', name: '天津日租界', city: '天津', lng: 117.19, lat: 39.14, country: '日本', from: 1898, to: 1945, kind: 'national' },
  { id: 'tj-de', name: '天津德租界', city: '天津', lng: 117.22, lat: 39.10, country: '德国', from: 1895, to: 1917, kind: 'national' },
  { id: 'tj-ru', name: '天津俄租界', city: '天津', lng: 117.23, lat: 39.13, country: '俄国', from: 1900, to: 1924, kind: 'national' },
  { id: 'tj-it', name: '天津意租界', city: '天津', lng: 117.19, lat: 39.15, country: '意大利', from: 1902, to: 1945, kind: 'national' },
  { id: 'tj-ah', name: '天津奥租界', city: '天津', lng: 117.20, lat: 39.16, country: '奥匈', from: 1902, to: 1917, kind: 'national' },
  { id: 'tj-be', name: '天津比租界', city: '天津', lng: 117.24, lat: 39.11, country: '比利时', from: 1902, to: 1931, kind: 'national' },
  { id: 'hk-british', name: '汉口英租界', city: '武汉', lng: 114.29, lat: 30.59, country: '英国', from: 1861, to: 1927, kind: 'national',
    note: '1927 年汉口人民收回，是近代收回租界的标志性事件' },
  { id: 'hk-de', name: '汉口德租界', city: '武汉', lng: 114.30, lat: 30.60, country: '德国', from: 1895, to: 1917, kind: 'national' },
  { id: 'hk-ru', name: '汉口俄租界', city: '武汉', lng: 114.31, lat: 30.61, country: '俄国', from: 1896, to: 1924, kind: 'national' },
  { id: 'hk-fr', name: '汉口法租界', city: '武汉', lng: 114.28, lat: 30.58, country: '法国', from: 1896, to: 1945, kind: 'national' },
  { id: 'hk-jp', name: '汉口日租界', city: '武汉', lng: 114.32, lat: 30.60, country: '日本', from: 1898, to: 1937, kind: 'national' },
  { id: 'jj-british', name: '九江英租界', city: '九江', lng: 115.99, lat: 29.72, country: '英国', from: 1861, to: 1927, kind: 'national' },
  { id: 'zj-british', name: '镇江英租界', city: '镇江', lng: 119.45, lat: 32.21, country: '英国', from: 1861, to: 1929, kind: 'national' },
  { id: 'xm-british', name: '厦门英租界', city: '厦门', lng: 118.08, lat: 24.47, country: '英国', from: 1862, to: 1930, kind: 'national' },
  { id: 'xm-gulangyu', name: '鼓浪屿公共地界', city: '厦门', lng: 118.07, lat: 24.45, country: '多国', from: 1902, to: 1945, kind: 'public' },
  { id: 'wh-british', name: '芜湖英租界', city: '芜湖', lng: 118.38, lat: 31.34, country: '英国', from: 1877, to: 1945, kind: 'national' },
  { id: 'cq-jp', name: '重庆日租界', city: '重庆', lng: 106.55, lat: 29.57, country: '日本', from: 1901, to: 1945, kind: 'national' },
  { id: 'hz-jp', name: '杭州日租界', city: '杭州', lng: 120.14, lat: 30.30, country: '日本', from: 1896, to: 1945, kind: 'national' },
  { id: 'sz-jp', name: '苏州日租界', city: '苏州', lng: 120.57, lat: 31.32, country: '日本', from: 1896, to: 1945, kind: 'national' },
  { id: 'ss-jp', name: '沙市日租界', city: '沙市', lng: 112.24, lat: 30.32, country: '日本', from: 1898, to: 1945, kind: 'national' },
  { id: 'cs-jp', name: '长沙日租界', city: '长沙', lng: 112.95, lat: 28.22, country: '日本', from: 1904, to: 1945, kind: 'national' },
  { id: 'hk-colony', name: '香港殖民地', city: '香港', lng: 114.17, lat: 22.32, country: '英国', from: 1841, to: 1997, kind: 'colony' },
  { id: 'macau-colony', name: '澳门', city: '澳门', lng: 113.55, lat: 22.20, country: '葡萄牙', from: 1849, to: 1999, kind: 'colony' },
  { id: 'kwantung', name: '旅大租借地', city: '大连', lng: 121.60, lat: 38.92, country: '俄/日', from: 1898, to: 1945, kind: 'leased' },
  { id: 'jiaozhou', name: '胶澳租借地', city: '青岛', lng: 120.38, lat: 36.07, country: '德国', from: 1898, to: 1922, kind: 'leased' },
  { id: 'weihaiwei', name: '威海卫租借地', city: '威海', lng: 122.12, lat: 37.51, country: '英国', from: 1898, to: 1930, kind: 'leased' },
  { id: 'guangzhouwan', name: '广州湾租借地', city: '湛江', lng: 110.36, lat: 21.27, country: '法国', from: 1899, to: 1945, kind: 'leased' },
  { id: 'new-territories', name: '新界租借地', city: '香港', lng: 114.10, lat: 22.42, country: '英国', from: 1898, to: 1997, kind: 'leased' },
];

// ── 势力范围（1898 年前后，按省划分）──────────────────────────────────────
// note 里写明"承认/默认"的区别：只有俄国在满洲、德国在山东是明确租借地 + 铁路，
// 英国的"长江流域"更多是外交照会中的"不割让"承诺，不是行政管辖。
export const SPHERES = [
  { country: '俄国', color: [126, 92, 150], from: 1898, to: 1905,
    provinces: ['辽宁', '吉林', '黑龙江', '内蒙古'],
    note: '以中东铁路、旅大租借地为基础；1905 年日俄战争后南满转归日本' },
  { country: '德国', color: [64, 104, 96], from: 1898, to: 1914,
    provinces: ['山东'],
    note: '胶澳租借地 + 胶济铁路沿线矿权' },
  { country: '英国', color: [78, 110, 164], from: 1898, to: 1927,
    provinces: ['江苏', '安徽', '江西', '湖北', '湖南', '浙江'],
    note: '1898 年照会"不割让"长江流域，非行政管辖；另据威海卫、香港新界' },
  { country: '法国', color: [158, 112, 62], from: 1898, to: 1945,
    provinces: ['云南', '广西', '广东'],
    note: '租借广州湾 + 滇越铁路；1898 年照会"不割让"' },
  { country: '日本', color: [156, 78, 78], from: 1898, to: 1945,
    provinces: ['福建'],
    note: '1898 年照会"不割让"福建；1915 年后扩展至南满、东蒙' },
  { country: '意大利', color: [110, 100, 96], from: 1899, to: 1899,
    provinces: [],
    note: '1899 年要求租借浙江三门湾，被清廷拒绝，未成事实' },
];
