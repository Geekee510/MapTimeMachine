// 极点内缩（pole of inaccessibility）
// 返回多边形内部"离边界最远"的点——用它放置政权名标签，可保证标签落在疆域内部、
// 永远不会偏到边缘（比质心稳健得多：质心常落在凹形疆域之外或边界上）。
// 算法：栅格由粗到细搜索 + 点到边界最短距离（单多边形、忽略洞，足够标签定位）。
//
// 位于公共算法库（三幅地图共用）：第三幅图的政权名标签、第二幅图后续可复用。

// 射线法判断点是否在环内（环可闭合或开放）
export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 点到线段的最短距离
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// 点到环（闭合）的最短距离
export function distToRing(px, py, ring) {
  let min = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const d = distToSegment(px, py, ring[j][0], ring[j][1], ring[i][0], ring[i][1]);
    if (d < min) min = d;
  }
  return min;
}

// 返回环内离边界最远的点（[x,y]）。precision 越小越精确、越慢。
export function polylabel(ring, precision = 0.25) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const width = maxX - minX, height = maxY - minY;
  if (width <= 0 || height <= 0) return [(minX + maxX) / 2, (minY + maxY) / 2];
  let cell = Math.max(width, height) / 3;
  let best = null;
  while (cell > precision) {
    for (let x = minX; x < maxX; x += cell) {
      for (let y = minY; y < maxY; y += cell) {
        const cx = x + cell / 2, cy = y + cell / 2;
        if (!pointInRing(cx, cy, ring)) continue;
        const d = distToRing(cx, cy, ring);
        if (!best || d > best.dist) best = { dist: d, point: [cx, cy] };
      }
    }
    cell /= 2;
  }
  if (best) return best.point;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}
