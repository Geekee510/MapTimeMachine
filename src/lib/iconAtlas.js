// 图标图集（canvas 现画 → dataURL），供 deck.gl IconLayer 使用
// ---------------------------------------------------------------------------
// 为什么不放图片文件：三个图标都很简单（城楼 / 叉号 / 箭头），用 canvas 路径画
// 可以随尺寸缩放不失真、可随时微调，也不用往仓库里塞二进制资源。
// IconLayer 只接受图片（Image/SVG/DataURL），故这里 toDataURL('image/png') 后传入。
//
// 用法：
//   new IconLayer({ iconAtlas: iconImage('tower'), iconMapping: iconMapping('tower'), getIcon: () => 'tower' })
// 颜色约定：
//   · tower / cross  —— 颜色直接画进图里，getColor 传白色即可（autoHighlight 仍可高亮）
//   · arrow          —— 画成"白身深边"，用 getColor 乘上军队颜色 → 得到该方颜色的箭头（保留深色描边）

const SIZE = 128; // 图集单图边长（实际渲染由 getSize 控制，画大一点保证清晰）
const cache = new Map();

function makeCanvas(n) {
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  return c;
}

// 先描白色外晕（保证压在深色疆域上也看得清），再填本色，最后钩深色细边
function haloFill(ctx, pathFn, fill, opts = {}) {
  const { halo = 12, haloColor = 'rgba(255,250,240,0.92)', edge = 'rgba(58,34,16,0.95)', edgeW = 3 } = opts;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  pathFn();
  ctx.lineWidth = halo;
  ctx.strokeStyle = haloColor;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = edgeW;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.restore();
}

// —— 城楼（关隘图标）：垛口城墙 + 拱门 + 城身 + 起翘屋顶 ——
function drawTower(ctx, n) {
  const s = n / 128;
  ctx.save();
  ctx.scale(s, s);

  // 1) 城墙（带 4 个垛口）：从左下起画一圈，绕开垛口
  const wall = () => {
    ctx.beginPath();
    ctx.moveTo(18, 118);
    ctx.lineTo(18, 82);
    // 垛口：凸起(96) 凹下(82) 交替
    const merlons = [22, 38, 54, 70, 86, 102];
    for (let i = 0; i < merlons.length; i++) {
      const x = merlons[i];
      ctx.lineTo(x, 82);
      if (i % 2 === 0) {
        ctx.lineTo(x + 2, 71);
        ctx.lineTo(x + 12, 71);
        ctx.lineTo(x + 14, 82);
      }
    }
    ctx.lineTo(110, 82);
    ctx.lineTo(110, 118);
    ctx.closePath();
  };
  haloFill(ctx, wall, '#9c6d3c', { edge: 'rgba(56,32,14,0.95)' });

  // 2) 拱门（挖空成深色）
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(52, 118);
  ctx.lineTo(52, 100);
  ctx.arc(64, 100, 12, Math.PI, 0);
  ctx.lineTo(76, 118);
  ctx.closePath();
  ctx.fillStyle = '#3a2412';
  ctx.fill();
  ctx.restore();

  // 3) 城身（城台上的楼身）
  const body = () => {
    ctx.beginPath();
    ctx.rect(44, 50, 40, 32);
  };
  haloFill(ctx, body, '#a06a38', { halo: 10 });

  // 4) 窗
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(57, 58, 14, 16);

  // 5) 屋顶（两端起翘的檐口，向外挑出，压住城台才像城楼）
  const roof = () => {
    ctx.beginPath();
    ctx.moveTo(10, 48);
    ctx.quadraticCurveTo(26, 45, 38, 38);
    ctx.lineTo(50, 20);
    ctx.lineTo(78, 20);
    ctx.lineTo(90, 38);
    ctx.quadraticCurveTo(102, 45, 118, 48);
    ctx.lineTo(112, 58);
    ctx.lineTo(16, 58);
    ctx.closePath();
  };
  haloFill(ctx, roof, '#b23a2a', { halo: 10, edge: 'rgba(70,22,14,0.95)' });

  ctx.restore();
}

// —— 叉号（交战点图标）：两根粗骨成交叉 ——
function drawCross(ctx, n) {
  const s = n / 128;
  ctx.save();
  ctx.scale(s, s);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(98, 98);
    ctx.moveTo(98, 30);
    ctx.lineTo(30, 98);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 白晕
  path();
  ctx.lineWidth = 32;
  ctx.strokeStyle = 'rgba(255,252,246,0.95)';
  ctx.stroke();
  // 红色主体
  path();
  ctx.lineWidth = 20;
  ctx.strokeStyle = '#c0261f';
  ctx.stroke();
  // 内高光（让叉子有刀锋感）
  path();
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255,190,180,0.85)';
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// —— 箭头（行军方向）：白色箭头 + 深色细边，靠 getColor 上军队色 ——
function drawArrow(ctx, n) {
  const s = n / 128;
  ctx.save();
  ctx.scale(s, s);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(64, 10);
    ctx.lineTo(116, 84);
    ctx.lineTo(80, 78);
    ctx.lineTo(80, 118);
    ctx.lineTo(48, 118);
    ctx.lineTo(48, 78);
    ctx.lineTo(12, 84);
    ctx.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  path();
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(40,30,25,0.75)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

const DRAWERS = { tower: drawTower, cross: drawCross, arrow: drawArrow };

// 取（并缓存）某个图标的 dataURL
export function iconImage(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const draw = DRAWERS[kind] || DRAWERS.tower;
  const c = makeCanvas(SIZE);
  const ctx = c.getContext('2d');
  draw(ctx, SIZE);
  const url = c.toDataURL('image/png');
  cache.set(kind, url);
  return url;
}

// IconLayer 的 iconMapping：整张图集只有一枚图标，锚点居中
export function iconMapping(kind) {
  return {
    [kind]: {
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      anchorX: SIZE / 2,
      anchorY: SIZE / 2,
      mask: false,
    },
  };
}
