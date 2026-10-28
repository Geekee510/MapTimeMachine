// 事件分类（年份浮层 / 图钉 / 卡片前面的那枚小徽标）
// =============================================================================
// 分类词与古代编年库（src/data/china-events.js 的 c 字段）保持同一套：
//   政 = 政权、制度、政争   战 = 战争、战役、军事行动   经 = 实业、财政、交通
//   文 = 思想、教育、文化   科 = 科学、技术、工程
// 近代史另加一项：
//   外 = 条约、交涉、列强关系
// 近代一半以上的转折写在条约里（南京、马关、辛丑……），把这些塞进"政"或"战"，
// 徽标就失去了分辨力，所以单列一档。
//
// 为什么用 id 表而不是往每条事件里加 cat 字段：131 条事件分散在 5 个文件里，
// 逐条插字段既容易漏也难看全貌。分类是"派生的看法"，集中一处更好审阅与调整，
// 数据文件保持原样。自检见文件末尾 assertCatCoverage()。
// =============================================================================

/** 徽标里显示的分类字，顺序即默认图例顺序。 */
export const EVENT_CATS = ['政', '外', '战', '经', '文', '科'];

const BY_CAT = {
  政: [
    'lin-zexu', 'taiping-capital', 'zongli-yamen', 'xinjiang-province', 'taiwan-province',
    'gongche', 'wuxu', 'boxer', 'guangfuhui', 'tongmenghui', 'preparatory-constitution',
    'cixi-guangxu-die', 'advisory-bureau', 'zizhengyuan', 'qing-abdication', 'hongxian',
    'yuan-dies', 'zhangxun', 'ccp-founded', 'kuomintang-1', 'may-thirtieth', 'apr12',
    'feb-7-strike',
    'nanjing-gov', 'huanggutun', 'northeast-flag', 'gutian', 'soviet-republic', 'dec9',
    'xian-incident', 'zunyi', 'redarmy-reorg', 'wannan', 'chongqing-talks', 'prc-founded',
    'constitution-protection',
  ],
  外: [
    'nanjing-treaty', 'bogue-treaty', 'wanghia-treaty', 'revision-demand', 'tientsin-treaty',
    'burlingame', 'japan-taiwan-1874', 'margary', 'ryukyu-annex', 'ili-treaty',
    'shimonoseki', 'li-lobanov', 'xinchou', 'twenty-one', 'jinan-incident', 'north-china',
    'sino-soviet-1950',
  ],
  战: [
    'opium-war', 'sanyuanli', 'jintian', 'second-opium-war', 'guangzhou-fall', 'taku-1859',
    'peking-convention', 'taiping-fall', 'xinan-recover', 'sino-french', 'beiyang-navy',
    'sino-japanese-1894', 'boxer-war', 'russo-japanese-war', 'wuchang', 'second-revolution',
    'ww1-japan-qingdao', 'national-protection', 'zhian-wan', 'zhifeng-1', 'zhifeng-2',
    'northern-expedition', 'nanchang', 'autumn-harvest', 'guangzhou-uprising', 'jinggangshan',
    'central-plains-war', 'encirclement-1', 'encirclement-2', 'encirclement-4',
    'encirclement-5', 'jan28', 'great-wall', 'sept18', 'long-march-start', 'xiangjiang',
    'four-crossings', 'luding', 'maogong', 'wuchizhen', 'zhiluozhen', 'huining', 'suiyuan',
    'marco-polo', 'shanghai-1937', 'pingxingguan', 'nanjing-massacre', 'taierzhuang',
    'huayuankou', 'wuhan-1938', 'changsha-1', 'zaoyang', 'hundred-regiments', 'burma',
    'changde', 'ichigo', 'hengyang', 'west-hunan', 'surrender', 'shangdang', 'siping',
    'civil-war-start', 'menglianggu', 'dabie', 'shijiazhuang', 'liaoshen', 'taiyuan-1949',
    'huaihai', 'pingjin', 'yangtze', 'shanghai-1949', 'southwest', 'whampoa',
    'hainan-1950', 'changdu-1950',
  ],
  经: ['jiangnan-arsenal', 'fuzhou-dockyard', 'china-merchants', 'hanyang-ironworks'],
  文: ['tongwenguan', 'may-fourth', 'oracle-bones'],
  科: ['jingzhang-railway', 'academia-sinica'],
};

const CAT_OF = new Map();
for (const [cat, ids] of Object.entries(BY_CAT)) {
  for (const id of ids) {
    if (CAT_OF.has(id)) console.warn(`[eventCats] ${id} 被重复分类：${CAT_OF.get(id)} / ${cat}`);
    CAT_OF.set(id, cat);
  }
}

/** 事件所属分类；表里没有则按标签兜底，再兜底为"政"。 */
export function catOf(e) {
  if (!e) return '政';
  const hit = CAT_OF.get(e.id);
  if (hit) return hit;
  return catByTags(e.tags) || '政';
}

/** 标签 → 分类的兜底规则（新增事件忘了登记时仍能出徽标，不会被静默成空）。 */
function catByTags(tags) {
  const t = tags || [];
  const has = (...ws) => ws.some((w) => t.includes(w));
  if (has('条约', '不平等', '外交', '屈辱', '藩属')) return '外';
  if (has('战争', '会战', '战役', '大捷', '反围剿', '内战', '军阀混战', '起义', '抗战', '长征')) return '战';
  if (has('洋务', '经济', '工业')) return '经';
  if (has('教育', '思想')) return '文';
  if (has('制度', '变法', '改革', '革命', '革命组织', '政党', '政权', '建政', '帝制', '复辟')) return '政';
  return null;
}

/** 未分类的 id（开发期自检用；生产构建时无人调用，摇树会摘掉）。 */
export function uncategorizedIds(events) {
  return events.filter((e) => !CAT_OF.has(e.id)).map((e) => `${e.id}(${e.name})`);
}
