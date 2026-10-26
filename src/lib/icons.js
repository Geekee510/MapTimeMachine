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

const HORSE = '#a9703a';
const HORSE_DARK = '#8a5729';
const LINE = '#2a1a0b';

// 骑马的武将（侧视、朝右，参考"连环画骑将"的剪影）
// ---------------------------------------------------------------------------
// 三条硬约束（前几版都踩过）：
//   ① 侧视图**不能跟着方位角转圈**。旧实现把 bearing 塞进 transform，向南行进时
//      整匹马颠倒（马腿朝天、骑手头朝下）——这就是"头朝下了"。现在只做
//      scaleX(±1) 左右翻转，人马永远站在地上。
//   ② 腿不能是细黑线：56×40 的画布里，2.4px 的单 stroke 会读成"蜘蛛腿"。改为
//      **深描边 + 浅马腿**的双层描边（先 4px 近黑、再 2.2px 棕），末端补一块蹄子。
//   ③ 骑手不能是"瓶子"：要有明显更宽的肩甲、前倾的身体、垂在马腹侧的大腿，
//      否则缩到实际尺寸只剩一根竖条。
const LEG = (d, hoof) => `
    <path d="${d}" fill="none" stroke="${LINE}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${HORSE_DARK}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${hoof}" fill="none" stroke="${LINE}" stroke-width="3.2" stroke-linecap="round"/>`;

const RIDER = `
<svg viewBox="0 0 56 40" width="54" height="38.6" aria-hidden="true">
  <!-- 落地阴影：让人马"站在"地图上，不飘 -->
  <ellipse cx="29" cy="34.6" rx="16" ry="2.2" fill="#2a1a0b" opacity="0.15"/>

  <!-- 远侧两腿（先画，被身体压住，天然有前后层次） -->
  <g class="h-leg h-rear-far" opacity="0.85">${LEG('M18.6 24 L14.4 28.4 L12.8 32.2', 'M12.8 32.2 L10.4 33')}</g>
  <g class="h-leg h-front-far" opacity="0.85">${LEG('M35.4 24.4 L37.4 28.8 L38.6 32.4', 'M38.6 32.4 L40.8 33')}</g>

  <!-- 尾巴：根粗梢细，两笔叠出层次 -->
  <g class="h-tail" fill="none" stroke="${LINE}" stroke-linecap="round">
    <path d="M14.2 17.2 C 9.6 15.8 5.4 17.6 3.4 22.2" stroke-width="3.6" opacity="0.9"/>
    <path d="M14.2 17.2 C 9.6 15.8 5.4 17.6 3.4 22.2" stroke-width="1.7" stroke="#4a3220"/>
    <path d="M13.4 20.4 C 9.8 19.8 7 21.4 5.4 24.8" stroke-width="1.7" stroke="#3a2717" opacity="0.9"/>
  </g>

  <g class="h-body">
    <!-- 躯干 -->
    <path d="M40 19 C 40.8 15.4 38.2 13.8 33.8 13.7 C 27.2 13.5 20 13.6 16.6 15.6
             C 13.2 17.6 12.4 21.4 13.2 24.4 C 14 26.8 18.4 27.2 23.4 27 L 33.8 26.6
             C 38.2 26.4 39.6 23.6 40 19 Z"
          fill="${HORSE}" stroke="${LINE}" stroke-width="1.7" stroke-linejoin="round"/>
    <!-- 颈部（粗带，上缘即颈脊） -->
    <path d="M35.4 20.6 C 36.4 14.4 40 9.2 45.6 6.6 L 48.6 11.8 C 44.8 14 42.4 17.6 41.4 21.8 Z"
          fill="${HORSE}" stroke="${LINE}" stroke-width="1.7" stroke-linejoin="round"/>
    <!-- 头：额 → 鼻梁 → 圆口 → 下颌 → 颊（要够"长脸"，短了就读成鸟嘴） -->
    <path d="M45.4 6.6 C 48 6.4 50.8 7.4 52.6 9 L 55 11.2 C 55.4 12.2 54.6 13.2 53.4 13.2
             C 51.6 13.2 49.6 12.4 48.2 11.2 C 46.6 10 45.6 8.6 45.2 7.4 Z"
          fill="${HORSE}" stroke="${LINE}" stroke-width="1.7" stroke-linejoin="round"/>
    <!-- 鬃毛：贴着颈脊的一条带（不是盖住半个脖子的大三角） -->
    <path d="M36.4 19.4 C 37.4 13.4 40.6 8.8 45.6 6.6 L 46.6 9.2 C 42.8 11.4 40.2 15 39.4 19.8 Z"
          fill="${LINE}" opacity="0.8"/>
    <!-- 耳（向后上方）+ 额前一撮鬃 -->
    <path d="M45.4 6.6 L45 2.6 L47.4 6.2 Z" fill="${HORSE}" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M45.6 6.6 L47.4 3.6 L48.4 6.6 Z" fill="${LINE}" opacity="0.75"/>
    <!-- 眼 / 鼻孔 / 笼头 -->
    <circle cx="49.2" cy="9.4" r="0.9" fill="${LINE}"/>
    <path d="M54.4 11.4 L53.4 11.5" stroke="${LINE}" stroke-width="1" fill="none"/>
    <path d="M47.6 7.6 C 48.6 9.4 49.6 10.8 50.8 12.2" stroke="#6b3a12" stroke-width="1.1" fill="none"/>
  </g>

  <!-- 鞍垫（暗红 + 金边） -->
  <path d="M22 14 C 25.8 12.2 32.2 12.2 35 14.2 L 36 20.8 L 21.2 21.2 Z"
        fill="#8f2f1e" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M21.4 20.4 L35.7 20" stroke="#d9a13a" stroke-width="1.1" fill="none"/>

  <!-- 骑将：甲胄用阵营色（--pin-color），头盔深铁灰 + 红缨，肩甲加宽 -->
  <g class="h-rider">
    <!-- 躯干（微微前倾） -->
    <path d="M25.4 14 L26.6 8.4 L31.6 7.8 L32.8 13.8 Z"
          fill="var(--pin-color, #b2543a)" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round"/>
    <!-- 肩甲（比躯干宽，这是"人"读得出来的关键） -->
    <path d="M24.8 9.4 C 26 6.8 32.2 6.6 33.4 9.4 L 32.6 11.2 L 25.6 11.4 Z"
          fill="var(--pin-color, #b2543a)" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- 头 + 头盔 + 红缨 -->
    <circle cx="29" cy="5" r="2.6" fill="#f6e0bb" stroke="${LINE}" stroke-width="1.1"/>
    <path d="M26.2 4.6 C 26.4 1.4 31.6 1.4 31.8 4.6 L 33.2 5.2 L 25.4 5.2 Z"
          fill="#5a5f6b" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M29 1.6 C 28.2 0.4 29.8 0 30.6 1" fill="none" stroke="#c8371c" stroke-width="1.5" stroke-linecap="round"/>
    <!-- 前伸持缰的手臂 -->
    <path d="M31 9.4 L36.4 11.5" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M31 9.4 L36.4 11.5" fill="none" stroke="var(--pin-color, #b2543a)" stroke-width="1.2" stroke-linecap="round"/>
    <!-- 大腿（前伸）+ 小腿（下垂）+ 靴 -->
    <path d="M27 14 L31.8 17.4 L32.8 22" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M27 14 L31.8 17.4 L32.8 22" fill="none" stroke="#7a4a22" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M31.4 22.6 L34.2 23.4" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/>
  </g>

  <!-- 缰绳：手 → 马嘴（这一笔最能说明"有人在骑"） -->
  <path d="M36.6 11.6 C 42.4 13.8 49.4 13.2 54 10.8" fill="none" stroke="#5a3010" stroke-width="1.05" opacity="0.92"/>

  <!-- 近侧两腿（画在最上层，跑动时最醒目） -->
  <g class="h-leg h-rear-near">${LEG('M16.4 24.4 L11.4 28.4 L8.6 32.2', 'M8.6 32.2 L6.2 33')}</g>
  <g class="h-leg h-front-near">${LEG('M37.6 24.8 L40.6 28.6 L43.4 32.2', 'M43.4 32.2 L45.6 33')}</g>
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

const ICONS = { pass: TOWER, battle: CLASH, clash: CLASH, rider: RIDER };

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
