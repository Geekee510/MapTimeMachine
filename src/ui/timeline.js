// 时间轴控件：滑块 + 播放/暂停 + 速度/步长下拉(1×/2×/5×/10×) + 步进按钮。
// 同一个下拉框同时控制播放速度与时间粒度（步长=下拉框取值年/步），二者同步，
// 不再随地图缩放变化。
// 右侧年份读数可点击：点击 → 弹出当前年份事件浮层；再次点击 → 浮层消失。
// 年份变化（拖动滑块/步进/播放）时浮层自动关闭，避免内容与年份错位。
// setRange(min,max,value)：供“世界/中国”模式切换时改变时间轴范围。
// getYearEvents(year)：外部提供“某年份事件内容”（世界模式=世界大事，中国模式=朝代信息）。
import { getWorldEvents } from '../data/worldEvents.js';

export function createTimeline({ min, max, value, onYear, onPlayToggle, getYearEvents }) {
  const slider = document.getElementById('year-slider');
  const playBtn = document.getElementById('play-btn');
  const speedSel = document.getElementById('speed-select');
  const readout = document.getElementById('year-readout');
  const stepFwd = document.getElementById('step-fwd');
  const stepBack = document.getElementById('step-back');
  const worldBox = document.getElementById('world-events');

  slider.min = min;
  slider.max = max;
  slider.value = value;
  readout.textContent = value;

  let playing = false;
  let timer = null;
  // 时间粒度（步长，年/步）= 下拉框当前取值；与播放速度共用同一控件
  let currentStep = speedSel ? parseInt(speedSel.value, 10) || 1 : 1;

  // 世界大事/朝代浮层当前展示的年份（null 表示关闭）
  let worldBoxYear = null;

  // 年份格式化：负年份显示为“前N”
  const fmtYear = (y) => (y < 0 ? `前${-y}` : `${y}`);

  function closeWorldBox() {
    if (worldBox) worldBox.classList.add('hidden');
    if (readout) readout.classList.remove('world-active');
    worldBoxYear = null;
  }

  function openWorldBox(y) {
    if (!worldBox) return;
    // 事件内容由外部提供；未提供则回退到世界大事
    let info = getYearEvents ? getYearEvents(y) : null;
    if (!info) info = { title: `🌍 ${fmtYear(y)} 年 · 世界大事`, items: getWorldEvents(y) };
    const items = info.items || [];
    const ongoing = info.ongoing || [];
    // 分类徽标：政(蓝)/外(青)/战(红)/经(绿)/文(黄)/科(紫)，与世界模式同一套写法。
    // 缺 cat 的条目（如世界大事）不画徽标，靠左侧竖线区分即可。
    const li = (e, on) => {
      const catBadge = e.cat ? `<span class="we-cat cat-${e.cat}">${e.cat}</span>` : '';
      const span = e.span ? `<span class="we-span">${e.span}</span>` : '';
      return `<li${on ? ' class="we-on"' : ''}><div class="we-title">${catBadge}${e.t}${span}</div>${e.d ? `<div class="we-desc">${e.d}</div>` : ''}</li>`;
    };
    let html = `<div class="we-head">${info.title}</div>`;
    if (items.length) {
      html += '<ul class="we-list">';
      for (const e of items) html += li(e);
      html += '</ul>';
    } else if (!ongoing.length) {
      html += '<div class="we-empty">该年份暂无收录内容</div>';
    }
    // 跨年未结束的事件单列一段：它们不是"本年发生的事"，
    // 混进主列表会让人误以为鸦片战争是 1841 年爆发的。
    if (ongoing.length) {
      html += `<div class="we-sub">本年仍在进行<span class="we-n">${ongoing.length}</span></div>`;
      html += '<ul class="we-list we-list-ongoing">';
      for (const e of ongoing) html += li(e, true);
      html += '</ul>';
    }
    html += '<div class="we-foot">再次点击年份可关闭</div>';
    worldBox.innerHTML = html;
    worldBox.classList.remove('hidden');
    if (readout) readout.classList.add('world-active');
    worldBoxYear = y;
  }

  function setYear(y) {
    y = Math.max(min, Math.min(max, y));
    slider.value = y;
    readout.textContent = fmtYear(y);
    onYear(y);
  }

  // 动态改变时间轴范围（模式切换时调用），并关闭浮层
  function setRange(newMin, newMax, newValue) {
    min = newMin;
    max = newMax;
    slider.min = min;
    slider.max = max;
    closeWorldBox();
    setYear(newValue);
  }

  // 下拉框变化 → 同步更新步长（速度由 startInterval 实时读取，无需缓存）
  if (speedSel) {
    speedSel.addEventListener('change', () => {
      currentStep = parseInt(speedSel.value, 10) || 1;
    });
  }

  // 年份读数可点击：点击展示当前年份事件，再次点击消失（toggle）
  if (readout) {
    readout.classList.add('clickable');
    readout.title = '点击查看该年份事件';
    readout.addEventListener('click', () => {
      const y = parseInt(slider.value, 10);
      if (worldBoxYear !== null && worldBoxYear === y) {
        closeWorldBox();
      } else {
        openWorldBox(y);
      }
    });
  }

  // 年份变化（拖动/步进/播放）时关闭浮层，避免内容与年份错位
  slider.addEventListener('input', () => {
    closeWorldBox();
    setYear(parseInt(slider.value, 10));
  });

  stepFwd.addEventListener('click', () => {
    closeWorldBox();
    setYear(parseInt(slider.value, 10) + currentStep);
  });
  stepBack.addEventListener('click', () => {
    closeWorldBox();
    setYear(parseInt(slider.value, 10) - currentStep);
  });

  function startInterval() {
    const speed = parseInt(speedSel.value, 10);
    const interval = Math.max(16, 220 - speed * 18); // 速度越快间隔越短
    timer = setInterval(() => {
      let y = parseInt(slider.value, 10) + currentStep;
      if (y > max) {
        playing = false;
        playBtn.textContent = '▶ 播放';
        clearInterval(timer);
        return;
      }
      setYear(y);
    }, interval);
  }

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
    if (onPlayToggle) onPlayToggle(playing);
    if (playing) {
      closeWorldBox(); // 播放时年份连续变化，先关掉浮层
      let y = parseInt(slider.value, 10);
      if (y >= max) setYear(min); // 已到末尾则从头开始
      startInterval();
    } else if (timer) {
      clearInterval(timer);
    }
  });

  speedSel.addEventListener('change', () => {
    if (playing) {
      clearInterval(timer);
      startInterval(); // 重启以应用新速度与步长
    }
  });

  return { setYear, setRange, fmtYear };
}
