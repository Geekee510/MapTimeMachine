// 时间轴控件：滑块 + 播放/暂停 + 速度/步长下拉(1×/2×/5×/10×) + 步进按钮。
// 同一个下拉框同时控制播放速度与时间粒度（步长=下拉框取值年/步），二者同步，
// 不再随地图缩放变化。
export function createTimeline({ min, max, value, onYear, onPlayToggle }) {
  const slider = document.getElementById('year-slider');
  const playBtn = document.getElementById('play-btn');
  const speedSel = document.getElementById('speed-select');
  const readout = document.getElementById('year-readout');
  const stepFwd = document.getElementById('step-fwd');
  const stepBack = document.getElementById('step-back');

  slider.min = min;
  slider.max = max;
  slider.value = value;
  readout.textContent = value;

  let playing = false;
  let timer = null;
  // 时间粒度（步长，年/步）= 下拉框当前取值；与播放速度共用同一控件
  let currentStep = speedSel ? parseInt(speedSel.value, 10) || 1 : 1;

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

  slider.addEventListener('input', () => setYear(parseInt(slider.value, 10)));

  stepFwd.addEventListener('click', () => setYear(parseInt(slider.value, 10) + currentStep));
  stepBack.addEventListener('click', () => setYear(parseInt(slider.value, 10) - currentStep));

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
