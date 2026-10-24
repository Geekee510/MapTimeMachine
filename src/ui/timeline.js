// 时间轴控件：滑块 + 播放/暂停 + 速度/步长下拉(1×/2×/5×/10×) + 步进按钮 + 年份刻度。
// 同一个下拉框同时控制播放速度与时间粒度（步长=下拉框取值年/步），二者同步，
// 不再随地图缩放变化。
// 进度条下方有一排可点击年份刻度：点击某年 → 联动地图跳到该年并弹出“世界大事”浮层；
// 再次点击同一年 → 浮层消失（toggle）；拖动滑块或点步进按钮时浮层自动关闭，避免错位。
import { getWorldEvents } from '../data/worldEvents.js';

export function createTimeline({ min, max, value, onYear, onPlayToggle }) {
  const slider = document.getElementById('year-slider');
  const playBtn = document.getElementById('play-btn');
  const speedSel = document.getElementById('speed-select');
  const readout = document.getElementById('year-readout');
  const stepFwd = document.getElementById('step-fwd');
  const stepBack = document.getElementById('step-back');
  const timelineEl = document.getElementById('timeline');
  const worldBox = document.getElementById('world-events');

  slider.min = min;
  slider.max = max;
  slider.value = value;
  readout.textContent = value;

  let playing = false;
  let timer = null;
  // 时间粒度（步长，年/步）= 下拉框当前取值；与播放速度共用同一控件
  let currentStep = speedSel ? parseInt(speedSel.value, 10) || 1 : 1;

  // 当前打开世界大事浮层的年份（null 表示关闭）
  let worldBoxYear = null;

  function setYear(y) {
    y = Math.max(min, Math.min(max, y));
    slider.value = y;
    readout.textContent = y;
    onYear(y);
  }

  // 关闭世界大事浮层（清除高亮、隐藏浮层）
  function closeWorldBox() {
    if (worldBox) worldBox.classList.add('hidden');
    worldBoxYear = null;
    document.querySelectorAll('.year-tick').forEach((el) => el.classList.remove('active'));
  }

  // 打开世界大事浮层（填充该年事件并高亮对应刻度）
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
    html += '<div class="we-foot">公开史料概要 · 再次点击同一年的年份可关闭</div>';
    worldBox.innerHTML = html;
    worldBox.classList.remove('hidden');
    worldBoxYear = y;
    document.querySelectorAll('.year-tick').forEach((el) => {
      el.classList.toggle('active', parseInt(el.dataset.year, 10) === y);
    });
  }

  // 生成年份刻度（起点 + 每10年 + 终点），分布在进度条下方
  function buildYearTicks() {
    if (!timelineEl) return;
    let wrap = document.getElementById('year-ticks');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'year-ticks';
      wrap.className = 'year-ticks';
      timelineEl.appendChild(wrap);
    }
    const years = [];
    years.push(min);
    for (let y = Math.ceil((min + 1) / 10) * 10; y < max; y += 10) years.push(y);
    if (max !== min && years[years.length - 1] !== max) years.push(max);

    for (const y of years) {
      const s = document.createElement('span');
      s.className = 'year-tick';
      s.dataset.year = y;
      s.textContent = y;
      s.title = `查看 ${y} 年世界大事`;
      s.addEventListener('click', () => {
        // 再点同一年 → 关闭浮层（toggle）；点不同年 → 跳年并打开
        if (worldBoxYear === y) {
          closeWorldBox();
          return;
        }
        setYear(y);
        openWorldBox(y);
      });
      wrap.appendChild(s);
    }
  }
  buildYearTicks();

  // 下拉框变化 → 同步更新步长（速度由 startInterval 实时读取，无需缓存）
  if (speedSel) {
    speedSel.addEventListener('change', () => {
      currentStep = parseInt(speedSel.value, 10) || 1;
    });
  }

  // 拖动滑块：关闭浮层（避免与刻度点击状态冲突），并联动年份
  slider.addEventListener('input', () => {
    closeWorldBox();
    setYear(parseInt(slider.value, 10));
  });

  // 步进按钮：同样关闭浮层
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
