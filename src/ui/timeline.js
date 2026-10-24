// 时间轴控件：滑块 + 播放/暂停 + 速度/步长下拉(1×/2×/5×/10×) + 步进按钮。
// 同一个下拉框同时控制播放速度与时间粒度（步长=下拉框取值年/步），二者同步，
// 不再随地图缩放变化。
// 右侧年份读数可点击：点击 → 弹出当前年份“世界大事”浮层；再次点击 → 浮层消失。
// 年份变化（拖动滑块/步进/播放）时浮层自动关闭，避免内容与年份错位。
import { getWorldEvents } from '../data/worldEvents.js';

export function createTimeline({ min, max, value, onYear, onPlayToggle }) {
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

  // 世界大事浮层当前展示的年份（null 表示关闭）
  let worldBoxYear = null;

  function closeWorldBox() {
    if (worldBox) worldBox.classList.add('hidden');
    if (readout) readout.classList.remove('world-active');
    worldBoxYear = null;
  }

  function openWorldBox(y) {
    if (!worldBox) return;
    const evs = getWorldEvents(y);
    let html = `<div class="we-head">🌍 ${y} 年 · 世界大事</div>`;
    if (evs.length) {
      html += '<ul class="we-list">';
      for (const e of evs) {
        html += `<li><div class="we-title">${e.t}</div>${e.d ? `<div class="we-desc">${e.d}</div>` : ''}</li>`;
      }
      html += '</ul>';
    } else {
      html += '<div class="we-empty">该年份暂无收录世界大事</div>';
    }
    html += '<div class="we-foot">公开史料概要 · 再次点击年份可关闭</div>';
    worldBox.innerHTML = html;
    worldBox.classList.remove('hidden');
    if (readout) readout.classList.add('world-active');
    worldBoxYear = y;
  }

  function setYear(y) {
    y = Math.max(min, Math.min(max, y));
    slider.value = y;
    readout.textContent = y;
    onYear(y);
  }

  // 下拉框变化 → 同步更新步长（速度由 startInterval 实时读取，无需缓存）
  if (speedSel) {
    speedSel.addEventListener('change', () => {
      currentStep = parseInt(speedSel.value, 10) || 1;
    });
  }

  // 年份读数可点击：点击展示当前年份世界大事，再次点击消失（toggle）
  if (readout) {
    readout.classList.add('clickable');
    readout.title = '点击查看该年份世界大事';
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
      closeWorldBox(); // 播放时年份连续变化，先关掉大事浮层
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

  return { setYear };
}
