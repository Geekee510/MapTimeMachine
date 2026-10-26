// 战争列表页（弹层）
// ---------------------------------------------------------------------------
// 目的：把散落在时间轴上的战争集中成一个可浏览的目录。选中某一条 → 回调
// onSelect(warId)，由 main.js 负责「跳到该年 + 开战争层 + 聚焦战区 + 单独回放」。
// 数据全部来自 modes/chinaHist/wars.js，本文件不持有任何战争内容（纯 UI）。
import { warListGroups } from '../modes/chinaHist/wars.js';

const fy = (y) => {
  const n = Math.round(Math.abs(y) * 10) / 10;
  return y < 0 ? `前${n}` : `${n}`;
};

export function createWarList({ onSelect } = {}) {
  const root = document.getElementById('war-list');
  const body = document.getElementById('war-list-body');
  const closeBtn = document.getElementById('war-list-close');
  if (!root || !body) return { open() {}, close() {}, toggle() {}, isOpen: () => false, setActive() {} };

  let activeId = null;

  function render() {
    const groups = warListGroups();
    body.innerHTML = groups
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
