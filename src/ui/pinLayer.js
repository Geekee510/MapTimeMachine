// 地图图钉层（MapLibre DOM Marker 池）
// ---------------------------------------------------------------------------
// 关隘 / 交战点 / 行军的三角箭头这类"固定像素大小 + 可点击 + 带文字"的标记，用
// MapLibre Marker 比 deck.gl IconLayer 更稳（见 lib/icons.js 的说明）。
// 本模块只做一件事：把 [{id, kind, coord, label, selected, rot, color, idle}]
// 同步到地图上的 DOM 标记，复用已存在的标记（只改位置/类名/文案），多余的下线。
//
// 支持逐帧更新（战争动画里箭头每帧都在动）：
//   coord  经纬度      → marker.setLngLat（MapLibre 内部走 transform，很轻）
//   rot    方位角(度)   → CSS 变量 --rot（只用于三角箭头这类俯视图形）
//   color  阵营色       → CSS 变量 --pin-color（箭头填充色）
//   idle   原地驻守     → 加 is-idle 类
// 为避免每帧重建 DOM，先算一个"签名"，内容没变就整体返回。

import maplibregl from 'maplibre-gl';
import { pinHtml } from '../lib/icons.js';

export function createPinLayer(map) {
  const pins = new Map(); // id -> { el, marker, sig }
  let lastGlobal = '';
  let lastEvSig = '';

  // ── 标签避让 ──────────────────────────────────────────────────────────────
  // 事件图钉现在**每一个都带标题**（无名钉子等于逼人逐个点开），于是就有了撞字：
  // 1927 年的"秋收起义"（113.58E）与"南昌起义"（115.89E）几乎同纬度，默认视图下
  // 两条标签横向只差 30px，必然叠在一起。
  // 规则：先让所有标签挂在钉子下方；按优先级（事件权重）逐个落位，
  // 撞了就改挂上方，上方也撞才隐藏 —— 只有真的无处可放时才丢名字。
  const collides = (a, b) => !(
    a.right + 2 < b.left || a.left - 2 > b.right ||
    a.bottom + 2 < b.top || a.top - 2 > b.bottom
  );

  function layoutLabels() {
    const list = [];
    for (const [, rec] of pins) {
      // 只处理事件图钉：战争动画的三角箭头每帧都在动，跟着重算会闪；
      // 交战点/关隘本来就只有两三个标签，且位置由数据定，不需要避让。
      if (rec.kind !== 'event') continue;
      if (!rec.labelEl || !rec.labelEl.isConnected) continue;
      list.push(rec);
    }
    if (!list.length) return;
    list.sort((a, b) => (b.priority || 1) - (a.priority || 1) || a.order - b.order);
    const placed = [];
    for (const rec of list) {
      const el = rec.labelEl;
      el.classList.remove('is-above');
      el.style.visibility = '';
      let box = el.getBoundingClientRect();
      if (!box.width) continue; // 位置还没算出来（首帧），这一轮跳过
      if (!placed.some((p) => collides(box, p))) { placed.push(box); continue; }
      el.classList.add('is-above');
      box = el.getBoundingClientRect();
      if (!placed.some((p) => collides(box, p))) { placed.push(box); continue; }
      el.classList.remove('is-above');
      el.style.visibility = 'hidden';
    }
  }

  function sync(items, opts = {}) {
    const list = items || [];
    const onClick = opts.onClick;
    const global = list
      .map(
        (d) =>
          `${d.id}:${d.kind}:${d.selected ? 1 : 0}:${d.label || ''}:` +
          `${d.coord[0].toFixed(4)},${d.coord[1].toFixed(4)}:` +
          `${Number.isFinite(d.rot) ? d.rot.toFixed(1) : ''}:${d.color || ''}:${d.idle ? 1 : 0}`
      )
      .join('|');
    if (global === lastGlobal) return;
    lastGlobal = global;

    const seen = new Set();
    let order = 0;
    for (const d of list) {
      if (!d.coord) continue;
      seen.add(d.id);
      const sig = `${d.kind}:${d.selected ? 1 : 0}:${d.label || ''}:${d.idle ? 1 : 0}`;
      let rec = pins.get(d.id);
      if (!rec) {
        const el = document.createElement('div');
        el.className = 'pin';
        const marker = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport' })
          .setLngLat(d.coord)
          .addTo(map);
        rec = { el, marker, sig: null, labelEl: null };
        pins.set(d.id, rec);
      } else {
        rec.marker.setLngLat(d.coord);
      }
      if (rec.sig !== sig) {
        rec.el.className = `pin pin-${d.kind}${d.selected ? ' is-selected' : ''}${d.idle ? ' is-idle' : ''}`;
        rec.el.innerHTML = pinHtml(d.kind, d.label);
        rec.sig = sig;
        rec.labelEl = rec.el.querySelector('.pin-label');
      }
      rec.kind = d.kind;
      rec.priority = d.labelPriority || 1;
      rec.order = order++;
      // 旋转 / 阵营色每帧都可能变，走 CSS 变量（不触碰 DOM 结构）
      if (Number.isFinite(d.rot)) rec.el.style.setProperty('--rot', `${d.rot.toFixed(1)}deg`);
      if (d.color) rec.el.style.setProperty('--pin-color', d.color);
      rec.el.onclick = (e) => {
        e.stopPropagation();
        if (onClick) onClick(d);
      };
    }
    for (const [id, rec] of pins) {
      if (seen.has(id)) continue;
      rec.marker.remove();
      pins.delete(id);
    }
    // 事件钉子没变就不必重算避让（战争动画每帧都会走到这里，测量是有代价的）
    const evSig = list
      .filter((d) => d.kind === 'event')
      .map((d) => `${d.id}:${d.coord[0]},${d.coord[1]}:${d.label || ''}`)
      .join('|');
    if (evSig !== lastEvSig) {
      lastEvSig = evSig;
      layoutLabels();
    }
  }

  // 缩放/平移后屏幕距离变了，避让要重算。sync 会因签名不变而提前返回，
  // 所以这里单独挂一次（每帧只做一次 rAF 合并，6~8 个标签的测量代价可以忽略）。
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; layoutLabels(); });
  };
  map.on('zoomend', schedule);
  map.on('moveend', schedule);

  return {
    sync,
    clear() {
      sync([]);
    },
  };
}
