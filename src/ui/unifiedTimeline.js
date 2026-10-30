// 民国军政主线 · 统一时间轴导航器
// =============================================================================
// 把四个专题（北伐/红军/抗日/解放）摊到同一条 1924–1949 时间轴上，分四个分类块。
// 每个分类块内，子事件**各自独占一行**（分行显示）——因为不少事件跨好几年，
// 压在同一条横线上既看不清也点不准。点任意一行就跳到该专题对应的那段动画。
//
// 顶部一条「年份进度条」：可点 / 可拖，带 ◀ ▶ 与当前年读数，左右前进后退年份。
// 当前年在泳道上以一条**浅色竖条**覆盖四条泳道；竖条旁直接浮出**当年各泳道大事**
// （彩色 chip + 年份 + 标题 + 简述），不再把事件压缩到最下面。
//
// 与 storyStage 解耦：本组件只负责"导航与总览"，打开动画通过回调交回 main.js
// （onOpenStage），避免循环依赖。
// =============================================================================

import { TOPICS } from '../modes/chinaModern/data/topics.js';

const LANE_COLORS = {
  'expedition-1924-1937': '#c4771f',
  'redarmy-1927-1936': '#b23a2c',
  'resistance-1931-1945': '#3f7a4a',
  'liberation-1945-1949': '#534ab7',
};
const LANE_LABEL = {
  'expedition-1924-1937': '北伐',
  'redarmy-1927-1936': '红军',
  'resistance-1931-1945': '抗日',
  'liberation-1945-1949': '解放',
};
const LANE_CH = {
  'expedition-1924-1937': '北',
  'redarmy-1927-1936': '红',
  'resistance-1931-1945': '抗',
  'liberation-1945-1949': '解',
};

const YR_MIN = 1924;
const YR_MAX = 1950;          // SVG 轴跨度（含末段 1949 收尾）
const SPAN = YR_MAX - YR_MIN;
const W = 1040;
const X0 = 156;               // 左侧留出分类名 + 子事件标题的 gutter
const X1 = W - 22;
const PW = X1 - X0;
const AXIS_Y = 40;
const START_Y = 70;
const ROW_H = 27;
const xOf = (yr) => X0 + ((yr - YR_MIN) / SPAN) * PW;

// 逐年游标的取值范围（主线实际有事件的年份）
const YS_MIN = 1924;
const YS_MAX = 1949;
const PHASE_YEAR = 1937;       // 七七事变：局部抗战 → 全面抗战 / 国共第二次合作开始

// 把 "1927.08 – 1928.04" 或 "1941 – 1945.09"（端点可能无 .MM）解析成起止小数年。
function parsePeriod(p) {
  const re = /(\d{4})\.(\d{2})|(\d{4})/g;
  const nums = [];
  let m;
  while ((m = re.exec(p)) !== null) {
    if (m[1] !== undefined) nums.push(+m[1] + +m[2] / 12);
    else nums.push(+m[3]);
  }
  return { start: nums[0], end: nums[nums.length - 1] };
}

// 预计算「某年某分类」激活的是哪几段（同专题段不重叠，但一年里可能多段并存，如 1937 的七七/淞沪/敌后）。
function buildMatrix() {
  const cells = {}; // year -> { topicId: [ { idx, short, title, period, lead } ] }
  for (const t of TOPICS) {
    t.stages.forEach((st, j) => {
      const { start, end } = parsePeriod(st.period);
      for (let Y = Math.floor(start); Y <= Math.floor(end); Y++) {
        if (Y < YS_MIN || Y > YS_MAX) continue;
        (cells[Y] = cells[Y] || {});
        (cells[Y][t.id] = cells[Y][t.id] || []).push({
          idx: j,
          short: st.short || st.title,
          title: st.title,
          period: st.period,
          lead: st.lead || '',
        });
      }
    });
  }
  return cells;
}

// 取前 n 个句子（以。！？切分），并限制总字数。
// 用于解说框：首句常是背景概述，真正的事件名（如"南昌起义"）在第二句起，
// 所以取前两句才能把当年大事显示出来，而不是只截一句背景。
function firstSentences(s, n = 2, maxChars = 150) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  const parts = t.match(/[^。！？]*[。！？]?/g) || [];
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    if (out.length + p.length > maxChars && out) break;
    out += p;
    if ((out.match(/[。！？]/g) || []).length >= n) break;
  }
  return out.length > maxChars ? out.slice(0, maxChars) + '…' : out;
}

// 把一段文字按像素宽折行（CJK 约 13px，其余约 7px），用于浮标里多行显示事件详情。
function wrapText(text, maxW) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let line = '';
  let w = 0;
  for (const c of chars) {
    const cw = c.charCodeAt(0) > 255 ? 13 : 7;
    if (w + cw > maxW && line) {
      lines.push(line);
      line = c;
      w = cw;
    } else {
      line += c;
      w += cw;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createUnifiedTimeline({ onOpenStage } = {}) {
  const cells = buildMatrix();
  const allYears = [];
  for (let Y = YS_MIN; Y <= YS_MAX; Y++) allYears.push(Y);

  const root = document.createElement('div');
  root.id = 'unified-timeline';
  root.className = 'hidden';
  root.innerHTML = `
    <div class="ut-panel">
      <div class="ut-head">
        <div>
          <div class="ut-title">民国军政主线 · 1924–1949</div>
          <div class="ut-sub">北伐 → 红军 → 抗日 → 解放：同一条轴上看重叠与衔接；拖 / 点进度条选年份，竖线处即当年，各泳道浮出当年大事</div>
        </div>
        <button type="button" class="ut-close" id="ut-close" title="关闭">✕</button>
      </div>
      <div class="ut-topbar">
        <button type="button" class="ut-nav" id="ut-prev" title="上一年">◀</button>
        <div class="ut-cur" id="ut-cur">${YS_MIN}</div>
        <button type="button" class="ut-nav" id="ut-next" title="下一年">▶</button>
        <div class="ut-track" id="ut-track">
          <div class="ut-fill" id="ut-fill"></div>
          <div class="ut-handle" id="ut-handle"></div>
        </div>
      </div>
      <div class="ut-timeline" id="ut-svg"></div>
    </div>`;
  document.body.appendChild(root);

  const svgHost = root.querySelector('#ut-svg');
  const curEl = root.querySelector('#ut-cur');
  const trackEl = root.querySelector('#ut-track');
  const fillEl = root.querySelector('#ut-fill');
  const handleEl = root.querySelector('#ut-handle');

  const LAYOUT = layout();
  buildSvg();

  let curYear = YS_MIN;

  // ----- 渲染泳道（静态，只在打开时画一次）-----
  function buildSvg() {
    const { blocks, H } = LAYOUT;

    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" preserveAspectRatio="xMidYMid meet">`;

    // 三段同框区（1931–1936）：北伐末段 + 红军 + 抗日早期 三线并行
    const bx1 = xOf(1931.0);
    const bx2 = xOf(1936.5);
    s += `<rect x="${bx1.toFixed(1)}" y="${blocks[0].top.toFixed(1)}" width="${(bx2 - bx1).toFixed(1)}" height="${(blocks[blocks.length - 1].bottom - blocks[0].top).toFixed(1)}" fill="#b23a2c" opacity="0.06"/>`;
    s += `<text x="${((bx1 + bx2) / 2).toFixed(1)}" y="${(blocks[0].top - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#a32d2d">三段同框 1931–1936</text>`;

    // 年份轴 + 竖向年份网格：让「年线」与色条可逐格对照
    const botY = blocks[blocks.length - 1].bottom;
    s += `<line x1="${X0}" y1="${AXIS_Y}" x2="${X1}" y2="${AXIS_Y}" stroke="#c9ced6" stroke-width="1"/>`;
    for (let y = 1925; y <= 1950; y += 5) {
      const x = xOf(y);
      // 竖向网格从年份轴一直延伸到最底泳道，作为「年线」参照
      s += `<line x1="${x.toFixed(1)}" y1="${AXIS_Y}" x2="${x.toFixed(1)}" y2="${botY.toFixed(1)}" stroke="#ece3d0" stroke-width="1"/>`;
      s += `<text x="${x.toFixed(1)}" y="${AXIS_Y - 8}" text-anchor="middle" font-size="11" fill="#9aa1ab">${y}</text>`;
      s += `<line x1="${x.toFixed(1)}" y1="${AXIS_Y}" x2="${x.toFixed(1)}" y2="${AXIS_Y + 6}" stroke="#c9ced6" stroke-width="1"/>`;
    }

    // 四个分类块，块内子事件分行
    blocks.forEach((B) => {
      const col = LANE_COLORS[B.t.id] || '#888';
      const lab = LANE_LABEL[B.t.id] || B.t.title;
      const ch = LANE_CH[B.t.id] || lab[0];
      const allSp = B.rows.map((r) => r.sp);
      const cStart = Math.floor(Math.min(...allSp.map((p) => p.start)));
      const cEnd = Math.floor(Math.max(...allSp.map((p) => p.end)));
      s += `<text x="14" y="${B.labelY.toFixed(1)}" font-size="15" font-weight="800" fill="${col}">${lab}<tspan font-size="11" font-weight="400" fill="#9aa1ab" dx="9">${cStart}–${cEnd}</tspan></text>`;
      s += `<line x1="${X0}" y1="${B.bottom.toFixed(1)}" x2="${X1}" y2="${B.bottom.toFixed(1)}" stroke="#eee4d2" stroke-width="1"/>`;

      B.rows.forEach((r) => {
        const st = r.st;
        // 色条按「整年」铺设：起点对齐事件开始年的年初、终点对齐结束年的年末，
        // 使跨越 N 年的事件在视觉上清晰覆盖这 N 年（而非只画真实月跨度的窄条）。
        // 精确的起止月份仍保留在 <title> 与浮标里，不丢失信息。
        let x1 = xOf(Math.floor(r.sp.start));
        let x2 = xOf(Math.floor(r.sp.end) + 1);
        let w = x2 - x1;
        const minW = 12;
        let dx = x1;
        if (w < minW) { dx = x1 - (minW - w) / 2; w = minW; }  // 极短段兜底居中
        if (dx + w > X1) w = X1 - dx;  // 勿超出右边界
        s += `<g class="ut-seg" data-topic="${B.t.id}" data-idx="${r.j}">`;
        s += `<title>${st.title}（${st.period}）</title>`;
        s += `<rect x="8" y="${r.rowY.toFixed(1)}" width="${(X1 - 8).toFixed(1)}" height="${ROW_H}" fill="transparent"/>`;
        s += `<text x="14" y="${(r.rowY + 18).toFixed(1)}" font-size="12" fill="#3a3228"><tspan fill="${col}" font-weight="700">${r.j + 1}. </tspan>${escapeXml(st.short || st.title)}</text>`;
        s += `<rect x="${dx.toFixed(1)}" y="${(r.rowY + 4).toFixed(1)}" width="${w.toFixed(1)}" height="18" rx="5" fill="${col}" opacity="0.9"/>`;
        s += `</g>`;
      });
    });

    // 动态层：当前年竖线 + 当年大事浮标（不拦截点击，鼠标穿透到下方泳道）
    s += `<g id="ut-cursor" style="pointer-events:none"></g>`;
    s += `</svg>`;
    svgHost.innerHTML = s;
  }

  // 计算每个分类块与其中每一行的布局，确定 SVG 总高。
  function layout() {
    let y = START_Y;
    const blocks = TOPICS.map((t) => {
      const rows = t.stages.map((st, j) => {
        const sp = parsePeriod(st.period);
        return { j, st, sp, rowY: y + 24 + j * ROW_H };
      });
      const block = {
        t,
        top: y,
        labelY: y + 16,
        bottom: y + 24 + t.stages.length * ROW_H,
        rows,
      };
      y = block.bottom + 14;
      return block;
    });
    return { blocks, H: y + 12 };
  }

  // ----- 当前年游标：竖线覆盖全部泳道 + 各泳道当年大事浮标 -----
  // 浮标框直接显示事件「标题 + 简述」，可折行多行（不再只写个名字）。
  const CARD_W = 252;   // 浮标内容宽度（不含内边距）
  const CARD_PAD = 10;
  function renderCursor() {
    const g = svgHost.querySelector('#ut-cursor');
    if (!g) return;
    const yr = curYear;
    // 竖条对齐到「所选年份当年最早事件的真实起点」，使其落在色块左缘上（覆盖事件）。
    // 否则事件从年中开始（如 1927.08）时，竖条停在整数年年初、与色块左缘差十几像素，
    // 看起来像”竖条没盖住事件“。年份徽章跟随竖条，保持两者一致。
    let barYr = yr;
    const evtStarts = [];
    for (const B of LAYOUT.blocks) {
      const evs = cells[yr] && cells[yr][B.t.id];
      if (evs) for (const e of evs) {
        const sp = parsePeriod(e.period);
        // 与色条整年铺设一致：取该段在「所选年份」可见的整年左缘 = max(起始年, 所选年)。
        // 跨年长段（如北伐 1924.01–1927.07）在选中 1926 时，整年可见起点是 1926 而非 1924，
        // 避免竖条被拉回最初起点后整段年份钉死不动；同时与色条整年起点重合。
        evtStarts.push(Math.max(Math.floor(sp.start), yr));
      }
    }
    if (evtStarts.length) barYr = Math.min(...evtStarts);
    const bx = xOf(barYr);
    const topY = LAYOUT.blocks[0].top;
    const botY = LAYOUT.blocks[LAYOUT.blocks.length - 1].bottom;

    let s = '';
    // 当前年竖线：从年份轴贯穿到最底泳道，与顶部年份网格、色条左缘对齐
    s += `<rect x="${(bx - 9).toFixed(1)}" y="${AXIS_Y.toFixed(1)}" width="18" height="${(botY - AXIS_Y).toFixed(1)}" fill="rgba(80,70,50,0.10)"/>`;
    s += `<line x1="${bx.toFixed(1)}" y1="${AXIS_Y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${botY.toFixed(1)}" stroke="rgba(60,44,24,0.6)" stroke-width="1.5"/>`;
    // 顶部年份小牌
    const pillW = 46;
    const px = Math.max(X0, Math.min(X1 - pillW, bx - pillW / 2));
    s += `<rect x="${px.toFixed(1)}" y="${(AXIS_Y + 10).toFixed(1)}" width="${pillW}" height="18" rx="9" fill="#3a2c18"/>`;
    s += `<text x="${(px + pillW / 2).toFixed(1)}" y="${(AXIS_Y + 23).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff8ea">${yr}</text>`;

    // 各泳道当年大事浮标：竖条旁直接浮出，按泳道分行，互不重叠
    const anyLane = LAYOUT.blocks.filter((B) => cells[yr] && cells[yr][B.t.id] && cells[yr][B.t.id].length);
    for (const B of anyLane) {
      const col = LANE_COLORS[B.t.id] || '#888';
      const ch = LANE_CH[B.t.id] || '';
      const evs = cells[yr][B.t.id];
      // 抗日：1937 起为全面抗战 / 国共合作；之前为局部抗战（解开"1931 就开始"的误读）
      const phaseTag = B.t.id === 'resistance-1931-1945'
        ? (yr >= PHASE_YEAR ? '（全面抗战）' : '（局部抗战）')
        : '';
      // 同一年同一泳道可能多件（如 1937 抗），各显示「标题 + 当年大事简述」，最多 3 件
      const MAX_EV = 3;
      const shown = evs.slice(0, MAX_EV);
      const entries = shown.map((e) => ({
        e,
        // 标题：彩色 chip 已标识分类，标题即事件名（不再把年份写进框里）
        titleLines: wrapText(e.title + phaseTag, CARD_W - 30).slice(0, 2),
        // 简述：取前两句（含具体事件名，如"南昌起义"），而不是只截第一句背景
        leadLines: wrapText(firstSentences(e.lead, 2, 150), CARD_W).slice(0, 3),
      }));
      // 估算卡片高度
      let h = CARD_PAD * 2;
      entries.forEach((en, i) => {
        h += en.titleLines.length * 17;
        h += en.leadLines.length * 15;
        if (i < entries.length - 1) h += 8;
      });
      if (evs.length > MAX_EV) h += 18;
      const boxW = CARD_W + CARD_PAD * 2;
      const cy = (B.top + B.bottom) / 2;
      // 默认放竖条右侧；靠近右边界则翻到左侧，避免出画
      let lx = bx + 14;
      if (lx + boxW > X1) lx = bx - 14 - boxW;
      let gy = cy - h / 2;
      gy = Math.max(topY, Math.min(botY - h, gy));

      s += `<rect x="${lx.toFixed(1)}" y="${gy.toFixed(1)}" width="${boxW.toFixed(1)}" height="${h.toFixed(1)}" rx="10" fill="#fffdf8" stroke="${col}" stroke-width="1.4"/>`;
      let yy = gy + CARD_PAD;
      entries.forEach((en, i) => {
        const e = en.e;
        // 标题行：彩色 chip + 标题（可折行）
        s += `<rect x="${(lx + CARD_PAD).toFixed(1)}" y="${yy.toFixed(1)}" width="18" height="18" rx="5" fill="${col}"/>`;
        s += `<text x="${(lx + CARD_PAD + 9).toFixed(1)}" y="${(yy + 13).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${ch}</text>`;
        en.titleLines.forEach((ln, k) => {
          s += `<text x="${(lx + CARD_PAD + 24).toFixed(1)}" y="${(yy + 13 + k * 16).toFixed(1)}" font-size="12.5" font-weight="700" fill="#3a2c18">${escapeXml(ln)}</text>`;
        });
        yy += en.titleLines.length * 16;
        // 简述（折行，最多 2 行）
        en.leadLines.forEach((ln) => {
          s += `<text x="${(lx + CARD_PAD).toFixed(1)}" y="${(yy + 12).toFixed(1)}" font-size="11.5" fill="#6b5433">${escapeXml(ln)}</text>`;
          yy += 15;
        });
        yy += 8;
      });
      if (evs.length > MAX_EV) {
        s += `<text x="${(lx + CARD_PAD).toFixed(1)}" y="${(yy + 12).toFixed(1)}" font-size="11" fill="#8a7a5e">+${evs.length - MAX_EV} 件，点下方该行看全部</text>`;
      }
    }

    if (!anyLane.length) {
      const noteX = Math.min(bx + 12, X1 - 150);
      s += `<rect x="${noteX.toFixed(1)}" y="${(topY + 2).toFixed(1)}" width="150" height="20" rx="6" fill="#fffdf8" stroke="#e0d6c2"/>`;
      s += `<text x="${(noteX + 75).toFixed(1)}" y="${(topY + 15).toFixed(1)}" text-anchor="middle" font-size="11" fill="#8a7a5e">该年主线无收录事件</text>`;
    }

    g.innerHTML = s;
  }

  function setYear(Y) {
    curYear = Math.max(YS_MIN, Math.min(YS_MAX, Y));
    curEl.textContent = curYear;
    const p = (curYear - YS_MIN) / (YS_MAX - YS_MIN);
    fillEl.style.width = (p * 100).toFixed(2) + '%';
    handleEl.style.left = (p * 100).toFixed(2) + '%';
    renderCursor();
  }

  function step(delta) { setYear(curYear + delta); }

  // 进度条：点 / 拖 选年份
  let dragging = false;
  function yearFromClientX(clientX) {
    const r = trackEl.getBoundingClientRect();
    const ratio = (clientX - r.left) / r.width;
    return Math.round(YS_MIN + ratio * (YS_MAX - YS_MIN));
  }
  trackEl.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { trackEl.setPointerCapture(e.pointerId); } catch (_) {}
    setYear(yearFromClientX(e.clientX));
  });
  trackEl.addEventListener('pointermove', (e) => {
    if (dragging) setYear(yearFromClientX(e.clientX));
  });
  const endDrag = () => { dragging = false; };
  trackEl.addEventListener('pointerup', endDrag);
  trackEl.addEventListener('pointercancel', endDrag);

  // 事件绑定
  root.querySelector('#ut-close').addEventListener('click', () => close());
  root.querySelector('#ut-prev').addEventListener('click', () => step(-1));
  root.querySelector('#ut-next').addEventListener('click', () => step(1));
  svgHost.addEventListener('click', (e) => {
    const g = e.target.closest('.ut-seg');
    if (!g) return;
    const topic = g.dataset.topic;
    const idx = Number(g.dataset.idx);
    close();
    if (onOpenStage) onOpenStage(topic, idx);
  });
  document.addEventListener('keydown', onKey);

  function onKey(e) {
    if (root.classList.contains('hidden')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  function open() {
    root.classList.remove('hidden');
    document.body.classList.add('ut-lock');
    setYear(curYear);
  }
  function close() {
    root.classList.add('hidden');
    document.body.classList.remove('ut-lock');
  }

  return {
    open,
    close,
    isOpen: () => !root.classList.contains('hidden'),
  };
}

function escapeXml(t) {
  return String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
