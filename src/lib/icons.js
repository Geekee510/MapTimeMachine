// 地图图标（内联 SVG，交给 MapLibre DOM Marker 使用）
// ---------------------------------------------------------------------------
// 为什么不用 deck.gl 的 IconLayer：它的 iconAtlas 是**异步道具**，图集用
// dataURL 时在多图层/逐帧重建（战争动画每帧新建图层）的场景下加载会失败，
// 失败后 deck 退回"自动打包"模式，而我们的 getIcon 返回的是图集键名而不是图片
// 地址 → 图标静默消失（实测：20 个关隘只剩个别出现，战争箭头全部不显示）。
// 改用 MapLibre Marker（DOM + 内联 SVG）后：同步创建、天然带白边描边、
// 可点击、可用 CSS 做选中态，也不占 WebGL 的绘制预算。
//
// 三种图标：
//   pass   —— 城楼（关隘）
//   battle —— 双刀交叉（交战点）
// 图标本体画在 40×40 的 viewBox 里，白晕用 CSS drop-shadow 叠出来（见 style.css）。

const TOWER = `
<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
  <g stroke="#3a2412" stroke-width="1.1" stroke-linejoin="round">
    <!-- 城墙（带垛口） -->
    <path d="M5 36 V23 h4.5 v-4.5 h4 V23 h4.6 v-4.5 h4 V23 h4.6 v-4.5 h4 V23 H35 v13 Z" fill="#a97a4a"/>
    <!-- 城门洞 -->
    <path d="M16.4 36 v-6.4 a3.6 3.6 0 0 1 7.2 0 V36 Z" fill="#3a2412" stroke="none"/>
    <!-- 屋檐（两头起翘） -->
    <path d="M2.5 22 Q10 21.2 13 16.8 L20 8.5 L27 16.8 Q30 21.2 37.5 22 L34.4 26.4 H5.6 Z" fill="#b23a2a"/>
    <!-- 正脊 -->
    <path d="M15.6 9.4 H24.4" stroke="#7d1f14" stroke-width="1.4" stroke-linecap="round"/>
  </g>
</svg>`;

// 交叉双刀：同一把刀画两遍，绕中心分别转 ±45°，形成清晰的 X。
// 刀身用"浅钢色 + 深色描边"，因为地图底色深浅不一（疆域填充 / 晕渲 / 省界），
// 只靠浅色填充会在浅底上糊成一片；深描边保证任何底色下轮廓都在。
const BLADE = `
  <path d="M20 2.6 L22.3 7.6 V21 H17.7 V7.6 Z" fill="#eaf1f8" stroke="#22303f" stroke-width="1.3" />
  <path d="M20 5.4 V19.6" stroke="#9fb0c2" stroke-width="0.9" fill="none" />
  <path d="M12.5 21.9 H27.5 L26.4 24.6 H13.6 Z" fill="#c9962e" stroke="#5f420d" stroke-width="1.1" />
  <path d="M18.5 24.6 H21.5 V31 H18.5 Z" fill="#7a4a22" stroke="#3d2310" stroke-width="1" />
  <circle cx="20" cy="32.4" r="2.3" fill="#c9962e" stroke="#5f420d" stroke-width="1.1" />
`;

const SWORDS = `
<svg viewBox="0 0 40 40" width="31" height="31" aria-hidden="true">
  <!-- 后方那把：整体压暗一点，制造前后层次 -->
  <g transform="rotate(-45 20 20)" opacity="0.92">
    <g fill="#c9d6e2" stroke="#22303f" stroke-width="1.3" stroke-linejoin="round">
      <path d="M20 2.6 L22.3 7.6 V21 H17.7 V7.6 Z" />
    </g>
    <path d="M12.5 21.9 H27.5 L26.4 24.6 H13.6 Z" fill="#a87a1f" stroke="#4e3608" stroke-width="1.1" stroke-linejoin="round" />
    <path d="M18.5 24.6 H21.5 V31 H18.5 Z" fill="#5f3a1a" stroke="#2e1a0b" stroke-width="1" />
    <circle cx="20" cy="32.4" r="2.3" fill="#a87a1f" stroke="#4e3608" stroke-width="1.1" />
  </g>
  <!-- 前方那把 -->
  <g transform="rotate(45 20 20)" stroke-linejoin="round" stroke-linecap="round">
    ${BLADE}
  </g>
</svg>`;

const ICONS = { pass: TOWER, battle: SWORDS };

export function pinIcon(kind) {
  return ICONS[kind] || TOWER;
}

// 图钉 DOM：0×0 的锚点盒 + 居中图标 + 下方文字标签（白晕保证压在深色疆域上也清楚）
export function pinHtml(kind, label) {
  const text = label ? `<span class="pin-label">${label}</span>` : '';
  return `<span class="pin-icon">${pinIcon(kind)}</span>${text}`;
}
