// 地图图钉层（MapLibre DOM Marker 池）
// ---------------------------------------------------------------------------
// 关隘 / 交战点这类"固定像素大小 + 可点击 + 带文字"的标记，用 MapLibre Marker 比
// deck.gl IconLayer 更稳（见 lib/icons.js 的说明）。
// 本模块只做一件事：把 [{id, kind, coord, label, selected}] 同步到地图上的 DOM 标记，
// 复用已存在的标记（只改位置/类名/文案），多余的下线。
//
// 性能：main.js 在战争动画期间会逐帧调用 sync()，所以这里先算一个"签名"，
// 内容没变就直接返回，避免每帧都动 DOM。

import maplibregl from 'maplibre-gl';
import { pinHtml } from '../lib/icons.js';

export function createPinLayer(map) {
  const pins = new Map(); // id -> { el, marker, sig }
  let lastGlobal = '';

  function sync(items, opts = {}) {
    const list = items || [];
    const onClick = opts.onClick;
    const global = list
      .map((d) => `${d.id}:${d.kind}:${d.selected ? 1 : 0}:${d.label || ''}:${d.coord[0].toFixed(4)},${d.coord[1].toFixed(4)}`)
      .join('|');
    if (global === lastGlobal) return;
    lastGlobal = global;

    const seen = new Set();
    for (const d of list) {
      if (!d.coord) continue;
      seen.add(d.id);
      const sig = `${d.kind}:${d.selected ? 1 : 0}:${d.label || ''}`;
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
        rec.el.className = `pin pin-${d.kind}${d.selected ? ' is-selected' : ''}`;
        rec.el.innerHTML = pinHtml(d.kind, d.label);
        rec.sig = sig;
      }
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
