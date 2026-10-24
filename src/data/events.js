// 各国/历史政权重大事件库（1886–2023）
// 键名严格对应 CShapes 的 cntry_name（含历史政权复合名）。
// 每个事件：{ year:Number, title:String, desc:String }
// 匹配：先精确匹配键名；找不到时去掉 "(...)" 括号后缀再匹配
// （如点击 "Russia (Soviet Union)" 会回退命中 "Russia" 键）。
//
// 说明：事件为基于公开史实的概要性条目，仅用于地图科普展示，不穷尽所有事件；
// 未收录的国家点击后板块显示"暂无收录"。

const EVENTS = {
  // ===== 东亚 =====
  China: [
    { year: -221, title: '秦统一六国', desc: '秦始皇建立中国第一个大一统王朝，行郡县、统一文字度量衡。' },
    { year: -202, title: '西汉建立', desc: '刘邦定都长安，文景之治、汉武盛世，开通丝绸之路。' },
    { year: 618, title: '唐朝建立', desc: '李渊建唐，贞观之治、开元盛世，万邦来朝。' },
    { year: 960, title: '北宋建立', desc: '赵匡胤黄袍加身，重文抑武，经济文化繁荣。' },
    { year: 1271, title: '元朝建立', desc: '忽必烈定国号大元，首次由少数民族统一全国。' },
    { year: 1368, title: '明朝建立', desc: '朱元璋驱元复汉，郑和下西洋、营建紫禁城。' },
    { year: 1644, title: '清朝建立', desc: '清军入关定都北京，康乾盛世奠定现代疆域轮廓。' },
    { year: 1894, title: '甲午战争', desc: '清朝对日本战败，签订《马关条约》，割让台湾与澎湖。' },
    { year: 1911, title: '辛亥革命', desc: '武昌起义爆发，终结帝制。' },
    { year: 1912, title: '中华民国成立', desc: '亚洲第一个共和国建立。' },
    { year: 1937, title: '全面抗日战争', desc: '卢沟桥事变后中日全面开战。' },
    { year: 1949, title: '中华人民共和国成立', desc: '中华人民共和国在北京宣告成立。' },
    { year: 1966, title: '文化大革命', desc: '长达十年的社会政治运动。' },
    { year: 1978, title: '改革开放', desc: '十一届三中全会开启经济体制改革与对外开放。' },
    { year: 1997, title: '香港回归', desc: '英国将香港主权移交中国。' },
    { year: 1999, title: '澳门回归', desc: '葡萄牙将澳门主权移交中国。' },
    { year: 2001, title: '加入 WTO', desc: '中国正式成为世界贸易组织成员。' },
    { year: 2008, title: '北京奥运会', desc: '夏季奥林匹克运动会在北京举行。' },
    { year: 2013, title: '"一带一路"倡议', desc: '提出横跨欧亚的基础设施建设与经贸合作倡议。' },
  ],
  Taiwan: [
    { year: 1949, title: '国民政府迁台', desc: '中华民国政府退守台湾。' },
    { year: 1987, title: '解除戒严', desc: '延续 38 年的戒严令终止，开启民主化。' },
    { year: 1996, title: '首次直选领导人', desc: '举行首次领导人直接选举。' },
    { year: 2000, title: '首次政党轮替', desc: '民进党首次执政，实现政党轮替。' },
  ],
  Tibet: [
    { year: 1913, title: '宣布独立（争议）', desc: '第十三世达赖喇嘛宣布脱离清朝；中华人民共和国不承认。' },
    { year: 1951, title: '西藏和平解放', desc: '签订《十七条协议》，中国人民解放军进驻西藏。' },
    { year: 1959, title: '西藏叛乱', desc: '拉萨发生武装冲突，达赖喇嘛出走印度。' },
  ],
  Mongolia: [
    { year: 1911, title: '外蒙古独立', desc: '清亡后宣布脱离中国，后受苏俄影响。' },
    { year: 1921, title: '人民革命', desc: '在苏俄支持下建立君主立宪，后改共和。' },
    { year: 1990, title: '民主化', desc: '和平示威推动放弃一党制。' },
  ],
  Korea: [
    { year: 1897, title: '大韩帝国成立', desc: '李氏朝鲜改国号为大韩帝国。' },
    { year: 1910, title: '日韩合并', desc: '朝鲜半岛被日本吞并，殖民至 1945 年。' },
  ],
  'Korea, Republic of': [
    { year: 1948, title: '大韩民国成立', desc: '朝鲜半岛南部建立亲美政权。' },
    { year: 1950, title: '朝鲜战争爆发', desc: '北韩南侵，联合国军介入。' },
    { year: 1960, title: '四月革命', desc: '学生运动推翻李承晚独裁。' },
    { year: 1980, title: '光州民主化运动', desc: '光州民众抗争遭军方镇压。' },
    { year: 1987, title: '六月民主抗争', desc: '迫于压力修宪实现直选。' },
    { year: 1997, title: '亚洲金融风暴', desc: 'IMF 救助，经济深度调整。' },
    { year: 2018, title: '平昌冬奥会', desc: '冬奥会举行，南北关系短暂缓和。' },
  ],
  'Korea, People\'s Republic of': [
    { year: 1948, title: '朝鲜民主主义人民共和国成立', desc: '半岛北部建立亲苏政权。' },
    { year: 1950, title: '朝鲜战争爆发', desc: '北韩南侵引发半岛全面战争。' },
    { year: 1991, title: '加入联合国', desc: '与韩国同时加入联合国。' },
    { year: 1994, title: '金日成逝世', desc: '建国者金日成去世，金正日接班。' },
    { year: 2006, title: '首次核试验', desc: '进行地下核试验，引发国际制裁。' },
    { year: 2011, title: '金正恩执政', desc: '金正日去世后其三子接班。' },
  ],
  Japan: [
    { year: 1894, title: '甲午战争', desc: '击败清朝，跻身列强。' },
    { year: 1904, title: '日俄战争', desc: '击败俄国，控制朝鲜与南满。' },
    { year: 1910, title: '吞并朝鲜', desc: '正式将朝鲜半岛并入日本。' },
    { year: 1931, title: '九一八事变', desc: '侵占中国东北，建立伪满洲国。' },
    { year: 1937, title: '全面侵华', desc: '卢沟桥事变后发动全面侵华战争。' },
    { year: 1941, title: '偷袭珍珠港', desc: '对美宣战，太平洋战争爆发。' },
    { year: 1945, title: '战败与宪法', desc: '接受波茨坦公告，颁布和平宪法。' },
    { year: 1964, title: '东京奥运会', desc: '亚洲首次举办奥运会，经济腾飞象征。' },
    { year: 2011, title: '东日本大地震', desc: '9 级地震与海啸引发福岛核事故。' },
  ],

  // ===== 东南亚 / 大洋 =====
  Vietnam: [
    { year: 1887, title: '法属印度支那形成', desc: '法国完成对越、柬、老的殖民整合。' },
    { year: 1945, title: '八月革命', desc: '胡志明宣布越南独立。' },
    { year: 1954, title: '奠边府战役', desc: '击败法军，日内瓦协定分割越南。' },
    { year: 1975, title: '西贡陷落与统一', desc: '北越攻占西贡，越南统一。' },
    { year: 1979, title: '中越战争', desc: '中越边境爆发短期战争。' },
    { year: 1986, title: '革新开放', desc: '效仿中国启动市场经济改革。' },
    { year: 1995, title: '加入东盟', desc: '结束孤立，融入区域合作。' },
  ],
  'Vietnam, Republic of': [
    { year: 1955, title: '越南共和国成立', desc: '南越政权建立（吴廷琰）。' },
    { year: 1968, title: '春节攻势', desc: '北越发动大规模攻势，扭转战争态势。' },
    { year: 1975, title: '西贡陷落', desc: '南越政权覆灭。' },
  ],
  'Vietnam, Democratic Republic of': [
    { year: 1954, title: '北越建国', desc: '日内瓦协定后越南民主共和国控制北方。' },
    { year: 1975, title: '统一越南', desc: '攻占西贡，统一全国。' },
  ],
  Thailand: [
    { year: 1932, title: '君主立宪革命', desc: '军人政变结束 absolut君主制。' },
    { year: 1941, title: '日军进驻', desc: '二战中被日本占领。' },
    { year: 1973, title: '学生运动', desc: '抗议迫使军政府退让。' },
    { year: 1992, title: '黑色五月', desc: '民众抗议军人干政，恢复文人政府。' },
    { year: 2014, title: '军事政变', desc: '军方再次接管政权。' },
  ],
  Myanmar: [
    { year: 1948, title: '独立', desc: '脱离英国独立。' },
    { year: 1962, title: '军人政变', desc: '奈温建立军政府。' },
    { year: 1988, title: '8888 民主运动', desc: '全国民主抗议遭镇压。' },
    { year: 2011, title: '文人政府', desc: '结束直接军人统治。' },
    { year: 2016, title: '昂山素季执政', desc: '民选政府上台。' },
    { year: 2021, title: '军事政变', desc: '军方推翻民选政府，引发内战。' },
  ],
  Indonesia: [
    { year: 1945, title: '宣布独立', desc: '苏加诺宣布脱离荷兰独立。' },
    { year: 1949, title: '荷兰承认', desc: '结束四年独立战争。' },
    { year: 1965, title: '反共大清洗', desc: '军方镇压左翼，数十万人丧生。' },
    { year: 1998, title: '苏哈托倒台', desc: '经济危机引发改革运动。' },
    { year: 2004, title: '印度洋海啸', desc: '亚齐遭重创，国际救援大规模展开。' },
  ],
  Philippines: [
    { year: 1898, title: '美西战争', desc: '脱离西班牙，后转由美国统治。' },
    { year: 1946, title: '独立', desc: '结束美国殖民地地位。' },
    { year: 1965, title: '马科斯独裁', desc: '实行军管法，长期独裁。' },
    { year: 1986, title: '人民力量革命', desc: '和平示威推翻马科斯。' },
  ],
  Malaysia: [
    { year: 1957, title: '马来亚独立', desc: '脱离英国独立。' },
    { year: 1963, title: '马来西亚成立', desc: '并入沙巴、砂拉越与新加坡。' },
    { year: 1965, title: '新加坡退出', desc: '新加坡被逐出联邦，独立建国。' },
  ],
  Australia: [
    { year: 1901, title: '澳大利亚联邦', desc: '六个殖民地组成联邦。' },
    { year: 1915, title: '加里波利战役', desc: '一战中澳新军团惨烈受挫，民族意识觉醒。' },
    { year: 1999, title: '共和公投', desc: '公投保留君主立宪，未改为共和国。' },
  ],
  'New Zealand': [
    { year: 1907, title: '成为自治领', desc: '脱离新南威尔士管辖，获自治地位。' },
    { year: 1984, title: '核舰禁令', desc: '禁止核动力/核武装船只入港，退出 ANZUS。' },
  ],

  // ===== 南亚 =====
  India: [
    { year: 1919, title: '阿姆利则惨案', desc: '英军镇压示威，加速独立运动。' },
    { year: 1942, title: '"退出印度"运动', desc: '甘地发起反英不合作高潮。' },
    { year: 1947, title: '独立与印巴分治', desc: '结束英治，分裂为印度与巴基斯坦。' },
    { year: 1971, title: '孟加拉独立战争', desc: '东巴独立为孟加拉国。' },
    { year: 1991, title: '经济自由化', desc: '危机后转向市场经济改革。' },
    { year: 1998, title: '核试验', desc: '进行核试，成为事实核国家。' },
  ],
  Pakistan: [
    { year: 1947, title: '独立建国', desc: '从英属印度分出，穆斯林国家成立。' },
    { year: 1971, title: '东巴独立', desc: '内战后在印度介入下失去东巴（孟加拉）。' },
    { year: 1998, title: '核试验', desc: '回应印度，进行核试验。' },
    { year: 1999, title: '军事政变', desc: '穆沙拉夫推翻民选政府。' },
    { year: 2011, title: '击毙本·拉登', desc: '美国在阿伯塔巴德实施突袭。' },
  ],
  Bangladesh: [
    { year: 1971, title: '独立战争', desc: '在印度支持下脱离巴基斯坦独立。' },
  ],
  Afghanistan: [
    { year: 1919, title: '第三次英阿战争', desc: '获得完全独立。' },
    { year: 1979, title: '苏军入侵', desc: '苏联出兵，挑起十年战争。' },
    { year: 1989, title: '苏军撤出', desc: '苏联撤军，内战加剧。' },
    { year: 1996, title: '塔利班掌权', desc: '控制大部分国土，实施极端统治。' },
    { year: 2001, title: '美军入侵', desc: '反恐战争推翻塔利班。' },
    { year: 2021, title: '塔利班重夺', desc: '美军撤出后迅速重新掌权。' },
  ],
  'Sri Lanka (Ceylon)': [
    { year: 1948, title: '独立', desc: '脱离英国独立（锡兰）。' },
    { year: 1983, title: '内战爆发', desc: '泰米尔伊拉姆猛虎组织与政府长期冲突。' },
    { year: 2009, title: '内战结束', desc: '政府军击败猛虎组织。' },
  ],

  // ===== 中东 =====
  Turkey: [
    { year: 1908, title: '青年土耳其革命', desc: '恢复宪法，奥斯曼走向集权改革。' },
    { year: 1918, title: '帝国解体', desc: '一战败北，奥斯曼领土被瓜分。' },
    { year: 1923, title: '土耳其共和国', desc: '凯末尔建立世俗共和国。' },
    { year: 1938, title: '凯末尔逝世', desc: '国父去世，共和人民党延续统治。' },
    { year: 1952, title: '加入 NATO', desc: '成为北约成员国。' },
    { year: 2016, title: '政变未遂', desc: '军方政变失败，后大规模清洗。' },
  ],
  Iran: [
    { year: 1906, title: '宪政革命', desc: '迫使君主颁布宪法。' },
    { year: 1953, title: '政变', desc: '英美策动推翻摩萨台，恢复君主权威。' },
    { year: 1979, title: '伊斯兰革命', desc: '推翻巴列维，建立伊斯兰共和国。' },
    { year: 1980, title: '两伊战争', desc: '与伊拉克开战，持续八年。' },
    { year: 2009, title: '绿色运动', desc: '选举争议引发大规模抗议。' },
    { year: 2015, title: '伊核协议', desc: '与六国达成核问题协议。' },
  ],
  Iraq: [
    { year: 1932, title: '独立', desc: '结束英国委任统治。' },
    { year: 1958, title: '革命', desc: '君主制被推翻，建立共和国。' },
    { year: 1979, title: '萨达姆掌权', desc: '出任总统，长期独裁。' },
    { year: 1980, title: '两伊战争', desc: '入侵伊朗，八年战争。' },
    { year: 1990, title: '入侵科威特', desc: '引发海湾战争。' },
    { year: 2003, title: '萨达姆倒台', desc: '美军入侵推翻政权。' },
  ],
  Israel: [
    { year: 1948, title: '建国', desc: '宣布独立，第一次中东战争爆发。' },
    { year: 1967, title: '六日战争', desc: '击败阿拉伯邻国，占领西岸等地。' },
    { year: 1973, title: '赎罪日战争', desc: '阿拉伯国家突袭，后议和。' },
    { year: 1979, title: '埃以和约', desc: '与埃及建交，首个阿以和平条约。' },
    { year: 1993, title: '奥斯陆协议', desc: '与巴解组织相互承认。' },
    { year: 2023, title: '加沙战争', desc: '哈马斯袭击后以色列大规模进攻加沙。' },
  ],
  Palestine: [
    { year: 1947, title: '分治决议', desc: '联合国通过巴以分治方案。' },
    { year: 1948, title: '第一次中东战争', desc: '阿拉伯战败，产生巴勒斯坦难民。' },
    { year: 1967, title: '六日战争', desc: '被以色列占领西岸与加沙。' },
    { year: 1988, title: '宣布建国', desc: '巴解组织宣布独立。' },
    { year: 2007, title: '加沙分裂', desc: '哈马斯控制加沙，与约旦河西岸分裂。' },
  ],
  Syria: [
    { year: 1946, title: '独立', desc: '法国撤离，叙利亚独立。' },
    { year: 1963, title: '复兴党执政', desc: '阿拉伯复兴社会党掌权。' },
    { year: 1970, title: '阿萨德政变', desc: '哈菲兹·阿萨德接管政权。' },
    { year: 2011, title: '内战爆发', desc: '阿拉伯之春抗议演变为全面内战。' },
    { year: 2024, title: '阿萨德政权倒台', desc: '反政府武装攻占大马士革。' },
  ],
  'Saudi Arabia': [
    { year: 1902, title: '建国开端', desc: '伊本·沙特夺取利雅得。' },
    { year: 1932, title: '统一王国', desc: '正式定名沙特阿拉伯王国。' },
    { year: 1938, title: '发现石油', desc: '商业性油藏发现，改变国运。' },
    { year: 1973, title: '石油禁运', desc: '以石油为武器引发第一次石油危机。' },
  ],
  Yemen: [
    { year: 1990, title: '南北统一', desc: '阿拉伯也门与也门民主共和国合并。' },
    { year: 2015, title: '内战升级', desc: '胡塞武装夺权，沙特牵头干预。' },
  ],
  Jordan: [
    { year: 1946, title: '独立', desc: '脱离英国委任统治。' },
    { year: 1967, title: '失去西岸', desc: '六日战争中被以色列占领西岸。' },
  ],
  Lebanon: [
    { year: 1943, title: '独立', desc: '脱离法国委任统治。' },
    { year: 1975, title: '内战爆发', desc: '教派冲突持续 15 年。' },
    { year: 2006, title: '以黎冲突', desc: '与以色列爆发 34 天战争。' },
  ],

  // ===== 非洲 =====
  Egypt: [
    { year: 1882, title: '英国占领', desc: '英国实际控制埃及。' },
    { year: 1922, title: '名义独立', desc: '英国结束保护，保留特权。' },
    { year: 1952, title: '自由军官革命', desc: '纳赛尔推翻君主制。' },
    { year: 1956, title: '苏伊士危机', desc: '收回运河，三国入侵失败。' },
    { year: 1978, title: '戴维营协议', desc: '与以色列和解。' },
    { year: 2011, title: '阿拉伯之春', desc: '穆巴拉克下台。' },
  ],
  Libya: [
    { year: 1911, title: '意土战争', desc: '意大利从奥斯曼夺取利比亚。' },
    { year: 1951, title: '独立', desc: '摆脱殖民独立。' },
    { year: 1969, title: '卡扎菲政变', desc: '军官政变建立共和国。' },
    { year: 2011, title: '内战与卡扎菲之死', desc: '北约干预，卡扎菲被杀。' },
  ],
  Sudan: [
    { year: 1956, title: '独立', desc: '脱离英埃共管独立。' },
    { year: 2011, title: '南苏丹独立', desc: '公投后南部独立。' },
    { year: 2019, title: '巴希尔下台', desc: '长期独裁者在抗议中倒台。' },
    { year: 2023, title: '全面内战', desc: '军方与准军事组织交战。' },
  ],
  'South Sudan': [
    { year: 2011, title: '独立', desc: '经公投从苏丹独立。' },
  ],
  Algeria: [
    { year: 1954, title: '独立战争', desc: '民族解放阵线武装抗法。' },
    { year: 1962, title: '独立', desc: '结束 132 年法国统治。' },
    { year: 2019, title: '布特弗利卡下台', desc: '长期总统在抗议中辞职。' },
  ],
  Morocco: [
    { year: 1912, title: '沦为保护国', desc: '被法国与西班牙瓜分。' },
    { year: 1956, title: '独立', desc: '结束保护国地位。' },
    { year: 1975, title: '绿色进军', desc: '进军西撒哈拉，引发争端。' },
  ],
  Tunisia: [
    { year: 1956, title: '独立', desc: '脱离法国独立。' },
    { year: 2011, title: '阿拉伯之春起点', desc: '自焚事件点燃地区变革。' },
  ],
  Ethiopia: [
    { year: 1896, title: '阿杜瓦胜利', desc: '击败意大利，唯一的抗殖民胜利。' },
    { year: 1935, title: '意大利入侵', desc: '被意大利占领至 1941 年。' },
    { year: 1974, title: '君主制终结', desc: '皇帝塞拉西被废，军政府上台。' },
    { year: 1991, title: '门格斯图倒台', desc: '共产党政权崩溃。' },
    { year: 2020, title: '提格雷战争', desc: '北部爆发内战，后于 2022 停火。' },
  ],
  Kenya: [
    { year: 1963, title: '独立', desc: '脱离英国独立。' },
    { year: 2007, title: '选举骚乱', desc: '大选争议引发族裔冲突。' },
    { year: 2010, title: '新宪法', desc: '公投通过更分权的宪法。' },
  ],
  Nigeria: [
    { year: 1960, title: '独立', desc: '脱离英国独立。' },
    { year: 1967, title: '比夫拉内战', desc: '东南部试图独立，三年内战。' },
    { year: 1999, title: '文人政府', desc: '结束军管，恢复民选。' },
  ],
  Ghana: [
    { year: 1957, title: '独立', desc: '撒哈拉以南非洲首个独立殖民地。' },
    { year: 1992, title: '多党制', desc: '恢复多党民主。' },
  ],
  'South Africa': [
    { year: 1910, title: '联邦成立', desc: '四个英属殖民地合并。' },
    { year: 1948, title: '种族隔离立法', desc: '国民党推行 apartheid。' },
    { year: 1961, title: '退出英联邦', desc: '改为共和国。' },
    { year: 1990, title: '曼德拉获释', desc: '结束 27 年监禁。' },
    { year: 1994, title: '首次全民大选', desc: '曼德拉成为首位黑人总统。' },
  ],
  Zimbabwe: [
    { year: 1965, title: '罗得西亚单方独立', desc: '白人少数政权宣布独立。' },
    { year: 1980, title: '独立', desc: '更名津巴布韦，黑人多数统治。' },
    { year: 2017, title: '穆加贝下台', desc: '执政 37 年后被军方逼退。' },
  ],

  // ===== 欧洲 =====
  'Russia (Soviet Union)': [
    { year: 1904, title: '日俄战争', desc: '败于日本，暴露帝俄弱点。' },
    { year: 1914, title: '参加一战', desc: '卷入世界大战，国力耗尽。' },
    { year: 1917, title: '十月革命', desc: '布尔什维克夺取政权。' },
    { year: 1922, title: '苏联成立', desc: '苏维埃社会主义共和国联盟建立。' },
    { year: 1941, title: '苏德战争', desc: '德国入侵，苏联卷入二战主战场。' },
    { year: 1945, title: '二战胜利', desc: '攻克柏林，成为超级大国。' },
    { year: 1957, title: '人造卫星', desc: '发射首颗人造卫星，太空竞赛开启。' },
    { year: 1991, title: '苏联解体', desc: '15 个加盟共和国独立，俄罗斯联邦成立。' },
    { year: 2014, title: '克里米亚并入', desc: '从乌克兰吞并克里米亚，遭国际制裁。' },
  ],
  // 注：CShapes 中俄罗斯实体名为 "Russia (Soviet Union)"，下方 base 匹配（去括号）即命中 "Russia" 本键
  'United States of America': [
    { year: 1898, title: '美西战争', desc: '夺取菲律宾、波多黎各、关岛。' },
    { year: 1917, title: '参加一战', desc: '参战并影响战争结局。' },
    { year: 1929, title: '经济大萧条', desc: '股市崩盘，全球衰退。' },
    { year: 1941, title: '参加二战', desc: '珍珠港事件后参战。' },
    { year: 1945, title: '联合国与原子弹', desc: '主导建立联合国，投下原子弹。' },
    { year: 1950, title: '朝鲜战争', desc: '领军介入朝鲜战争。' },
    { year: 1962, title: '古巴导弹危机', desc: '与苏联险些核对抗。' },
    { year: 1969, title: '登月', desc: '阿波罗 11 号首次载人登月。' },
    { year: 2001, title: '9·11 事件', desc: '恐怖袭击引发全球反恐战争。' },
    { year: 2008, title: '金融危机', desc: '次贷危机引发全球金融海啸。' },
  ],
  France: [
    { year: 1914, title: '第一次世界大战', desc: '西线主战场，伤亡惨重。' },
    { year: 1940, title: '沦陷与维希', desc: '被德国占领，南部成立维希傀儡政权。' },
    { year: 1944, title: '解放', desc: '诺曼底登陆后光复。' },
    { year: 1958, title: '第五共和国', desc: '戴高乐主政，强化总统权力。' },
    { year: 1968, title: '五月风暴', desc: '学生工人运动冲击社会。' },
  ],
  'United Kingdom': [
    { year: 1899, title: '英布战争', desc: '在南非与布尔人交战。' },
    { year: 1914, title: '第一次世界大战', desc: '西线主战场。' },
    { year: 1939, title: '第二次世界大战', desc: '抵抗纳粹德国，伦敦大轰炸。' },
    { year: 1947, title: '印巴独立', desc: '结束对印度殖民。' },
    { year: 1973, title: '加入欧共体', desc: '成为欧共体成员。' },
    { year: 2016, title: '脱欧公投', desc: '公投决定退出欧盟。' },
  ],
  'Germany (Prussia)': [
    { year: 1914, title: '第一次世界大战', desc: '同盟国核心，战败。' },
    { year: 1918, title: '帝国崩溃', desc: '战败革命，魏玛共和国建立。' },
    { year: 1933, title: '纳粹上台', desc: '希特勒被任命为总理。' },
    { year: 1939, title: '第二次世界大战', desc: '入侵波兰，欧洲战事爆发。' },
    { year: 1945, title: '战败与分裂', desc: '投降，德国被盟军分区占领。' },
  ],
  'German Federal Republic': [
    { year: 1949, title: '联邦共和国成立', desc: '西德在美英法占领区建立。' },
    { year: 1961, title: '柏林墙修筑', desc: '东德封锁边界。' },
    { year: 1989, title: '柏林墙倒塌', desc: '东德开放边界。' },
    { year: 1990, title: '两德统一', desc: '民主德国并入联邦德国。' },
  ],
  'German Democratic Republic': [
    { year: 1949, title: '民主共和国成立', desc: '东德在苏占区建立。' },
    { year: 1961, title: '柏林墙修筑', desc: '封锁与西德边界。' },
    { year: 1989, title: '和平革命', desc: '大规模示威迫使政权开放边界。' },
    { year: 1990, title: '并入西德', desc: '随两德统一而消亡。' },
  ],
  'Italy/Sardinia': [
    { year: 1915, title: '参加一战', desc: '转投协约国。' },
    { year: 1922, title: '墨索里尼上台', desc: '法西斯党夺取政权。' },
    { year: 1940, title: '参加二战', desc: '作为轴心国参战。' },
    { year: 1943, title: '倒戈', desc: '墨索里尼下台，意转投盟军。' },
    { year: 1946, title: '废除君主制', desc: '公投建立共和国。' },
  ],
  Spain: [
    { year: 1931, title: '第二共和国', desc: '君主制被推翻。' },
    { year: 1936, title: '内战爆发', desc: '左右阵营全面内战。' },
    { year: 1939, title: '佛朗哥掌权', desc: '独裁统治开始。' },
    { year: 1975, title: '佛朗哥逝世', desc: '胡安·卡洛斯国王推动民主化。' },
    { year: 1978, title: '民主宪法', desc: '确立君主立宪。' },
  ],
  Portugal: [
    { year: 1910, title: '共和革命', desc: '君主制被推翻。' },
    { year: 1974, title: '康乃馨革命', desc: '军人政变和平结束独裁。' },
    { year: 1975, title: '放弃殖民帝国', desc: '撤出非洲殖民地。' },
  ],
  Netherlands: [
    { year: 1940, title: '被德军占领', desc: '二战中被德国入侵。' },
    { year: 1949, title: '承认印尼独立', desc: '结束东印度殖民。' },
  ],
  Belgium: [
    { year: 1908, title: '刚果并入', desc: '刚果自由邦收归国有。' },
    { year: 1914, title: '一战战场', desc: '遭德国入侵。' },
    { year: 1960, title: '刚果独立', desc: '比属刚果独立，引发危机。' },
  ],
  Switzerland: [
    { year: 2002, title: '加入联合国', desc: '长期中立国首次入联。' },
  ],
  Sweden: [
    { year: 1995, title: '加入欧盟', desc: '公投后入盟。' },
    { year: 2024, title: '加入北约', desc: '结束两百年不结盟。' },
  ],
  Norway: [
    { year: 1905, title: '脱离瑞典独立', desc: '和平解体联合。' },
    { year: 1940, title: '被德国占领', desc: '二战中被入侵。' },
    { year: 1949, title: '加入北约', desc: '创始成员国。' },
  ],
  Denmark: [
    { year: 1940, title: '被德国占领', desc: '二战中被入侵。' },
    { year: 1973, title: '加入欧共体', desc: '经公投入盟。' },
  ],
  'Austria-Hungary': [
    { year: 1914, title: '萨拉热窝事件', desc: '皇储遇刺，引爆一战。' },
    { year: 1918, title: '帝国解体', desc: '战败后分裂为多个民族国家。' },
  ],
  Austria: [
    { year: 1938, title: '德奥合并', desc: '被纳粹德国吞并。' },
    { year: 1955, title: '恢复独立', desc: '签署国家条约，承诺永久中立。' },
    { year: 1995, title: '加入欧盟', desc: '成为成员国。' },
  ],
  Hungary: [
    { year: 1956, title: '匈牙利事件', desc: '反苏起义遭镇压。' },
    { year: 1989, title: '民主化', desc: '改国号为共和国，开放边界。' },
    { year: 2004, title: '加入欧盟', desc: '成为成员国。' },
  ],
  Poland: [
    { year: 1918, title: '复国', desc: '一战后重建独立国家。' },
    { year: 1939, title: '被德苏瓜分', desc: '二战爆发，波兰被分区占领。' },
    { year: 1980, title: '团结工会', desc: '东欧首个独立工会兴起。' },
    { year: 1989, title: '民主转型', desc: '圆桌谈判开启自由选举。' },
    { year: 1999, title: '加入北约', desc: '成为成员国。' },
    { year: 2004, title: '加入欧盟', desc: '成为成员国。' },
  ],
  Czechoslovakia: [
    { year: 1918, title: '建国', desc: '一战后独立。' },
    { year: 1938, title: '慕尼黑协定', desc: '被英法出卖，苏台德被割让。' },
    { year: 1948, title: '共产党夺权', desc: '二月事件后亲苏执政。' },
    { year: 1968, title: '布拉格之春', desc: '改革运动遭华约入侵镇压。' },
    { year: 1989, title: '天鹅绒革命', desc: '和平转型。' },
    { year: 1993, title: '和平解体', desc: '分裂为捷克与斯洛伐克。' },
  ],
  Yugoslavia: [
    { year: 1918, title: '王国成立', desc: '一战后整合南斯拉夫民族。' },
    { year: 1945, title: '铁托建国', desc: '共产党执政，不结盟路线。' },
    { year: 1991, title: '解体开始', desc: '斯洛文尼亚等宣布独立，内战爆发。' },
    { year: 1999, title: '科索沃战争', desc: '北约轰炸，米洛舍维奇倒台。' },
  ],
  Serbia: [
    { year: 2006, title: '独立', desc: '黑山公投脱离，塞尔维亚独立。' },
    { year: 2008, title: '科索沃宣布独立', desc: '科索沃单方面独立，塞尔维亚不承认。' },
  ],
  Greece: [
    { year: 1940, title: '抵抗意大利', desc: '二战中顽强抵抗。' },
    { year: 1967, title: '军政府', desc: '军人政变建立独裁。' },
    { year: 1974, title: '民主恢复', desc: '公投废除君主制。' },
    { year: 2010, title: '主权债务危机', desc: '爆发欧债危机。' },
  ],
  Bulgaria: [
    { year: 1944, title: '共产党执政', desc: '苏联推进后建立亲苏政权。' },
    { year: 1989, title: '转型', desc: '和平变革。' },
    { year: 2004, title: '加入北约', desc: '成为成员国。' },
  ],
  Rumania: [
    { year: 1944, title: '倒戈', desc: '转向盟军，脱离轴心。' },
    { year: 1947, title: '废除君主制', desc: '建立人民共和国。' },
    { year: 1989, title: '齐奥塞斯库被处决', desc: '革命中处决独裁者。' },
    { year: 2004, title: '加入北约', desc: '成为成员国。' },
  ],
  Ukraine: [
    { year: 1918, title: '短暂独立', desc: '俄国内战后宣布独立，旋被并入苏联。' },
    { year: 1991, title: '独立', desc: '苏联解体后独立。' },
    { year: 2004, title: '橙色革命', desc: '选举舞弊引发抗议。' },
    { year: 2014, title: '广场革命与克里米亚', desc: '亲俄总统下台，俄吞并克里米亚。' },
    { year: 2022, title: '俄乌全面战争', desc: '俄罗斯全面入侵。' },
  ],
  Finland: [
    { year: 1917, title: '独立', desc: '脱离俄国独立。' },
    { year: 1939, title: '冬季战争', desc: '抵御苏联入侵。' },
    { year: 1995, title: '加入欧盟', desc: '成为成员国。' },
  ],

  // ===== 美洲 =====
  Canada: [
    { year: 1931, title: '威斯敏斯特法令', desc: '获得立法独立。' },
    { year: 1982, title: '宪法回归', desc: '收回宪法修改权。' },
    { year: 1995, title: '魁北克公投', desc: '独立公投未过半。' },
  ],
  Mexico: [
    { year: 1910, title: '革命', desc: '推翻迪亚斯独裁，十年内战。' },
    { year: 1917, title: '宪法', desc: '颁布进步主义宪法。' },
    { year: 1938, title: '石油国有化', desc: '将外资石油收归国有。' },
    { year: 2000, title: '首次政党轮替', desc: '反对党赢得大选。' },
    { year: 2006, title: '毒品战争', desc: '军方介入打击贩毒集团。' },
  ],
  Brazil: [
    { year: 1889, title: '建立共和国', desc: '推翻帝国，建立合众国。' },
    { year: 1930, title: '革命', desc: '瓦加斯上台，开启集权改革。' },
    { year: 1964, title: '军事政变', desc: '军人执政 21 年。' },
    { year: 2002, title: '卢拉执政', desc: '左翼工人党首次执政。' },
    { year: 2016, title: '弹劾罗塞夫', desc: '首位女总统被弹劾。' },
  ],
  Argentina: [
    { year: 1946, title: '庇隆主义', desc: '庇隆当选，民粹主义兴起。' },
    { year: 1976, title: '军政府', desc: '右翼独裁，"失踪"镇压左翼。' },
    { year: 1982, title: '马岛战争', desc: '与英国交战失败。' },
    { year: 2001, title: '经济危机', desc: '债务违约，社会动荡。' },
  ],
  Chile: [
    { year: 1970, title: '阿连德当选', desc: '马克思主义者当选总统。' },
    { year: 1973, title: '皮诺切特政变', desc: '美军支持的政变，长期军政府。' },
    { year: 1990, title: '民主恢复', desc: '和平回归文人统治。' },
  ],
  Cuba: [
    { year: 1898, title: '脱离西班牙', desc: '美西战争后独立。' },
    { year: 1959, title: '革命胜利', desc: '卡斯特罗推翻巴蒂斯塔。' },
    { year: 1962, title: '导弹危机', desc: '美苏在古巴险些核对抗。' },
  ],
  Colombia: [
    { year: 1948, title: '"暴力时期"', desc: '自由党领袖遇刺引发十年动荡。' },
    { year: 2016, title: '和平协议', desc: '与革命武装力量签署和平协议。' },
  ],
  Venezuela: [
    { year: 1958, title: '民主转型', desc: '结束独裁，建立文人政权。' },
    { year: 1999, title: '查韦斯执政', desc: '推行"21 世纪社会主义"。' },
    { year: 2019, title: '宪政危机', desc: '反对派与马杜罗对峙。' },
  ],
  Peru: [
    { year: 1990, title: '藤森执政', desc: '铁腕打击叛乱与经济改革。' },
    { year: 2022, title: '全国抗议', desc: '总统遭弹劾下台引发动荡。' },
  ],
  Bolivia: [
    { year: 1952, title: '革命', desc: '民族主义革命，土地改革。' },
    { year: 2005, title: '莫拉莱斯执政', desc: '首位原住民总统上任。' },
  ],
};

// 容错匹配：精确键名 → 去掉括号后缀再匹配（如 "Russia (Soviet Union)" → "Russia"）
export function getEvents(cntryName) {
  if (!cntryName) return [];
  if (EVENTS[cntryName]) return EVENTS[cntryName];
  const base = String(cntryName).replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (base && EVENTS[base]) return EVENTS[base];
  return [];
}

export default EVENTS;
