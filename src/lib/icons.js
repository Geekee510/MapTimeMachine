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
// 配色取"高饱和 + 深描边"：地图底色深浅不一（疆域填充 / 晕渲 / 省界），
// 浅灰钢色会在浅底上糊成一片，因此刀身用亮银蓝、护手与刀镡用明黄铜、
// 刀柄用朱红棕，整体轮廓用近黑描边兜住。
const BLADE = `
  <path d="M20 1.8 L23 7.4 V21 H17 V7.4 Z" fill="#f4f9ff" stroke="#1b2836" stroke-width="1.5" />
  <path d="M20 5 V19.6" stroke="#8fb3d9" stroke-width="1.1" fill="none" />
  <path d="M11.4 21.6 H28.6 L27.2 25 H12.8 Z" fill="#ffc22e" stroke="#6b4406" stroke-width="1.3" />
  <path d="M17.8 25 H22.2 V33.4 H17.8 Z" fill="#c8371c" stroke="#4a1006" stroke-width="1.2" />
  <circle cx="20" cy="35.4" r="2.9" fill="#ffc22e" stroke="#6b4406" stroke-width="1.3" />
`;

const SWORDS = `
<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
  <!-- 后方那把：整体压暗一点，制造前后层次 -->
  <g transform="rotate(-45 20 20)" opacity="0.9">
    <path d="M20 1.8 L23 7.4 V21 H17 V7.4 Z" fill="#cfe0f2" stroke="#1b2836" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M11.4 21.6 H28.6 L27.2 25 H12.8 Z" fill="#d99a13" stroke="#5a3905" stroke-width="1.3" stroke-linejoin="round" />
    <path d="M17.8 25 H22.2 V33.4 H17.8 Z" fill="#a02a13" stroke="#3d0d05" stroke-width="1.2" />
    <circle cx="20" cy="35.4" r="2.9" fill="#d99a13" stroke="#5a3905" stroke-width="1.3" />
  </g>
  <!-- 前方那把 -->
  <g transform="rotate(45 20 20)" stroke-linejoin="round" stroke-linecap="round">
    ${BLADE}
  </g>
</svg>`;

// 行军方向：小三角箭头（尖朝正北，靠 CSS 的 --rot 旋到行进方位角）。
// 曾试过"骑马小人"侧视剪影：马腿动画、鬃毛、长马脸在 40px 的实际尺寸下细节全糊，
// 远看还不如一个干净的三角准 —— 尺寸小、方向明确、不挡路线。
// 比例刻意做"窄高"（13×20，尖角约 34°、底角约 73°）：宽扁三角转到斜向时，
// 底角比尖角还尖，方向会读不出来；窄高之后尖角永远是最尖的那个角。
// 填充取阵营色（--pin-color），近黑描边 + CSS 白晕，浅底深底都能分辨。
const TRI = `
<svg viewBox="0 0 14 22" width="13" height="20.4" aria-hidden="true">
  <path d="M7 1 L13.2 20.6 H0.8 Z"
        fill="var(--pin-color, #b2543a)" stroke="#2a1a0b" stroke-width="1.5"
        stroke-linejoin="round"/>
</svg>`;

// 交战：双刀交叉 + 冲击星芒 + 外扩红环（"两军接触"的爆点）。
// 星芒只画一圈短刺（不伸到图标边缘），否则 42px 下会读成"罗盘/靶心"，
// 反而盖住双刀。红环由 CSS 的 .pin-burst 无限外扩（见 style.css）。
const SPIKE = '<path d="M20 5.2 L22.3 10.8 L17.7 10.8 Z"/>';
const CLASH = `
<svg viewBox="0 0 40 40" width="42" height="42" aria-hidden="true">
  <g fill="#ffd24a" stroke="#a1590a" stroke-width="0.7" opacity="0.92">
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<g transform="rotate(${a} 20 20)">${SPIKE}</g>`).join('')}
  </g>
  <circle cx="20" cy="20" r="9.2" fill="#fff3d0" opacity="0.92"/>
  <g stroke-linejoin="round" stroke-linecap="round">
    <g transform="rotate(-45 20 20)" opacity="0.92">
      <path d="M20 4.6 L22.6 9.4 V19 H17.4 V9.4 Z" fill="#cfe0f2" stroke="#1b2836" stroke-width="1.3"/>
      <path d="M13 19.4 H27 L25.8 22 H14.2 Z" fill="#d99a13" stroke="#5a3905" stroke-width="1.1"/>
      <path d="M18.2 22 H21.8 V28.4 H18.2 Z" fill="#a02a13" stroke="#3d0d05" stroke-width="1"/>
      <circle cx="20" cy="30" r="2.4" fill="#d99a13" stroke="#5a3905" stroke-width="1.1"/>
    </g>
    <g transform="rotate(45 20 20)">
      <path d="M20 4.6 L22.6 9.4 V19 H17.4 V9.4 Z" fill="#f4f9ff" stroke="#1b2836" stroke-width="1.3"/>
      <path d="M13 19.4 H27 L25.8 22 H14.2 Z" fill="#ffc22e" stroke="#6b4406" stroke-width="1.1"/>
      <path d="M18.2 22 H21.8 V28.4 H18.2 Z" fill="#c8371c" stroke="#4a1006" stroke-width="1"/>
      <circle cx="20" cy="30" r="2.4" fill="#ffc22e" stroke="#6b4406" stroke-width="1.1"/>
    </g>
  </g>
</svg>`;

// 近代史事件：圆形徽记（阵营色由 --pin-color 给），中心一枚浅色圆心。
// 不做成具体物象（旗帜、炸弹之类）是因为事件类型太杂：一场起义、一次条约签订、
// 一次会议都可能是同一个点，抽象圆徽反而不会误读；颜色承担"分组"（晚清/军阀/红军/抗战/解放）。
const EVENT = `
<svg viewBox="0 0 32 32" width="25" height="25" aria-hidden="true">
  <circle cx="16" cy="16" r="10.2" fill="var(--pin-color, #b23c34)" stroke="#2a1a0b" stroke-width="1.9"/>
  <circle cx="16" cy="16" r="4.1" fill="#fff6e6"/>
</svg>`;

const ICONS = { pass: TOWER, battle: CLASH, clash: CLASH, tri: TRI, rider: TRI, event: EVENT };

export function pinIcon(kind) {
  return ICONS[kind] || TOWER;
}

// 图钉 DOM：0×0 的锚点盒 + 居中图标 + 下方文字标签（白晕保证压在深色疆域上也清楚）
// clash 额外带一个外扩红环（.pin-burst），用来表现"两军相撞"的瞬间。
export function pinHtml(kind, label) {
  const burst = kind === 'clash' ? '<span class="pin-burst"></span>' : '';
  const text = label ? `<span class="pin-label">${label}</span>` : '';
  return `<span class="pin-icon">${burst}${pinIcon(kind)}</span>${text}`;
}
