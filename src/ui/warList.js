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

export function createWarList({ onSelect } = {}) {
  const root = document.getElementById('war-list');
  const body = document.getElementById('war-list-body');
  const closeBtn = document.getElementById('war-list-close');
  const select = document.getElementById('war-era-select');
  const countEl = document.getElementById('war-era-count');
  if (!root || !body) return { open() {}, close() {}, toggle() {}, isOpen: () => false, setActive() {} };

  let activeId = null;
  let era = ALL; // 当前筛选：ALL 或某个朝代名

  // 下拉框选项：只在首次打开/数据变化时重建（选项来自数据，静态）
  function fillOptions(groups) {
    if (!select || select.options.length) return;
    const total = groups.reduce((n, g) => n + g.wars.length, 0);
    select.innerHTML =
      `<option value="${ALL}">全部朝代（${total} 场）</option>` +
      groups.map((g) => `<option value="${g.era}">${g.era}（${g.wars.length} 场）</option>`).join('');
    select.value = ALL;
  }

  function render() {
    const groups = warListGroups();
    fillOptions(groups);
    const list = era === ALL ? groups : groups.filter((g) => g.era === era);
    const total = list.reduce((n, g) => n + g.wars.length, 0);
    if (countEl) countEl.textContent = `${total} 场`;
    body.innerHTML = list
      .map(
        (g) =>
          `<div class="wl-era">${g.era}</div>` +
          g.wars
            .map((w) => {
              const ps = (w.parties || []).map((p) => p.short || p.name).join(' vs ');
              return (
                `<button type="button" class="wl-item${w.id === activeId ? ' active' : ''}" data-war="${w.id}">` +
                `<span class="wl-row1"><span class="wl-name">${w.meta.title}</span>` +
                `<span class="wl-year">${fy(w.meta.start)} · ${w.meta.era || ''}</span></span>` +
                `<span class="wl-row2">${ps}　·　${w.meta.place || ''}</span>` +
                `<span class="wl-row3">${w.meta.result || ''}</span>` +
                `</button>`
              );
            })
            .join('')
      )
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
