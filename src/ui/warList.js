// 战争列表页（弹层）
// ---------------------------------------------------------------------------
// 目的：把散落在时间轴上的战争集中成一个可浏览的目录。选中某一条 → 回调
// onSelect(warId)，由 main.js 负责「跳到该年 + 开战争层 + 聚焦战区 + 单独回放」。
// 数据全部来自 modes/chinaHist/wars.js，本文件不持有任何战争内容（纯 UI）。
//
// 顶部有朝代下拉框：选项按 warListGroups() 的分组生成（自带场次数），
// 选「全部」显示整份目录，选某个朝代只渲染那一组。
import { warListGroups } from '../modes/chinaHist/wars.js';

// 年份显示：史料里"同年内的一两个月"会被写成 -1046.05 这样的数（用于排序与时间轴），
// 显示时不应变成"前1046.1"。零头小于 0.15 年就按整数年显示，其余保留一位小数。
const fy = (y) => {
  const a = Math.abs(y);
  const frac = a % 1;
  const n = frac < 0.15 || frac > 0.85 ? Math.round(a) : Math.round(a * 10) / 10;
  return y < 0 ? `前${n}` : `${n}`;
};

const ALL = '__all__';

// groups 可注入：第四幅图（近代史）的战争目录来自 MODERN_WARS（分组是"晚清/军阀/
// 红军/抗战/解放"而不是朝代），结构同 { era, wars[] }，所以同一套 UI 直接复用。
// 不传则用内置的古代战争分组。
export function createWarList({ onSelect, onSpecial, groups: groupsFn, fy: fyFn, allLabel = '全部朝代' } = {}) {
  const root = document.getElementById('war-list');
  const body = document.getElementById('war-list-body');
  const closeBtn = document.getElementById('war-list-close');
  const select = document.getElementById('war-era-select');
  const countEl = document.getElementById('war-era-count');
  if (!root || !body) return { open() {}, close() {}, toggle() {}, isOpen: () => false, setActive() {} };

  const allLabelOf = () => (typeof allLabel === 'function' ? allLabel() : allLabel);
  const sourceGroups = () => (typeof groupsFn === 'function' ? groupsFn() : warListGroups());
  // 年份格式按模式切换：古代用"前1046"这类整数年，近代要保留"1937 年 7 月"的月份。
  // 注入的函数返回 null 时回退到内置 fy()（避免两套格式逻辑重复写）。
  const yearText = (y) => {
    if (typeof fyFn === 'function') {
      const r = fyFn(y);
      if (r != null) return r;
    }
    return fy(y);
  };
  let activeId = null;
  let era = ALL; // 当前筛选：ALL 或某个朝代名

  // 分组里除了"一场一场的战争"，还可能有**专题条目**（g.special）：
  // 例如「红军：从建军到会宁会师」不是一场战役，点开是一段分阶段动画。
  // 两者在同一个列表里排，但专题条目有独立样式，也不计入"场"数。
  const optCount = (g) => g.wars.length + (g.special ? g.special.length : 0);

  // 下拉框选项：只在首次打开/数据变化时重建（选项来自数据，静态）
  let optionsSig = '';
  function fillOptions(groups) {
    if (!select) return;
    // 分组会随模式变化（古代=朝代，近代=时期），所以用"签名"判断是否需要重建选项；
    // 早先写成 `if (select.options.length) return` 后，切到近代史仍显示朝代下拉框。
    const sig = groups.map((g) => g.era).join('|');
    if (sig === optionsSig) return;
    optionsSig = sig;
    const total = groups.reduce((n, g) => n + g.wars.length, 0); // 只数"场"，专题不混进来
    const unitOf = (g) => (g.special ? '项' : '场');
    select.innerHTML =
      `<option value="${ALL}">${allLabelOf()}（${total} 场）</option>` +
      groups
        .map((g) => `<option value="${g.era}">${g.era}（${optCount(g)} ${unitOf(g)}）</option>`)
        .join('');
    select.value = ALL;
  }

  function render() {
    const groups = sourceGroups();
    fillOptions(groups);
    if (era !== ALL && !groups.some((g) => g.era === era)) era = ALL;
    const list = era === ALL ? groups : groups.filter((g) => g.era === era);
    const total = list.reduce((n, g) => n + g.wars.length, 0);
    if (countEl) countEl.textContent = `${total} 场`;
    body.innerHTML = list
      .map((g) => {
        const specials = (g.special || [])
          .map(
            (s) =>
              `<button type="button" class="wl-item wl-special" data-special="${s.id}">` +
              `<span class="wl-row1"><span class="wl-name">★ ${s.title}</span>` +
              `<span class="wl-badge">专题动画</span></span>` +
              `<span class="wl-row2">${s.sub || ''}</span>` +
              `</button>`
          )
          .join('');
        return (
          `<div class="wl-era">${g.era}</div>` +
          specials +
          g.wars
            .map((w) => {
              const ps = (w.parties || []).map((p) => p.short || p.name).join(' vs ');
              return (
                `<button type="button" class="wl-item${w.id === activeId ? ' active' : ''}" data-war="${w.id}">` +
                `<span class="wl-row1"><span class="wl-name">${w.meta.title}</span>` +
                `<span class="wl-year">${[yearText(w.meta.start), w.meta.era].filter(Boolean).join(' · ')}</span></span>` +
                `<span class="wl-row2">${ps}　·　${w.meta.place || ''}</span>` +
                `<span class="wl-row3">${w.meta.result || ''}</span>` +
                `</button>`
              );
            })
            .join('')
        );
      })
      .join('');
  }

  function open() {
    render();
    root.classList.remove('hidden');
    body.scrollTop = 0;
  }
  function close() {
    root.classList.add('hidden');
  }
  function isOpen() {
    return !root.classList.contains('hidden');
  }

  // 事件委托：列表项点击
  body.addEventListener('click', (e) => {
    const sp = e.target.closest('.wl-special');
    if (sp) {
      close();
      if (onSpecial) onSpecial(sp.dataset.special);
      return;
    }
    const btn = e.target.closest('.wl-item');
    if (!btn) return;
    const id = btn.dataset.war;
    if (!id) return;
    activeId = id;
    close();
    if (onSelect) onSelect(id);
  });

  // 切换朝代 → 只重渲染列表正文，不动弹层
  select?.addEventListener('change', () => {
    era = select.value || ALL;
    render();
    body.scrollTop = 0;
  });

  closeBtn?.addEventListener('click', close);
  // 点击遮罩空白处关闭
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });

  return {
    open,
    close,
    isOpen,
    toggle() {
      if (isOpen()) close();
      else open();
    },
    // 从地图上点交战点时同步高亮列表里的对应项
    setActive(id) {
      activeId = id || null;
      if (isOpen()) render();
    },
  };
}
