// 右侧面板：图层开关 + 复位 + 信息卡展示
// CShapes 真实字段：cntry_name / capname / area / gwcode / gwsyear / gweyear / status
import { zhCountry, zh, bilingual, RIVER_ZH, MOUNTAIN_ZH } from '../data/i18n.js';
import { polityDesc, fallbackDesc } from '../data/polity-desc.js';
import { getEvents } from '../data/events.js';
import { statesAtYear, isInterregnum } from '../data/china.js';

// 国旗图片（flag-icons SVG，MIT）：按 CShapes 英文国名 → ISO 3166-1 alpha-2 小写代码。
// 历史政权去括号后回退到继承国代码。info-name 用 <img> 渲染（Windows 不支持 emoji 旗帜字形）。
const FLAGS = {
  'China': 'cn', 'United States of America': 'us', 'Russia': 'ru',
  'Russia (Soviet Union)': 'ru',   'United Kingdom': 'gb', 'France': 'fr',
  'Germany': 'de', 'Germany (Prussia)': 'de', 'Japan': 'jp', 'India': 'in',
  'Italy/Sardinia': 'it', 'Italy': 'it',
  'German Democratic Republic': 'dd', 'Yugoslavia': 'yu',
  'Italy': 'it', 'Spain': 'es', 'Portugal': 'pt', 'Netherlands': 'nl',
  'Belgium': 'be', 'Switzerland': 'ch', 'Austria': 'at', 'Austria-Hungary': 'at',
  'Poland': 'pl', 'Czech Republic': 'cz', 'Czechoslovakia': 'cz', 'Hungary': 'hu',
  'Romania': 'ro', 'Greece': 'gr', 'Sweden': 'se', 'Norway': 'no',
  'Denmark': 'dk', 'Finland': 'fi', 'Ireland': 'ie', 'Iceland': 'is',
  'Turkey': 'tr', 'Turkey (Ottoman Empire)': 'tr', 'Iran': 'ir', 'Iraq': 'iq',
  'Saudi Arabia': 'sa', 'Egypt': 'eg', 'Israel': 'il', 'Syria': 'sy',
  'Afghanistan': 'af', 'Pakistan': 'pk', 'Bangladesh': 'bd',
  'Sri Lanka': 'lk', 'Nepal': 'np', 'Myanmar': 'mm', 'Thailand': 'th',
  'Vietnam': 'vn', 'Vietnam (Annam/Cochin China/Tonkin)': 'vn', 'Malaysia': 'my',
  'Indonesia': 'id', 'Philippines': 'ph', 'Korea': 'kr', 'Korea, Republic of': 'kr',
  'Mongolia': 'mn', 'Kazakhstan': 'kz', 'Ukraine': 'ua', 'Brazil': 'br',
  'Argentina': 'ar', 'Chile': 'cl', 'Peru': 'pe', 'Colombia': 'co',
  'Venezuela': 've', 'Bolivia': 'bo', 'Mexico': 'mx', 'Cuba': 'cu',
  'Canada': 'ca', 'Australia': 'au', 'New Zealand': 'nz', 'South Africa': 'za',
  'Nigeria': 'ng', 'Kenya': 'ke', 'Ethiopia': 'et', 'Morocco': 'ma',
  'Algeria': 'dz', 'Libya': 'ly', 'Sudan': 'sd', 'Ghana': 'gh',
  // —— 现存主权国家补充 ——
  'Albania': 'al', 'Angola': 'ao', 'Armenia': 'am', 'Azerbaijan': 'az',
  'Bahamas': 'bs', 'Bahrain': 'bh', 'Barbados': 'bb', 'Belarus': 'by',
  'Belize': 'bz', 'Benin': 'bj', 'Bhutan': 'bt', 'Bosnia-Herzegovina': 'ba',
  'Bosnia': 'ba', 'Herzegovina': 'ba', 'Botswana': 'bw', 'Brunei': 'bn',
  'Bulgaria': 'bg', 'Burkina Faso': 'bf', 'Burundi': 'bi', 'Cambodia': 'kh',
  'Cameroon': 'cm', 'Cape Verde': 'cv', 'Central African Republic': 'cf',
  'Chad': 'td', 'Comoros': 'km', 'Congo': 'cg', 'Congo, Democratic Republic of': 'cd',
  "Cote D'Ivoire": 'ci', 'Costa Rica': 'cr', 'Croatia': 'hr', 'Cyprus': 'cy',
  'Djibouti': 'dj', 'Dominican Republic': 'do', 'East Timor': 'tl', 'Ecuador': 'ec',
  'El Salvador': 'sv', 'Equatorial Guinea': 'gq', 'Eritrea': 'er', 'Estonia': 'ee',
  'Fiji': 'fj', 'Gabon': 'ga', 'Gambia': 'gm', 'Georgia': 'ge', 'Guatemala': 'gt',
  'Guinea': 'gn', 'Guinea-Bissau': 'gw', 'Guyana': 'gy', 'Haiti': 'ht',
  'Honduras': 'hn', 'Jamaica': 'jm', 'Jordan': 'jo', 'Kosovo': 'xk', 'Kuwait': 'kw',
  'Kyrgyz Republic': 'kg', 'Laos': 'la', 'Latvia': 'lv', 'Lebanon': 'lb',
  'Lesotho': 'ls', 'Liberia': 'lr', 'Lithuania': 'lt', 'Luxembourg': 'lu',
  'Macedonia': 'mk', 'Madagascar': 'mg', 'Malawi': 'mw', 'Maldives': 'mv',
  'Mali': 'ml', 'Malta': 'mt', 'Mauritania': 'mr', 'Mauritius': 'mu',
  'Moldova': 'md', 'Montenegro': 'me', 'Mozambique': 'mz', 'Namibia': 'na',
  'Nicaragua': 'ni', 'Niger': 'ne', 'Oman': 'om', 'Panama': 'pa',
  'Papua New Guinea': 'pg', 'Paraguay': 'py', 'Puerto Rico': 'pr', 'Qatar': 'qa',
  'Rwanda': 'rw', 'Senegal': 'sn', 'Serbia': 'rs', 'Sierra Leone': 'sl',
  'Singapore': 'sg', 'Slovakia': 'sk', 'Slovenia': 'si', 'Solomon Islands': 'sb',
  'Somalia': 'so', 'South Sudan': 'ss', 'Surinam': 'sr', 'Swaziland': 'sz',
  'Tajikistan': 'tj', 'Tanzania': 'tz', 'Togo': 'tg', 'Trinidad and Tobago': 'tt',
  'Tunisia': 'tn', 'Turkmenistan': 'tm', 'Uganda': 'ug', 'United Arab Emirates': 'ae',
  'Uruguay': 'uy', 'Uzbekistan': 'uz', 'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw',
  "Korea, People's Republic of": 'kp', 'Vietnam, Democratic Republic of': 'vn', 'Vietnam, Republic of': 'vn',
  // —— 海外属地 / 特殊地区补充 ——
  'German Federal Republic': 'de', 'Rumania': 'ro', "Yemen, People's Republic of": 'ye',
  'Palestine': 'ps', 'Gaza': 'ps', 'West Bank': 'ps',
  'New Caledonia and Dependencies': 'nc', 'French Polynesia': 'pf', 'Guadeloupe': 'gp',
  'Martinique': 'mq', 'Reunion': 're', 'French Guyana': 'gf', 'Papua': 'pg',
};
export function flagOf(enName) {
  if (!enName) return '';
  if (FLAGS[enName]) return FLAGS[enName];
  const base = String(enName).replace(/\s*\([^)]*\)\s*$/, '').trim(); // 去括号后缀
  return FLAGS[base] || '';
}

export function createPanel({ onToggleLayer, onReset, onShowInfo, rulerName, onWarList, onExitWar, onReplayWar }) {
  const tTerritory = document.getElementById('toggle-territory');
  const tOutline = document.getElementById('toggle-outline');
  const tRegion = document.getElementById('toggle-region');
  // 分隔线 + 中国疆域专属图层整块（世界模式下整体隐藏，含分隔线本身）
  const groupChina = document.getElementById('group-china');
  const tRiver = document.getElementById('toggle-river');
  const tRiverLabel = document.getElementById('toggle-river-label');
  const tMountain = document.getElementById('toggle-mountain');
  const tRelief = document.getElementById('toggle-relief');
  const tLake = document.getElementById('toggle-lake');
  const tBasemap = document.getElementById('toggle-basemap');
  const tZh = document.getElementById('toggle-zh');
  const tPolity = document.getElementById('toggle-polity');
  const tProvince = document.getElementById('toggle-province');
  const tPass = document.getElementById('toggle-pass');
  const tCity = document.getElementById('toggle-city');
  // 第四幅图（中国近代史）专属开关
  const tMFaction = document.getElementById('toggle-mfaction');
  const tMEvent = document.getElementById('toggle-mevent');
  const tMPort = document.getElementById('toggle-mport');
  const tMRail = document.getElementById('toggle-mrail');
  const tMConcession = document.getElementById('toggle-mconcession');
  const tMSphere = document.getElementById('toggle-msphere');
  const tMProvince = document.getElementById('toggle-mprovince');
  const resetBtn = document.getElementById('reset-view');
  const info = document.getElementById('info');
  const infoClose = document.getElementById('info-close');
  const infoEvents = document.getElementById('info-events');
  const btnHelp = document.getElementById('btn-help');
  const panelHelp = document.getElementById('panel-help');
  const warPlaying = document.getElementById('war-playing');
  const warPlayingName = document.getElementById('war-playing-name');
  const warPlayingExit = document.getElementById('war-playing-exit');
  const warPlayingReplay = document.getElementById('war-playing-replay');
  const panelWar = document.getElementById('panel-war');

  let lastProps = null; // 当前展示的对象（国家 or 山脉），用于年份/语言变化时刷新

  tTerritory.addEventListener('change', () => onToggleLayer('territory', tTerritory.checked));
  tOutline?.addEventListener('change', () => onToggleLayer('outline', tOutline.checked));
  tRegion?.addEventListener('change', () => onToggleLayer('region', tRegion.checked));
  tRiver.addEventListener('change', () => onToggleLayer('river', tRiver.checked));
  tRiverLabel?.addEventListener('change', () => onToggleLayer('riverLabel', tRiverLabel.checked));
  tMountain.addEventListener('change', () => onToggleLayer('mountain', tMountain.checked));
  tRelief?.addEventListener('change', () => onToggleLayer('relief', tRelief.checked));
  tLake.addEventListener('change', () => onToggleLayer('lake', tLake.checked));
  tBasemap.addEventListener('change', () => onToggleLayer('basemapLand', tBasemap.checked));
  tZh.addEventListener('change', () => onToggleLayer('zh', tZh.checked));
  tPolity?.addEventListener('change', () => onToggleLayer('polity', tPolity.checked));
  tProvince?.addEventListener('change', () => onToggleLayer('provinceRef', tProvince.checked));
  tPass?.addEventListener('change', () => onToggleLayer('pass', tPass.checked));
  tCity?.addEventListener('change', () => onToggleLayer('city', tCity.checked));
  tMFaction?.addEventListener('change', () => onToggleLayer('mfaction', tMFaction.checked));
  tMEvent?.addEventListener('change', () => onToggleLayer('mevent', tMEvent.checked));
  tMPort?.addEventListener('change', () => onToggleLayer('mport', tMPort.checked));
  tMRail?.addEventListener('change', () => onToggleLayer('mrail', tMRail.checked));
  tMConcession?.addEventListener('change', () => onToggleLayer('mconcession', tMConcession.checked));
  tMSphere?.addEventListener('change', () => onToggleLayer('msphere', tMSphere.checked));
  tMProvince?.addEventListener('change', () => onToggleLayer('mprovince', tMProvince.checked));
  // 「!」圆圈：把原先面板底部的数据来源说明收进弹层（面板本身保持干净）
  btnHelp?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!panelHelp) return;
    panelHelp.classList.toggle('hidden');
    btnHelp.classList.toggle('active', !panelHelp.classList.contains('hidden'));
  });
  document.addEventListener('click', (e) => {
    if (!panelHelp || panelHelp.classList.contains('hidden')) return;
    if (panelHelp.contains(e.target) || btnHelp?.contains(e.target)) return;
    panelHelp.classList.add('hidden');
    btnHelp?.classList.remove('active');
  });
  warPlayingExit?.addEventListener('click', () => { if (onExitWar) onExitWar(); });
  warPlayingReplay?.addEventListener('click', () => { if (onReplayWar) onReplayWar(); });
  // 第三幅图：战争列表页入口（独立"战争"面板，仅中国古代史模式显示）
  const btnWarList = document.getElementById('btn-war-list');
  btnWarList?.addEventListener('click', () => {
    if (onWarList) onWarList();
  });
  resetBtn.addEventListener('click', onReset);
  const closeInfo = () => {
    info.classList.add('hidden');
    infoEvents.classList.add('hidden');
    infoEvents.innerHTML = '';
    lastProps = null;
  };
  infoClose.addEventListener('click', closeInfo);

  const STATUS_LABEL = {
    independent: ['独立国家', '#96be8c'],
    colony: ['殖民地', '#e6c882'],
    protectorate: ['保护国', '#e1a05a'],
    mandate: ['托管地', '#be82b4'],
    occupied: ['被占领土', '#c84646'],
  };

  function hideEvents() {
    if (infoEvents) {
      infoEvents.classList.add('hidden');
      infoEvents.innerHTML = '';
    }
  }

  // 在简介下方渲染"截至当前年份的重大历史事件"独立板块
  function renderEvents(props) {
    if (!infoEvents) return;
    const enName = props.cntry_name || '';
    const cnName = zhCountry(enName, props.snapYear ?? props.gwsyear ?? null);
    const zhOn = document.getElementById('toggle-zh')?.checked;
    const viewYear = parseInt(document.getElementById('year-display')?.textContent || '0', 10) || 0;
    const events = getEvents(enName)
      .filter((e) => e.year <= viewYear)
      .slice()
      .sort((a, b) => a.year - b.year);
    if (!events.length) {
      hideEvents();
      return;
    }
    const head = zhOn && cnName !== enName ? `${cnName}（${enName}）` : enName;
    const items = events
      .map(
        (e) =>
          `<li><span class="ev-year">${e.year}</span>` +
          `<span class="ev-main"><span class="ev-title">${e.title}</span>` +
          (e.desc ? `<span class="ev-desc">${e.desc}</span>` : '') +
          `</span></li>`
      )
      .join('');
    infoEvents.innerHTML =
      `<div class="ev-head">📜 ${head} · 重大历史事件<br/>` +
      `<span class="ev-sub">截至 ${viewYear} 年，共 ${events.length} 条</span></div>` +
      `<ul class="ev-list">${items}</ul>`;
    infoEvents.classList.remove('hidden');
  }

  function render(props) {
    const name = document.getElementById('info-name');
    const body = document.getElementById('info-body');
    const viewYear = parseInt(document.getElementById('year-display')?.textContent || '0', 10) || null;
    // 山脉点没有政权时间属性，单独处理
    if (props.status === 'mountain') {
      const en = props.name || '山脉';
      const cn = zh(MOUNTAIN_ZH, en);
      const zhOn = document.getElementById('toggle-zh')?.checked;
      name.textContent = zhOn && cn !== en ? `${cn}（${en}）` : en;
      body.innerHTML = `<div><span class="k">类型：</span><span class="status-tag" style="background:#78553a">山脉 / 山峰 / 高原</span></div>`;
      if (props.name) body.innerHTML += `<div><span class="k">名称：</span>${en}${zhOn && cn !== en ? `（${cn}）` : ''}</div>`;
      hideEvents();
      info.classList.remove('hidden');
      if (onShowInfo) onShowInfo(props);
      return;
    }
    const enName = props.cntry_name || '未知政权';
    // 台湾 / 西藏：中国领土不可分割的一部分，不单独作为“国家”介绍。
    // （CShapes 沿用 COW 体系，把 1946 年后的台湾、1913–1950 年的西藏记为
    //  independent 独立政权；已在 loaders.js 里并入 China 渲染，这里负责文案。）
    if (enName === 'Taiwan' || (props.isChinaPart && props.cntry_orig)) {
      const zone = props.zh_override || (enName === 'Taiwan' ? '中国台湾' : '中国西藏');
      const jpEra = enName === 'Taiwan' && props.status === 'colony' && props.gweyear <= 1945;
      name.textContent = zone;
      const cnFlag = document.createElement('img');
      cnFlag.className = 'flag'; cnFlag.src = 'flags/cn.svg'; cnFlag.alt = 'cn';
      name.prepend(cnFlag);
      body.innerHTML =
        `<div><span class="k">归属：</span><span class="status-tag" style="background:#c84646">中国</span></div>` +
        `<div><span class="k">说明：</span>${zone}是中国领土不可分割的一部分，自古以来就是中国的一部分。` +
        (jpEra
          ? '1895 年《马关条约》后被日本侵占，1945 年抗战胜利后归还中国。'
          : '1945 年抗战胜利后，台湾重归中国版图。') +
        `</div>`;
      if (!jpEra && props.gwsyear != null) {
        body.innerHTML += `<div><span class="k">图示区间：</span>${props.gwsyear} – ${props.gweyear >= 2023 ? '今' : props.gweyear}</div>`;
      }
      info.classList.remove('hidden');
      hideEvents();
      lastProps = null; // 静态卡：不随世界模式年份拖动而刷新
      if (onShowInfo) onShowInfo(props);
      return;
    }
    // 传年份才能区分同名政权："Jin" 在晋朝快照译"西晋/东晋"、Song Empire 分北宋/南宋
    // ⚠️ 顺序重要：CShapes 的 gwsyear 是「该疆域切片的起始年」（如美国 1886 年那片），
    // 与当前视图年份可相差百年；用它去查年代感知译名/简介会取错条目。故优先用视图年份。
    const infoYear = props.snapYear ?? viewYear ?? props.gwsyear ?? null;
    const cnName = zhCountry(enName, infoYear);
    const flag = flagOf(enName);
    name.textContent = bilingual(cnName, enName);
    if (flag) {
      const img = document.createElement('img');
      img.className = 'flag';
      img.src = `flags/${flag}.svg`;
      img.alt = flag;
      name.prepend(img);
    }

    const st = STATUS_LABEL[props.status] || ['其他', '#999'];
    // 非独立政权（殖民地/保护国/托管地/被占领土）：CShapes ruledby=宗主国/占领国 GW 编码
    const RULE_LABEL = { colony: '殖民主国', protectorate: '宗主国', mandate: '托管国', occupied: '占领国' };
    const rows = [];
    // ⚠️ 两种数据源的"时间"含义完全不同，必须分开显示，否则严重误导：
    //   · CShapes（1886–2023）：gwsyear~gweyear 是该片疆域的真实有效期；
    //   · historical-basemaps（1886 年前）：只有"年代快照"年份，
    //     **不是**政权存续时间（把 1279 年的元显示成"存续 1279–1299 / 历时 20 年"是错的）。
    const start = props.gwsyear != null ? props.gwsyear : null;
    const end = props.gweyear != null ? props.gweyear : null;
    if (props.isSnapshot) {
      const y = props.snapYear, e = props.snapEnd;
      rows.push(
        `<div><span class="k">本图年代：</span>${y != null ? y : '?'}` +
          `${e != null && e > y ? `（此图表示该年疆域，适用至 ${e} 年前）` : ''}</div>`
      );
      rows.push(
        `<div style="color:#8a6a4a;font-size:12px">年代快照：仅表示该年疆域，政权存续起止请以史料为准</div>`
      );
    } else if (start != null) {
      const ongoing = end == null || end >= 2023;
      if (end != null && end === start) {
        // 年内切片：如美国 1959-01-02 ~ 1959-08-19（阿拉斯加建州后、夏威夷建州前）
        rows.push(`<div><span class="k">存续：</span>${start} 年内（疆域变更过渡片，不足 1 年）</div>`);
      } else {
        const endLabel = ongoing ? '今' : end;
        rows.push(`<div><span class="k">存续：</span>${start} – ${endLabel}</div>`);
        const calcEnd = ongoing ? Math.min(viewYear || 2023, 2023) : end;
        const dur = Math.max(0, calcEnd - start);
        rows.push(`<div><span class="k">历时：</span>约 ${dur} 年${ongoing ? '（延续中）' : ''}</div>`);
      }
    }
    if (viewYear) rows.push(`<div><span class="k">当前视图年份：</span>${viewYear}</div>`);
    rows.push(
      `<div><span class="k">类型：</span><span class="status-tag" style="background:${st[1]}">${st[0]}</span></div>`
    );
    // 宗主国 / 占领国：CShapes 用 ruledby（GW 编码反查），
    // historical-basemaps（1886 年前）直接带 SUBJECTO 国名字符串。
    if (RULE_LABEL[props.status]) {
      let rulerZh = '';
      if (props.subjecto) {
        rulerZh = zhCountry(props.subjecto, infoYear) || props.subjecto;
      } else if (typeof rulerName === 'function') {
        const rulerEn = rulerName(props.ruledby, viewYear ?? props.snapYear ?? props.gwsyear ?? 2023);
        if (rulerEn) rulerZh = zhCountry(rulerEn, infoYear) || rulerEn; // 俄罗斯（苏联）/ 德国（普鲁士）等历史别名均可译出
      }
      if (rulerZh) {
        rows.push(`<div><span class="k">${RULE_LABEL[props.status]}：</span>${rulerZh}</div>`);
      }
    }
    if (props.capname) rows.push(`<div><span class="k">首都：</span>${props.capname}</div>`);
    if (props.area != null)
      rows.push(`<div><span class="k">面积：</span>${Math.round(Number(props.area)).toLocaleString()} km²</div>`);
    if (props.gwcode != null) rows.push(`<div><span class="k">GW 编码：</span>${props.gwcode}</div>`);
    // 简介：优先查历史政权简介表（含民族/人种与关键事件）；
    // 未收录的政权按名称类型 + 所在地区自动生成兜底文案，保证介绍栏不空白。
    const desc = polityDesc(enName, infoYear)
      || fallbackDesc(enName, { year: infoYear, region: props.region, zh: cnName });
    if (desc) rows.push(`<div><span class="k">简介：</span>${desc}</div>`);
    body.innerHTML = rows.join('');
    info.classList.remove('hidden');
    if (onShowInfo) onShowInfo(props);
    renderEvents(props);
  }

  return {
    // 面板按视图模式分组：分隔线以上为公共图层（两种模式都有效）；
    // 分隔线以下（史实边界参考线 / 历代政区界）数据只覆盖中国，世界模式整体隐藏，
    // 连分隔线一起收起，避免面板出现一条空线。
    setMode(m) {
      if (groupChina) groupChina.style.display = m === 'china' ? '' : 'none';
      const groupHist = document.getElementById('group-chinahist');
      if (groupHist) groupHist.style.display = m === 'chinaHist' ? '' : 'none';
      const groupModern = document.getElementById('group-modern');
      if (groupModern) groupModern.style.display = m === 'modern' ? '' : 'none';
      // 近代史不用「历史疆域」这一项（控制区由「控制区」开关管），把这一行藏起来，
      // 否则会出现一个勾了没反应、或看着像"疆域没显示"的死开关。
      const tTerritoryRow = document.getElementById('toggle-territory')?.closest('label');
      if (tTerritoryRow) tTerritoryRow.style.display = m === 'modern' ? 'none' : '';
      // 战争卡独立成块：中国古代史 / 中国近代史两个模式都需要（其余模式整块隐藏）
      if (panelWar) panelWar.classList.toggle('hidden', m !== 'chinaHist' && m !== 'modern');
      // 近代史在这张卡里额外挂"年表 / 专题"两个入口；古代史只有战争，标题也退回"战争"
      const warTools = document.getElementById('war-modern-tools');
      if (warTools) warTools.classList.toggle('hidden', m !== 'modern');
      const warTitle = document.getElementById('war-panel-title');
      if (warTitle) warTitle.textContent = m === 'modern' ? '战争与叙事' : '战争';
    },
    // 由 main.setMode 在切换模式后调用：把图层默认同步到面板勾选框
    syncCheckboxes(state) {
      const map = {
        territory: tTerritory, outline: tOutline, region: tRegion, river: tRiver,
        riverLabel: tRiverLabel, mountain: tMountain, relief: tRelief, lake: tLake,
        basemapLand: tBasemap, zh: tZh, polity: tPolity, provinceRef: tProvince,
        pass: tPass, city: tCity,
        mfaction: tMFaction, mevent: tMEvent, mport: tMPort, mrail: tMRail,
        mconcession: tMConcession, msphere: tMSphere, mprovince: tMProvince,
      };
      for (const k in map) {
        const el = map[k];
        if (el && state[k] !== undefined) el.checked = !!state[k];
      }
    },
    // 战争回放状态条（传入 null 表示未在回放）
    setWarPlaying(title) {
      if (!warPlaying) return;
      if (!title) {
        warPlaying.classList.add('hidden');
        if (warPlayingName) warPlayingName.textContent = '';
        return;
      }
      if (warPlayingName) warPlayingName.textContent = title;
      warPlaying.classList.remove('hidden');
    },
    showInfo(props) {
      lastProps = props;
      render(props);
    },
    // 当前展示中的对象（供世界模式按年份同步卡片；无则为 null）
    currentProps() {
      return lastProps;
    },
    // 关闭/清空介绍卡（如世界模式拖动到该国已不存在的年份）
    hide() {
      closeInfo();
    },
    // 中国历代疆域模式：展示朝代详情卡（起止/都城/简介/大事）；state=战国政权名（可选）
    showChinaInfo(d, state, year) {
      if (!d) {
        info.classList.add('hidden');
        hideEvents();
        lastProps = null;
        return;
      }
      const fy = (y) => (y < 0 ? `前${-y}` : `${y}`);
      lastProps = null; // 朝代卡不参与世界模式的 rerender
      const name = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      // 政权按年份取（同一政权名可能有多段，如辽 1115 前后、蒙古逐年南下）
      const live = year == null ? (d.states || []) : statesAtYear(d, year);
      const st = state ? live.find((s) => s.name === state) : null;
      const cap = st ? (st.capital || state) : d.capital;
      const desc = (st && st.desc) || d.desc;
      const span = st && st.start != null ? `${fy(st.start)} – ${fy(st.end)}` : `${fy(d.start)} – ${fy(d.end)}`;
      name.textContent = state
        ? `${state} · ${d.name}（${span}）`
        : `${d.name}（${span}）`;
      // 空档年（如楚汉相争 -205~-203、王莽新朝 9~24）：图示沿用前朝疆域，需明确提示
      const interregnum = year != null && isInterregnum(year);
      body.innerHTML =
        `<div><span class="k">起止：</span>${span}</div>` +
        (interregnum
          ? `<div style="color:#8a6a4a;font-size:12px">⚠️ ${year} 年处于王朝更替过渡期（无独立王朝数据），图示沿用${d.name}疆域</div>`
          : '') +
        `<div><span class="k">都城：</span>${cap}</div>` +
        `<div><span class="k">简介：</span>${desc}</div>`;
      info.classList.remove('hidden');
      if (infoEvents) {
        const evs = (d.events || []).slice().sort((a, b) => a.year - b.year);
        if (evs.length) {
          const items = evs
            .map(
              (e) =>
                `<li><span class="ev-year">${fy(e.year)}</span>` +
                `<span class="ev-main"><span class="ev-title">${e.title}</span>` +
                (e.desc ? `<span class="ev-desc">${e.desc}</span>` : '') +
                `</span></li>`
            )
            .join('');
          infoEvents.innerHTML =
            `<div class="ev-head">📜 ${d.name}朝 · 重大事件<br/>` +
            `<span class="ev-sub">共 ${evs.length} 条</span></div>` +
            `<ul class="ev-list">${items}</ul>`;
          infoEvents.classList.remove('hidden');
        } else {
          hideEvents();
        }
      }
    },
    // 中国历代疆域模式：点击某个历史政区（州/郡/府/路）时的详情卡
    showChinaRegion(props, d) {
      if (!props) return;
      const fy = (y) => (y < 0 ? `前${-y}` : `${y}`);
      lastProps = null; // 政区卡不参与世界模式的 rerender
      const name = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      name.textContent = `${props.name}${props.type ? `（${props.type}）` : ''}`;
      body.innerHTML =
        `<div><span class="k">所属朝代：</span>${props.dynastyName || (d ? d.name : '—')}` +
        (d ? `（${fy(d.start)} – ${fy(d.end)}）` : '') +
        `</div>` +
        `<div><span class="k">政区类型：</span><span class="status-tag" style="background:#8a6d3b">${props.type || '政区'}</span></div>` +
        `<div><span class="k">设置年代：</span>${fy(props.beg)} – ${fy(props.end)}</div>` +
        (props.namePy ? `<div><span class="k">罗马字：</span>${props.namePy}</div>` : '') +
        `<div><span class="k">数据来源：</span>CHGIS 历史政区（示意精度）</div>`;
      info.classList.remove('hidden');
      hideEvents(); // 政区层面暂无独立大事表
    },
    // 年份或中英文切换后，刷新当前打开的卡片（简介 + 事件板块同步）
    rerender() {
      // 守卫：卡片处于关闭状态（如模式切换后）时不得借刷新重新弹出
      if (lastProps && !info.classList.contains('hidden')) render(lastProps);
    },
    // 第三模式「中国古代史」：关隘 / 城市 / 战役 通用信息卡
    // p 由 features.js 的 passCard/cityCard/battleCard 归一化：{name, kind, desc, lines:[[k,v]...]}
    showPlace(p) {
      if (!p) {
        info.classList.add('hidden');
        hideEvents();
        lastProps = null;
        return;
      }
      lastProps = null; // 静态卡：不参与世界模式 rerender
      const nameEl = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      nameEl.textContent = p.kind ? `${p.name}（${p.kind}）` : p.name;
      const rows = [];
      for (const [k, v] of p.lines || []) {
        if (v) rows.push(`<div><span class="k">${k}：</span>${v}</div>`);
      }
      // 长文段落（近代史事件用）：卡片里按自然段排，段间留白，读起来不像一坨
      for (const para of p.paras || []) {
        if (para) rows.push(`<p class="card-p">${para}</p>`);
      }
      if (p.desc) rows.push(`<div><span class="k">简介：</span>${p.desc}</div>`);
      body.innerHTML = rows.join('');
      info.classList.remove('hidden');
      hideEvents();
    },
    // 第三模式「中国古代史」：政权信息卡（存续/都城/类型/简介/重大事件）
    showPolity(p) {
      if (!p) {
        info.classList.add('hidden');
        hideEvents();
        lastProps = null;
        return;
      }
      const fy = (y) => (y < 0 ? `前${-y}` : `${y}`);
      lastProps = null; // 政权卡不参与世界模式的 rerender
      const nameEl = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      nameEl.textContent = `${p.name}（${p.typeLabel}）`;
      const span = `${fy(p.start)} – ${fy(p.end)}`;
      const rows = [
        `<div><span class="k">存续：</span>${span}</div>`,
        `<div><span class="k">都城：</span>${p.capital}</div>`,
        `<div><span class="k">类型：</span><span class="status-tag" style="background:${p.type === 'central' ? '#b2543a' : '#5c6c94'}">${p.typeLabel}</span></div>`,
        `<div><span class="k">简介：</span>${p.desc}</div>`,
      ];
      body.innerHTML = rows.join('');
      info.classList.remove('hidden');
      if (infoEvents) {
        const evs = (p.events || []).slice().sort((a, b) => a.year - b.year);
        if (evs.length) {
          const items = evs
            .map(
              (e) =>
                `<li><span class="ev-year">${fy(e.year)}</span>` +
                `<span class="ev-main"><span class="ev-title">${e.title}</span>` +
                (e.desc ? `<span class="ev-desc">${e.desc}</span>` : '') +
                `</span></li>`
            )
            .join('');
          infoEvents.innerHTML =
            `<div class="ev-head">📜 ${p.name} · 重大事件<br/>` +
            `<span class="ev-sub">共 ${evs.length} 条</span></div>` +
            `<ul class="ev-list">${items}</ul>`;
          infoEvents.classList.remove('hidden');
        } else {
          hideEvents();
        }
      }
    },
  };
}
