// 地图图钉层（MapLibre DOM Marker 池）
// ---------------------------------------------------------------------------
// 关隘 / 交战点 / 行军中的人马这类"固定像素大小 + 可点击 + 带文字"的标记，用
// MapLibre Marker 比 deck.gl IconLayer 更稳（见 lib/icons.js 的说明）。
// 本模块只做一件事：把 [{id, kind, coord, label, selected, flip, color, idle}]
// 同步到地图上的 DOM 标记，复用已存在的标记（只改位置/类名/文案），多余的下线。
//
// 支持逐帧更新（战争动画里骑马的图钉每帧都在动）：
//   coord  经纬度      → marker.setLngLat（MapLibre 内部走 transform，很轻）
//   flip   ±1 左右镜像  → CSS 变量 --flip（侧视图只翻转，不转圈）
//   color  阵营色       → CSS 变量 --pin-color（骑手甲胄用）
//   idle   原地驻守     → 加 is-idle 类，关掉跑动动画
// 为避免每帧重建 DOM，先算一个"签名"，内容没变就整体返回。

import maplibregl from 'maplibre-gl';
import { pinHtml } from '../lib/icons.js';

export function createPinLayer(map) {
  const pins = new Map(); // id -> { el, marker, sig }
  let lastGlobal = '';

  function sync(items, opts = {}) {
    const list = items || [];
    const onClick = opts.onClick;
    const global = list
      .map(
        (d) =>
          `${d.id}:${d.kind}:${d.selected ? 1 : 0}:${d.label || ''}:` +
          `${d.coord[0].toFixed(4)},${d.coord[1].toFixed(4)}:` +
          `${d.flip || 1}:${d.color || ''}:${d.idle ? 1 : 0}`
      )
      .join('|');
    if (global === lastGlobal) return;
    lastGlobal = global;

    const seen = new Set();
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
        rec = { el, marker, sig: null };
        pins.set(d.id, rec);
      } else {
        rec.marker.setLngLat(d.coord);
      }
      if (rec.sig !== sig) {
        rec.el.className = `pin pin-${d.kind}${d.selected ? ' is-selected' : ''}${d.idle ? ' is-idle' : ''}`;
        rec.el.innerHTML = pinHtml(d.kind, d.label);
        rec.sig = sig;
      }
      // 镜像 / 阵营色每帧都可能变，走 CSS 变量（不触碰 DOM 结构）
      if (d.flip) rec.el.style.setProperty('--flip', String(d.flip));
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
  }

  return {
    sync,
    clear() {
      sync([]);
    },
  };
}
