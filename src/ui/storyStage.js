// 专题动画舞台（全屏覆盖层）
// =============================================================================
// 一个舞台演一条**主线**：红军十年、北伐与国共、抗日战争——共同点是
// "不是一场仗，是一串按时间推进的战役与转折"，所以共用同一套播放器。
//
// 技术来自 public/anim-lab.html 的实验结论（那页保留作调试用，不要删）：
//   · Catmull-Rom 平滑，杜绝硬折线
//   · strokeDasharray 逐段揭示行军路线，不预先画出整条淡线
//   · 领队大箭头按切线角度旋转；尾迹只留 7 个点，到站即清空
//   · 会师/里程碑用五角星弹入 + 扩散圆环
//   · 节奏 PACE=2：1× 的体感等于实验页 0.5×
//
// 图层自下而上：海面 → 省界填色 → 河流 → 山脉（∧ 形齿）→ 路线 → 标注 → 暗角
// 地形是后加的：没有山、没有河，长征与抗战就只是几条线在空白纸上走，
// 看不出"为什么非得走腊子口""为什么死守徐州"。
//
// 三个坑（踩过，别改回去）：
//   ① CSS 动画的 transform 会覆盖 SVG attribute 的 transform：
//      五角星必须"外层 g 定位 + 内层 g 做动画"，否则一弹就跳到画布原点。
//   ② 省界有 2.5 万个顶点，每段重算一次投影会卡顿 —— 只在首次加载时
//      简化一次（丢掉过密点），之后每段只做坐标变换。
//   ③ 河流同理：ne_rivers 是 1.1MB 全球数据，只抽一次、只留中国框内的干流。
// =============================================================================

import { RIDGES, NAMED_RIVERS, loadRivers } from '../modes/chinaModern/data/terrain.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1200;
const H = 760;
const PAD = 64;

// 每段在 1× 速度下的时长（秒）。实验页最终定稿的体感偏慢，这里取 13s。
// 段落多的专题（抗日 8 段）可在段上写 sec 覆盖，别让整场拖到两分钟。
const STAGE_SEC = 13;
const HOLD_SEC = 1.7; // 一段跑完后的停留，让人读完落点文字再切

const el = (tag, attrs) => {
  const n = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ── 几何 ────────────────────────────────────────────────────────────────────
function catmullRom(pts, seg = 22) {
  if (pts.length < 2) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    for (let j = 0; j < seg; j++) {
      const t = j / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const dOf = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');

const myOf = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const mxOf = (lng) => (lng * Math.PI) / 180;

/** 取景框的"实际绘制框"：声明框按画布宽高比补足后的 Mercator 包围盒。
 *  只保证"框内必看"，多出来的方向由省界把画面填满。 */
function paddedView(view) {
  const [lng0, lat0, lng1, lat1] = view;
  let x0 = mxOf(lng0), x1 = mxOf(lng1);
  let y0 = myOf(lat0), y1 = myOf(lat1);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let dx = Math.abs(x1 - x0) || 1e-6;
  let dy = Math.abs(y1 - y0) || 1e-6;
  const A = W / H;
  if (dx / dy < A) dx = dy * A;
  else dy = dx / A;
  return { x0: cx - dx / 2, x1: cx + dx / 2, y0: cy - dy / 2, y1: cy + dy / 2 };
}

/** 按经纬度取景框生成投影函数（Mercator，等比铺满画布并居中）。
 *  取景框会先按画布宽高比**补足**：只保证"框内必看"，
 *  多出来的方向由省界把画面填满——否则竖长的路线（如雪山草地段）
 *  会在右侧留下三分之一的空白纸。 */
function makeProjection(view) {
  const { x0, x1, y0, y1 } = paddedView(view);
  const dx = x1 - x0, dy = y1 - y0;
  const s = (W - PAD * 2) / dx;
  const ox = (W - dx * s) / 2;
  const oy = (H - dy * s) / 2;
  return (lng, lat) => [ox + (mxOf(lng) - x0) * s, oy + (y1 - myOf(lat)) * s];
}

/** 取景框兜底：把"实际绘制框（含宽高比补边）"与"本段几何包围盒"比较，
 *  只有真正越出绘制框的几何才会把取景框放宽到能装下它；几何本就在框内的段
 *  （如反围剿紧框、会宁会师框）原样不动，不引入多余的缩放。 */
function stageView(st) {
  const [w0, s0, e0, n0] = st.view;
  const pv = paddedView(st.view); // 实际绘制框（经纬度，Mercator 空间）
  const inBox = (lng, lat) => {
    const mx = mxOf(lng), my = myOf(lat);
    return mx >= pv.x0 && mx <= pv.x1 && my >= pv.y0 && my <= pv.y1;
  };
  let ok = true;
  for (const r of st.routes || []) for (const p of r.pts) if (!inBox(p[0], p[1])) ok = false;
  for (const m of st.marks || []) if (!inBox(m.at[0], m.at[1])) ok = false;
  if (st.star && !inBox(st.star.at[0], st.star.at[1])) ok = false;
  if (ok) return st.view; // 几何全在绘制框内：保持原取景，渲染与原来一致

  // 否则把几何包围盒并入声明框（四周留 6% 容边，免得标注贴边被切），再交给 makeProjection 补宽高比
  let gw = Infinity, gs = Infinity, ge = -Infinity, gn = -Infinity;
  const acc = (lng, lat) => {
    if (lng < gw) gw = lng;
    if (lat < gs) gs = lat;
    if (lng > ge) ge = lng;
    if (lat > gn) gn = lat;
  };
  for (const r of st.routes || []) for (const p of r.pts) acc(p[0], p[1]);
  for (const m of st.marks || []) acc(m.at[0], m.at[1]);
  if (st.star) acc(st.star.at[0], st.star.at[1]);
  const mx = Math.max(0.6, (e0 - w0) * 0.06);
  const my = Math.max(0.6, (n0 - s0) * 0.06);
  return [Math.min(w0, gw - mx), Math.min(s0, gs - my), Math.max(e0, ge + mx), Math.max(n0, gn + my)];
}

// ── 省界（只取一次，简化后缓存）────────────────────────────────────────────
let PROVINCE_RINGS = null;
let provincePromise = null;

function simplifyRing(ring, minStep) {
  const out = [];
  let last = null;
  for (const p of ring) {
    if (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > minStep) {
      out.push(p);
      last = p;
    }
  }
  return out.length >= 3 ? out : null;
}

function loadProvinces() {
  if (provincePromise) return provincePromise;
  provincePromise = fetch('/data/china_provinces.geojson')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((gj) => {
      const rings = [];
      const walk = (coords) => {
        // Polygon: [ring, hole...] / MultiPolygon: [[ring…]…]
        if (typeof coords[0][0] === 'number') {
          const r = simplifyRing(coords, 0.035);
          if (r) rings.push(r);
          return;
        }
        for (const c of coords) walk(c);
      };
      for (const f of gj.features) if (f.geometry) walk(f.geometry.coordinates);
      PROVINCE_RINGS = rings;
      return rings;
    })
    .catch((e) => {
      console.warn('[stage] 省界底图加载失败，退回空白纸面:', e.message);
      PROVINCE_RINGS = [];
      return [];
    });
  return provincePromise;
}

// ── 山脉符号 ────────────────────────────────────────────────────────────────
/** 沿山脊线密排 ∧ 形符号（老军事地图的画法）。
 *  间距与大小都是**屏幕像素**，不随缩放变——地图符号的惯例，
 *  否则一放大山脉就变成一片碎点。 */
function ridgeGlyphs(pts) {
  if (pts.length < 2) return '';
  let d = '';
  let carry = 0;
  let idx = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.5) continue;
    const nx = -dy / len;
    const ny = dx / len;
    const step = Math.max(9, Math.min(14, len / 26));
    let s = carry;
    while (s < len) {
      const t = s / len;
      const off = idx % 2 ? 2.4 : -2.4; // 左右交错，免得像齿条
      const cx = a[0] + dx * t + nx * off;
      const cy = a[1] + dy * t + ny * off;
      const w = 4.6;
      const h = 5.6;
      d +=
        `M${(cx - w).toFixed(1)} ${(cy + h * 0.5).toFixed(1)}` +
        `L${cx.toFixed(1)} ${(cy - h * 0.8).toFixed(1)}` +
        `L${(cx + w).toFixed(1)} ${(cy + h * 0.5).toFixed(1)}`;
      s += step;
      idx++;
    }
    carry = s - len;
  }
  return d;
}

// ── 主函数 ─────────────────────────────────────────────────────────────────
export function createStoryStage({ stages, brand, meta, onClose } = {}) {
  const list = stages || [];

  // ── DOM 骨架 ──
  const root = document.createElement('div');
  root.id = 'march-stage';
  root.className = 'hidden';
  root.innerHTML = `
    <div class="ms-paper"></div>
    <svg id="ms-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="msLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f8f1e0"/>
          <stop offset="1" stop-color="#eee2c9"/>
        </linearGradient>
        <radialGradient id="msVign" cx="50%" cy="46%" r="74%">
          <stop offset="55%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#5a4222" stop-opacity=".16"/>
        </radialGradient>
      </defs>
      <g id="ms-land"></g>
      <g id="ms-terrain"></g>
      <g id="ms-routes"></g>
      <g id="ms-marks"></g>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#msVign)"/>
    </svg>

    <div class="ms-hud">
      <div class="ms-brand">${brand || '专题动画'}</div>
      <div class="ms-sub">${meta || `${list.length} 段`}</div>
      <div class="ms-stages" id="ms-stage-list"></div>
      <div class="ms-row">
        <button type="button" class="ms-btn primary" id="ms-play">▶ 播放</button>
        <button type="button" class="ms-btn" id="ms-replay">↺ 重播</button>
      </div>
      <div class="ms-row">
        <button type="button" class="ms-btn" id="ms-prev">‹ 上一段</button>
        <button type="button" class="ms-btn" id="ms-next">下一段 ›</button>
      </div>
      <div class="ms-label">速度</div>
      <div class="ms-seg" id="ms-speed">
        <button type="button" data-v="0.5">0.5×</button>
        <button type="button" data-v="1" class="on">1×</button>
        <button type="button" data-v="2">2×</button>
      </div>
    </div>

    <div class="ms-note" id="ms-note"></div>

    <div class="ms-bar">
      <div class="ms-bar-track" id="ms-bar"></div>
      <div class="ms-bar-hint">空格 播放/暂停　← → 切换段落　Esc 关闭</div>
    </div>

    <button type="button" class="ms-close" id="ms-close" title="关闭">✕</button>
  `;
  document.body.appendChild(root);

  const svg = root.querySelector('#ms-scene');
  const gLand = root.querySelector('#ms-land');
  const gTerrain = root.querySelector('#ms-terrain');
  const gRoutes = root.querySelector('#ms-routes');
  const gMarks = root.querySelector('#ms-marks');
  const noteEl = root.querySelector('#ms-note');
  const barEl = root.querySelector('#ms-bar');
  const listEl = root.querySelector('#ms-stage-list');
  const playBtn = root.querySelector('#ms-play');

  const state = { i: 0, t: 0, playing: false, speed: 1, hold: 0, raf: 0, last: 0 };

  // ── 段落列表 ──
  listEl.innerHTML = list
    .map(
      (s, i) =>
        `<button type="button" class="ms-stage-item" data-i="${i}"><span class="ms-si">${i + 1}</span>${s.short || s.title}</button>`
    )
    .join('');
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('.ms-stage-item');
    if (!b) return;
    goStage(Number(b.dataset.i));
    state.playing = true;
    syncPlay();
  });

  // ── 进度条 ──
  barEl.innerHTML = list
    .map((s, i) => `<div class="ms-seg-bar" data-i="${i}"><i></i></div>`)
    .join('');

  // ── 构建一段的场景 ──
  let built = [];

  function buildLand(proj) {
    gLand.innerHTML = '';
    // 海面先铺一层冷灰绿：不铺的话"没有省界的区域"和"纸面空白"看起来一模一样，
    // 雪山草地这种竖长路线两侧会显得像没画完。
    gLand.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#dfe4dc' }));
    if (!PROVINCE_RINGS || !PROVINCE_RINGS.length) return;
    let d = '';
    for (const ring of PROVINCE_RINGS) {
      const pts = ring.map((p) => proj(p[0], p[1]));
      d += dOf(pts) + 'Z';
    }
    gLand.appendChild(el('path', { d, fill: 'url(#msLand)', stroke: '#cbb894', 'stroke-width': '1', 'fill-rule': 'evenodd', opacity: '.97' }));
  }

  /** 河流 + 山脉。两者都按当前段取景框裁剪/筛选，只画看得见的部分。 */
  function buildTerrain(proj, view) {
    gTerrain.innerHTML = '';
    const [w0, s0, e0, n0] = view;
    const mx = (e0 - w0) * 0.18; // 外扩一点，边缘不要出现"河流断头"
    const my = (n0 - s0) * 0.18;
    const box = [w0 - mx, s0 - my, e0 + mx, n0 + my];
    const inside = (p) => p[0] > box[0] && p[0] < box[2] && p[1] > box[1] && p[1] < box[3];

    // ── 河流 ──
    const rivers = RIVER_CACHE || [];
    let dMinor = '';
    let dMajor = '';
    const labels = [];
    for (const r of rivers) {
      const vis = r.pts.filter(inside);
      if (vis.length < 2) continue;
      const d = dOf(r.pts.map((p) => proj(p[0], p[1])));
      if (r.major) dMajor += d;
      else dMinor += d;
      const zh = NAMED_RIVERS[r.name];
      if (zh && !labels.some((x) => x.text === zh)) {
        // 标注点取"可见段的中段"，尽量落在画面内
        const mid = vis[Math.floor(vis.length / 2)];
        const [x, y] = proj(mid[0], mid[1]);
        if (x > PAD && x < W - PAD && y > PAD && y < H - PAD) labels.push({ text: zh, x, y });
      }
    }
    if (dMinor) gTerrain.appendChild(el('path', { d: dMinor, fill: 'none', stroke: '#a9c4d4', 'stroke-width': '1', 'stroke-linecap': 'round', opacity: '.85' }));
    if (dMajor) gTerrain.appendChild(el('path', { d: dMajor, fill: 'none', stroke: '#7fa8c4', 'stroke-width': '1.9', 'stroke-linecap': 'round', opacity: '.9' }));

    // ── 山脉 ──
    let dGlyph = '';
    let dMass = '';
    const ridgeLabels = [];
    for (const rg of RIDGES) {
      const pts = rg.pts.map((p) => proj(p[0], p[1]));
      const onScreen = pts.some((p) => p[0] > -80 && p[0] < W + 80 && p[1] > -80 && p[1] < H + 80);
      if (!onScreen) continue;
      dMass += dOf(pts);
      dGlyph += ridgeGlyphs(pts);
      if (rg.rank >= 2) {
        const mid = pts[Math.floor(pts.length / 2)];
        if (mid[0] > PAD * 0.6 && mid[0] < W - PAD * 0.6 && mid[1] > PAD * 0.6 && mid[1] < H - PAD * 0.6) {
          ridgeLabels.push({ text: rg.name, x: mid[0], y: mid[1] - 13 });
        }
      }
    }
    // 先铺一层浅赭作"山体块"，再压符号：只有符号会显得像剪纸
    if (dMass) gTerrain.appendChild(el('path', { d: dMass, fill: 'none', stroke: '#c2a274', 'stroke-width': '13', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.22' }));
    if (dGlyph) gTerrain.appendChild(el('path', { d: dGlyph, fill: 'none', stroke: '#9c7748', 'stroke-width': '1.15', 'stroke-linejoin': 'round', opacity: '.85' }));

    const label = (l, cls) => {
      const t = el('text', { x: l.x.toFixed(1), y: l.y.toFixed(1), class: cls, 'text-anchor': 'middle' });
      t.textContent = l.text;
      gTerrain.appendChild(t);
    };
    for (const l of ridgeLabels) label(l, 'ms-terr-name');
    for (const l of labels) label(l, 'ms-river-name');
  }

  function buildStage(idx) {
    const st = list[idx];
    gRoutes.innerHTML = '';
    gMarks.innerHTML = '';
    built = [];
    if (!st) return;

    const view = stageView(st);
    const proj = makeProjection(view);
    buildLand(proj);
    buildTerrain(proj, view);

    // 路线
    for (const r of st.routes || []) {
      const geo = r.pts.map((p) => proj(p[0], p[1]));
      const smooth = catmullRom(geo, 22);
      const d = dOf(smooth);

      const base = el('path', { d, class: 'ms-base', stroke: r.color });
      gRoutes.appendChild(base);
      const done = el('path', { d, class: 'ms-done', stroke: r.color });
      gRoutes.appendChild(done);

      const L = base.getTotalLength();
      const N = Math.max(120, Math.min(1400, Math.round(L / 2)));
      const samples = [];
      for (let i = 0; i <= N; i++) samples.push(base.getPointAtLength((L * i) / N));
      const step = L / N;

      const at = (dist) => {
        const dd = Math.max(0, Math.min(L, dist));
        const f = dd / step;
        const i = Math.min(samples.length - 2, Math.floor(f));
        const k = f - i;
        const a = samples[i], b = samples[i + 1];
        return [a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k];
      };
      const ang = (dist) => {
        const a = at(Math.max(0, dist - 6));
        const b = at(dist);
        return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      };

      const tails = [];
      for (let i = 0; i < 7; i++) {
        const dot = el('circle', { r: 3, fill: r.color, opacity: '0', class: 'ms-tail', stroke: '#fffaf0', 'stroke-width': '0.9' });
        gRoutes.appendChild(dot);
        tails.push(dot);
      }

      const head = el('g', { class: 'ms-head' });
      head.appendChild(el('path', {
        d: 'M 26 0 L -3 -10 L 2.8 0 L -3 10 Z',
        fill: r.color, stroke: '#fffaf0', 'stroke-width': '1.5', 'stroke-linejoin': 'round',
      }));
      gRoutes.appendChild(head);

      const label = el('text', { class: 'ms-route-label', fill: r.color, 'text-anchor': 'middle' });
      label.textContent = r.name;
      gMarks.appendChild(label);

      // 起点脉冲
      const s0 = geo[0];
      gMarks.appendChild(el('circle', { cx: s0[0], cy: s0[1], r: 9, fill: 'none', stroke: r.color, 'stroke-width': 2, class: 'ms-pulse', opacity: '.8' }));
      gMarks.appendChild(el('circle', { cx: s0[0], cy: s0[1], r: 4.4, fill: r.color, stroke: '#fffaf0', 'stroke-width': 1.8 }));

      built.push({ cfg: r, L, at, ang, done, tails, head, label });
    }

    // 地点标注
    for (const m of st.marks || []) {
      const [x, y] = proj(m.at[0], m.at[1]);
      // side:'left' 时文字挂在圆点左侧：吴起镇与永坪纬度几乎相同，
      // 两个标签都向右伸就会叠在一起
      const left = m.side === 'left';
      const tx0 = left ? x - 8 : x + 8;
      const anchor = left ? 'end' : 'start';
      const g = el('g', { class: 'ms-mark' });
      g.appendChild(el('circle', { cx: x, cy: y, r: 3.6, fill: '#7a5a30', stroke: '#fffaf0', 'stroke-width': '1.6' }));
      const t1 = el('text', { x: tx0, y: y - 4, class: 'ms-mark-name', 'text-anchor': anchor });
      t1.textContent = m.text;
      g.appendChild(t1);
      if (m.sub) {
        const t2 = el('text', { x: tx0, y: y + 10, class: 'ms-mark-sub', 'text-anchor': anchor });
        t2.textContent = m.sub;
        g.appendChild(t2);
      }
      gMarks.appendChild(g);
    }

    // 落点五星（外层定位 / 内层动画）
    if (st.star) {
      const [x, y] = proj(st.star.at[0], st.star.at[1]);
      const ring = el('circle', { cx: x, cy: y, r: 34, fill: 'none', stroke: '#8f2f22', 'stroke-width': '2.4', class: 'ms-ring' });
      gMarks.appendChild(ring);

      const wrap = el('g', { transform: `translate(${x} ${y})` });
      const star = el('g', { class: 'ms-star' });
      star.appendChild(el('path', {
        d: starPath(15, 6), fill: '#bf3a24', stroke: '#fff8ea', 'stroke-width': '1.6', 'stroke-linejoin': 'round',
      }));
      wrap.appendChild(star);
      gMarks.appendChild(wrap);

      const tx = el('text', { x, y: y + 52, class: 'ms-star-text', 'text-anchor': 'middle' });
      tx.textContent = st.star.text;
      gMarks.appendChild(tx);
      const sx = el('text', { x, y: y + 68, class: 'ms-star-sub', 'text-anchor': 'middle' });
      sx.textContent = st.star.sub || '';
      gMarks.appendChild(sx);
      // 副标题太长时会横穿经过星点下方的路线。可选 sub2：拆成两行，
      // 每行窄一半，才躲得开（先遣队段的突围线正好从怀玉山向南出发）。
      let sx2 = null;
      if (st.star.sub2) {
        sx2 = el('text', { x, y: y + 84, class: 'ms-star-sub', 'text-anchor': 'middle' });
        sx2.textContent = st.star.sub2;
        gMarks.appendChild(sx2);
      }

      // 落点文字与五星同进同出：先亮出来就等于剧透了"这里会发生什么"
      built.push({ star, ring, labelEls: sx2 ? [tx, sx, sx2] : [tx, sx] });
    }

    // 叙事卡
    noteEl.innerHTML = `
      <div class="ms-note-h">${st.title}</div>
      <div class="ms-note-p">${st.period}</div>
      <p class="ms-lead">${st.lead}</p>
      <ul class="ms-bullets">${(st.bullets || []).map((b) => `<li>${b}</li>`).join('')}</ul>
    `;
    noteEl.classList.remove('ms-fade');
    void noteEl.offsetWidth;
    noteEl.classList.add('ms-fade');

    // 高亮当前段
    for (const b of listEl.querySelectorAll('.ms-stage-item')) {
      b.classList.toggle('on', Number(b.dataset.i) === idx);
    }
    render();
  }

  function starPath(R, r, points = 5) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const a = (-90 + (i * 180) / points) * (Math.PI / 180);
      const rad = i % 2 === 0 ? R : r;
      pts.push([rad * Math.cos(a), rad * Math.sin(a)]);
    }
    return 'M' + pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L ') + ' Z';
  }

  // ── 每帧渲染 ──
  function render() {
    const t = state.t;
    for (const b of built) {
      if (b.star) {
        const done = t >= 0.995;
        b.star.classList.toggle('on', done);
        b.ring.classList.toggle('on', done);
        for (const tx of b.labelEls) tx.classList.toggle('on', done);
        continue;
      }
      const p = clamp01((t - b.cfg.delay) / b.cfg.dur);
      const e = easeInOut(p);
      const len = b.L * e;
      b.done.style.strokeDasharray = `${len.toFixed(1)} ${(b.L + 8).toFixed(1)}`;

      const pt = b.at(len);
      const ang = b.ang(len);

      if (p > 0.004 && p < 0.999) {
        b.head.style.display = '';
        b.head.setAttribute('transform', `translate(${pt[0].toFixed(1)} ${pt[1].toFixed(1)}) rotate(${ang.toFixed(1)})`);
      } else {
        b.head.style.display = 'none';
      }

      // 队伍名跟着队头；起点附近（p<0.12）与临近终点（p>0.9）都隐去——
      // 那两处正是起点脉冲、地点标注与落点五星所在，压上去就糊成一团
      if (p > 0.12 && p < 0.9) {
        b.label.style.display = '';
        b.label.setAttribute('x', (pt[0] + 6).toFixed(1));
        b.label.setAttribute('y', (pt[1] - 24).toFixed(1));
      } else {
        b.label.style.display = 'none';
      }

      if (p > 0.01 && p < 0.999) {
        for (let i = 0; i < b.tails.length; i++) {
          const d2 = len - (i + 1) * 7;
          if (d2 < 2) { b.tails[i].style.display = 'none'; continue; }
          const tp = b.at(d2);
          const f = 1 - i / b.tails.length;
          b.tails[i].setAttribute('cx', tp[0].toFixed(1));
          b.tails[i].setAttribute('cy', tp[1].toFixed(1));
          b.tails[i].setAttribute('r', (0.9 + 2.2 * f).toFixed(2));
          b.tails[i].setAttribute('opacity', (0.03 + 0.15 * f).toFixed(2));
          b.tails[i].style.display = '';
        }
      } else {
        for (const d of b.tails) d.style.display = 'none';
      }
    }

    // 进度条
    for (const seg of barEl.children) {
      const i = Number(seg.dataset.i);
      const fill = seg.firstElementChild;
      const v = i < state.i ? 1 : i > state.i ? 0 : t;
      fill.style.width = `${(v * 100).toFixed(1)}%`;
      seg.classList.toggle('on', i === state.i);
    }
  }

  // ── 段落切换 ──
  function goStage(i) {
    state.i = Math.max(0, Math.min(list.length - 1, i));
    state.t = 0;
    state.hold = 0;
    buildStage(state.i);
  }

  // ── 时钟 ──
  function frame(ts) {
    if (!state.last) state.last = ts;
    const dt = Math.min(0.06, (ts - state.last) / 1000);
    state.last = ts;

    if (state.playing) {
      if (state.t < 1) {
        const sec = (list[state.i] && list[state.i].sec) || STAGE_SEC;
        state.t = Math.min(1, state.t + (dt * state.speed) / sec);
      } else {
        state.hold += dt * state.speed;
        if (state.hold > HOLD_SEC) {
          if (state.i < list.length - 1) {
            goStage(state.i + 1);
          } else {
            state.playing = false;
            syncPlay();
          }
        }
      }
      render();
    }
    state.raf = requestAnimationFrame(frame);
  }

  function syncPlay() {
    playBtn.textContent = state.playing ? '⏸ 暂停' : state.t >= 1 && state.i === list.length - 1 ? '↺ 再看一遍' : '▶ 播放';
  }

  playBtn.addEventListener('click', () => {
    if (!state.playing && state.t >= 1 && state.i === list.length - 1) {
      goStage(0);
      state.playing = true;
    } else {
      state.playing = !state.playing;
    }
    syncPlay();
  });
  root.querySelector('#ms-replay').addEventListener('click', () => {
    goStage(state.i);
    state.playing = true;
    syncPlay();
  });
  root.querySelector('#ms-prev').addEventListener('click', () => {
    goStage(state.i - 1);
    syncPlay();
  });
  root.querySelector('#ms-next').addEventListener('click', () => {
    goStage(state.i + 1);
    syncPlay();
  });
  root.querySelector('#ms-speed').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.speed = parseFloat(b.dataset.v) || 1;
    for (const x of root.querySelectorAll('#ms-speed button')) x.classList.toggle('on', x === b);
  });
  root.querySelector('#ms-close').addEventListener('click', () => close());

  function onKey(e) {
    if (root.classList.contains('hidden')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === ' ') {
      e.preventDefault();
      playBtn.click();
    } else if (e.key === 'ArrowRight') {
      goStage(state.i + 1);
      syncPlay();
    } else if (e.key === 'ArrowLeft') {
      goStage(state.i - 1);
      syncPlay();
    }
  }
  document.addEventListener('keydown', onKey);

  // ── 打开 / 关闭 ──
  let RIVER_CACHE = null;

  async function open(startIndex = 0) {
    root.classList.remove('hidden');
    document.body.classList.add('ms-lock');
    state.playing = false;
    syncPlay();
    // 省界与河流并行拉，别串行等两次网络
    const [, rivers] = await Promise.all([loadProvinces(), loadRivers()]);
    RIVER_CACHE = rivers;
    goStage(startIndex);
    state.playing = true;
    syncPlay();
    if (!state.raf) state.raf = requestAnimationFrame(frame);
  }

  function close() {
    root.classList.add('hidden');
    document.body.classList.remove('ms-lock');
    state.playing = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;
    if (onClose) onClose();
  }

  return {
    open,
    close,
    isOpen: () => !root.classList.contains('hidden'),
    // 调试/截图用：直接定位到"第 i 段、进度 t"。
    // 动画本身跑完要好十几秒，逐帧核对落点样式时靠等不现实（实验页的 ?t= 同理）。
    seek(i, t = 1) {
      goStage(i);
      state.t = clamp01(t);
      state.playing = false;
      syncPlay();
      render();
    },
  };
}
