// 公共几何算法库（三幅地图共用；纯函数、零第三方依赖、不做 IO）
//
// 参考业界边界综合管线（NHGIS / CITAS）：
//     简化(Douglas-Peucker)  →  合并(dissolve)  →  磨圆(Chaikin)
//
// ⚠️ 顺序铁律：**先合并、后简化**。
//    如果对每个省独立做简化，相邻两省的公共边界会各自保留不同的顶点，
//    共享边于是错位，合并时出现针孔状缝隙、外轮廓断裂。
//    本库不强制顺序，但调用方必须遵守。

// ─────────────────────────────────────────────────────────────────────────────
// 一、Douglas-Peucker 简化
// 低容差（~0.04°≈4km）下去掉亚公里级锯齿，让省界/海岸线更顺滑，
// 同时保留沿山水走向的形状特征（不会把海岸线拉成直线）。
// ─────────────────────────────────────────────────────────────────────────────
function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// 开放折线简化（输入输出都不含闭合重复点也可以，内部会去掉再闭合）
export function douglasPeucker(points, eps) {
  if (!points || points.length < 3) return (points || []).slice();
  let pts = points.slice();
  const closed = pts.length > 1 &&
    pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
  if (closed) pts = pts.slice(0, -1);
  if (pts.length < 3) return points.slice();

  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpendicularDistance(pts[i], pts[s], pts[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx !== -1) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  if (closed) out.push(out[0]);
  return out;
}

// 对整个几何（Polygon / MultiPolygon，含内环洞）做简化
export function simplifyGeometry(geom, eps) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map((r) => douglasPeucker(r, eps)) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) => poly.map((r) => douglasPeucker(r, eps))),
    };
  }
  return geom;
}

// ─────────────────────────────────────────────────────────────────────────────
// 二、Chaikin 角点切割（磨圆）
// 把折线/多边形反复切角，消除"生硬直线"感。仅用于手绘补丁（超出今国境的历史
// 疆土）——真实省界不要磨圆，那会把海岸线也啃圆。
// ─────────────────────────────────────────────────────────────────────────────
export function chaikin(ring, iters = 4) {
  let pts = ring.slice();
  if (pts.length > 1 &&
      pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts = pts.slice(0, -1);
  }
  for (let k = 0; k < iters; k++) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = out;
  }
  pts.push(pts[0]);
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 二·b、开放折线的磨圆（不闭合）
// 铁路、行军路线这类"线"必须用这一版：`chaikin()` 是**按环**处理的（末尾补首点），
// 直接拿去磨一条铁路，会在起点与终点之间凭空画出一条横贯全图的直线。
// 两端点保持不动，只切割中间各段。
// ─────────────────────────────────────────────────────────────────────────────
export function chaikinLine(line, iters = 3) {
  if (!Array.isArray(line) || line.length < 2) return line || [];
  let pts = line.slice();
  for (let k = 0; k < iters; k++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 三、dissolve：由「一堆相邻多边形」解出「外轮廓环」
//
// 原理（无需任何几何库、不依赖 even-odd 填充规则）：
//   把每条边按端点规范化（小数位对齐 + 端点排序）后计数。
//   · 同一政权内部、相邻两省共享的边 → 出现 2 次 → 是内部边，丢弃；
//   · 只属于一个省的边（海岸线、国界、该政权的边缘）→ 出现 1 次 → 是外轮廓，保留。
//   剩下的边首尾相连，即得到该政权的完整外轮廓环。
//
// 前提：相邻多边形的公共边必须是**完全相同的顶点**（同源数据天然满足）。
//       所以不能先独立简化每个多边形——见文件头的顺序铁律。
//
// 返回：环数组 [[ [lng,lat], ... ], ...]（每个环闭合）。可能有多个环
//       （多块互不相连的疆土、岛屿）。
// ─────────────────────────────────────────────────────────────────────────────
export function dissolveRings(rings, precision = 5, maxCloseGap = 0.2) {
  const keyOf = (p) => p[0].toFixed(precision) + ',' + p[1].toFixed(precision);
  const edges = new Map(); // "a|b"(规范化, a<b) -> { count, pa, pb }

  for (const ring of rings || []) {
    if (!ring || ring.length < 2) continue;
    for (let i = 0; i < ring.length - 1; i++) {
      const pa = ring[i];
      const pb = ring[i + 1];
      const ka = keyOf(pa);
      const kb = keyOf(pb);
      if (ka === kb) continue; // 退化边
      const id = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      const rec = edges.get(id);
      if (rec) rec.count += 1;
      else edges.set(id, { count: 1, ka, kb, pa, pb });
    }
  }

  // 只保留「出现奇数次」的边（= 外边界）。
  // 为什么是"奇数"而不是"恰好 1 次"：数据里个别边被 3 个省重复计数（顶点重合），
  // 若把这类边也丢掉，边界会被切成两条长开口折线，整条外轮廓就丢了。
  // 数学上保持"奇数次"可保证剩余图每个节点的度数都是偶数 → 必然能分解成闭合环。
  //
  // ⚠️ used 标记必须挂在「边」对象上（共享），不能挂在「邻接项」上——
  //    否则同一条边的正反两个方向各自可用，串联时会来回重复走同一条边。
  const kept = [];
  for (const rec of edges.values()) {
    if (rec.count % 2 === 0) continue;
    kept.push({ ka: rec.ka, kb: rec.kb, pa: rec.pa, pb: rec.pb, used: false });
  }

  const adj = new Map(); // nodeKey -> [边索引]
  const addAdj = (k, i) => {
    const list = adj.get(k);
    if (list) list.push(i);
    else adj.set(k, [i]);
  };
  kept.forEach((e, i) => { addAdj(e.ka, i); addAdj(e.kb, i); });

  // 串联成环：从任意未使用的边出发，沿未使用的相邻边一路走，直到回到起点或断头
  const out = [];
  for (let i = 0; i < kept.length; i++) {
    if (kept[i].used) continue;
    const first = kept[i];
    first.used = true;
    const startKey = first.ka;
    const ring = [first.pa, first.pb];
    let nodeKey = first.kb;
    let guard = 0;
    while (nodeKey !== startKey && guard++ < 500000) {
      const list = adj.get(nodeKey) || [];
      let nxt = -1;
      for (const ei of list) {
        if (!kept[ei].used) { nxt = ei; break; }
      }
      if (nxt === -1) break; // 断头：数据缺口，当前环到此为止
      const e = kept[nxt];
      e.used = true;
      if (e.ka === nodeKey) { ring.push(e.pb); nodeKey = e.kb; }
      else { ring.push(e.pa); nodeKey = e.ka; }
    }
    // 收环：
    //   · 已经回到起点 → 直接收；
    //   · 断头（open chain）→ 若首尾缺口很小（数据里个别边被 3 个省重复计数，
    //     丢弃后把外轮廓切成开口折线），直接补一条短边闭合——缺口几公里，视觉无感；
    //     缺口过大说明是真断（数据不连续），丢弃以免拉出穿越地图的假直边。
    if (ring.length < 4) continue;
    if (nodeKey !== startKey) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      const gap = Math.hypot(first[0] - last[0], first[1] - last[1]);
      if (gap > maxCloseGap) continue;
      ring.push(first); // 小缺口补齐闭合
    }
    out.push(ring);
  }
  return out;
}

// 从 GeoJSON 几何里取出全部**外环**（Polygon 取第 0 环；MultiPolygon 逐块取第 0 环）。
// 内环（洞）不参与 dissolve——历史疆域里的洞极少，且洞会破坏边计数配对。
export function exteriorRingsOfGeometry(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates[0]];
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((c) => c[0]);
  return [];
}

// 便捷：从 GeoJSON Feature 数组直接解出外轮廓环
export function dissolveFeatures(features, precision = 5) {
  const rings = [];
  for (const f of features || []) {
    rings.push(...exteriorRingsOfGeometry(f.geometry || f));
  }
  return dissolveRings(rings, precision);
}
