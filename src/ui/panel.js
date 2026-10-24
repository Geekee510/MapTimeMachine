// 右侧面板：图层开关 + 复位 + 信息卡展示
// CShapes 真实字段：cntry_name / capname / area / gwcode / gwsyear / gweyear / status
import { zhCountry, zh, bilingual, RIVER_ZH, MOUNTAIN_ZH } from '../data/i18n.js';
import { getEvents } from '../data/events.js';

// 国旗图片（flag-icons SVG，MIT）：按 CShapes 英文国名 → ISO 3166-1 alpha-2 小写代码。
// 历史政权去括号后回退到继承国代码。info-name 用 <img> 渲染（Windows 不支持 emoji 旗帜字形）。
const FLAGS = {
  'China': 'cn', 'United States of America': 'us', 'Russia': 'ru',
  'Russia (Soviet Union)': 'ru', 'United Kingdom': 'gb', 'France': 'fr',
  'Germany': 'de', 'Germany (Prussia)': 'de', 'Japan': 'jp', 'India': 'in',
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
};
function flagOf(enName) {
  if (!enName) return '';
  if (FLAGS[enName]) return FLAGS[enName];
  const base = String(enName).replace(/\s*\([^)]*\)\s*$/, '').trim(); // 去括号后缀
  return FLAGS[base] || '';
}

export function createPanel({ onToggleLayer, onReset, onShowInfo }) {
  const tTerritory = document.getElementById('toggle-territory');
  const tRiver = document.getElementById('toggle-river');
  const tMountain = document.getElementById('toggle-mountain');
  const tLake = document.getElementById('toggle-lake');
  const tBasemap = document.getElementById('toggle-basemap');
  const tZh = document.getElementById('toggle-zh');
  const resetBtn = document.getElementById('reset-view');
  const info = document.getElementById('info');
  const infoClose = document.getElementById('info-close');
  const infoEvents = document.getElementById('info-events');

  let lastProps = null; // 当前展示的对象（国家 or 山脉），用于年份/语言变化时刷新

  tTerritory.addEventListener('change', () => onToggleLayer('territory', tTerritory.checked));
  tRiver.addEventListener('change', () => onToggleLayer('river', tRiver.checked));
  tMountain.addEventListener('change', () => onToggleLayer('mountain', tMountain.checked));
  tLake.addEventListener('change', () => onToggleLayer('lake', tLake.checked));
  tBasemap.addEventListener('change', () => onToggleLayer('basemapLand', tBasemap.checked));
  tZh.addEventListener('change', () => onToggleLayer('zh', tZh.checked));
  resetBtn.addEventListener('click', onReset);
  infoClose.addEventListener('click', () => {
    info.classList.add('hidden');
    infoEvents.classList.add('hidden');
    infoEvents.innerHTML = '';
    lastProps = null;
  });

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
    const cnName = zhCountry(enName);
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
    const cnName = zhCountry(enName);
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
    const rows = [];
    const start = props.gwsyear != null ? props.gwsyear : null;
    const end = props.gweyear != null ? props.gweyear : null;
    const ongoing = end == null || end >= 2023;
    const endLabel = ongoing ? '今' : end;
    rows.push(
      `<div><span class="k">存续：</span>${start != null ? start : '?'} – ${endLabel}</div>`
    );
    if (start != null) {
      const calcEnd = ongoing ? (viewYear || 2023) : end;
      const dur = Math.max(0, calcEnd - start);
      rows.push(`<div><span class="k">历时：</span>约 ${dur} 年${ongoing ? '（延续中）' : ''}</div>`);
    }
    if (viewYear) rows.push(`<div><span class="k">当前视图年份：</span>${viewYear}</div>`);
    rows.push(
      `<div><span class="k">类型：</span><span class="status-tag" style="background:${st[1]}">${st[0]}</span></div>`
    );
    if (props.capname) rows.push(`<div><span class="k">首都：</span>${props.capname}</div>`);
    if (props.area != null)
      rows.push(`<div><span class="k">面积：</span>${Math.round(Number(props.area)).toLocaleString()} km²</div>`);
    if (props.gwcode != null) rows.push(`<div><span class="k">GW 编码：</span>${props.gwcode}</div>`);
    body.innerHTML = rows.join('');
    info.classList.remove('hidden');
    if (onShowInfo) onShowInfo(props);
    renderEvents(props);
  }

  return {
    // 中国模式：自动展示“中国介绍”总览卡（名称/简介 + 中国重大历史事件）
    showChinaOverview() {
      lastProps = null;
      const name = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      name.textContent = '中国（China）';
      const cnFlag = document.createElement('img');
      cnFlag.className = 'flag';
      cnFlag.src = 'flags/cn.svg';
      cnFlag.alt = 'cn';
      name.prepend(cnFlag);
      body.innerHTML =
        `<div><span class="k">类型：</span><span class="status-tag" style="background:#c84646">文明古国 / 统一多民族国家</span></div>` +
        `<div><span class="k">简介：</span>中华文明发源于黄河、长江流域，延续五千年；历夏商周、秦汉、隋唐、宋元、明清至近现代，形成统一多民族国家。</div>`;
      info.classList.remove('hidden');
      if (infoEvents) {
        const evs = getEvents('China').slice().sort((a, b) => a.year - b.year);
        if (evs.length) {
          const items = evs
            .map(
              (e) =>
                `<li><span class="ev-year">${e.year}</span>` +
                `<span class="ev-main"><span class="ev-title">${e.title}</span>` +
                (e.desc ? `<span class="ev-desc">${e.desc}</span>` : '') +
                `</span></li>`
            )
            .join('');
          infoEvents.innerHTML =
            `<div class="ev-head">📜 中国 · 重大历史事件<br/>` +
            `<span class="ev-sub">共 ${evs.length} 条</span></div>` +
            `<ul class="ev-list">${items}</ul>`;
          infoEvents.classList.remove('hidden');
        } else {
          hideEvents();
        }
      }
    },
    showInfo(props) {
      lastProps = props;
      render(props);
    },
    // 中国历代疆域模式：展示朝代详情卡（起止/都城/简介/大事）；state=战国政权名（可选）
    showChinaInfo(d, state) {
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
      const cap = state ? (d.states?.find((s) => s.name === state)?.capital || state) : d.capital;
      name.textContent = state
        ? `${state} · ${d.name}（${fy(d.start)} – ${fy(d.end)}）`
        : `${d.name}（${fy(d.start)} – ${fy(d.end)}）`;
      body.innerHTML =
        `<div><span class="k">起止：</span>${fy(d.start)} – ${fy(d.end)}</div>` +
        `<div><span class="k">都城：</span>${cap}</div>` +
        `<div><span class="k">简介：</span>${d.desc}</div>`;
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
    // 年份或中英文切换后，刷新当前打开的卡片（简介 + 事件板块同步）
    rerender() {
      if (lastProps) render(lastProps);
    },
  };
}
