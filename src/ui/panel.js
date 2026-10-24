// 右侧面板：图层开关 + 复位 + 信息卡展示
// CShapes 真实字段：cntry_name / capname / area / gwcode / gwsyear / gweyear / status
import { zhCountry, zh, bilingual, RIVER_ZH, MOUNTAIN_ZH } from '../data/i18n.js';

export function createPanel({ onToggleLayer, onReset, onShowInfo }) {
  const tTerritory = document.getElementById('toggle-territory');
  const tRiver = document.getElementById('toggle-river');
  const tMountain = document.getElementById('toggle-mountain');
  const tLake = document.getElementById('toggle-lake');
  const tBasemap = document.getElementById('toggle-basemap');
  const tZh = document.getElementById('toggle-zh');
  const resetBtn = document.getElementById('reset-view');
  const info = document.getElementById('info');
  const infoClose = document.getElementById('info-close');

  tTerritory.addEventListener('change', () => onToggleLayer('territory', tTerritory.checked));
  tRiver.addEventListener('change', () => onToggleLayer('river', tRiver.checked));
  tMountain.addEventListener('change', () => onToggleLayer('mountain', tMountain.checked));
  tLake.addEventListener('change', () => onToggleLayer('lake', tLake.checked));
  tBasemap.addEventListener('change', () => onToggleLayer('basemapLand', tBasemap.checked));
  tZh.addEventListener('change', () => onToggleLayer('zh', tZh.checked));
  resetBtn.addEventListener('click', onReset);
  infoClose.addEventListener('click', () => info.classList.add('hidden'));

  const STATUS_LABEL = {
    independent: ['独立国家', '#96be8c'],
    colony: ['殖民地', '#e6c882'],
    protectorate: ['保护国', '#e1a05a'],
    mandate: ['托管地', '#be82b4'],
    occupied: ['被占领土', '#c84646'],
  };

  return {
    showInfo(props) {
      const name = document.getElementById('info-name');
      const body = document.getElementById('info-body');
      const viewYear = parseInt(document.getElementById('year-display')?.textContent || '0', 10) || null;
      // 山脉点没有政权时间属性，单独处理
      if (props.status === 'mountain') {
        const en = props.name || '山脉';
        const cn = zh(MOUNTAIN_ZH, en);
        // 同步"中文标签"开关：中文模式「中文（英文）」，英文模式只显示英文原名
        const zhOn = document.getElementById('toggle-zh')?.checked;
        name.textContent = zhOn && cn !== en ? `${cn}（${en}）` : en;
        body.innerHTML = `<div><span class="k">类型：</span><span class="status-tag" style="background:#78553a">山脉 / 山峰 / 高原</span></div>`;
        if (props.name) body.innerHTML += `<div><span class="k">名称：</span>${en}${zhOn && cn !== en ? `（${cn}）` : ''}</div>`;
        info.classList.remove('hidden');
        if (onShowInfo) onShowInfo(props);
        return;
      }
      const enName = props.cntry_name || '未知政权';
      const cnName = zhCountry(enName);
      name.textContent = bilingual(cnName, enName);

      const st = STATUS_LABEL[props.status] || ['其他', '#999'];
      const rows = [];
      const start = props.gwsyear != null ? props.gwsyear : null;
      const end = props.gweyear != null ? props.gweyear : null;
      const ongoing = end == null || end >= 2023;
      const endLabel = ongoing ? '今' : end;
      rows.push(
        `<div><span class="k">存续：</span>${start != null ? start : '?'} – ${endLabel}</div>`
      );
      // 历时年数（截至当前视图年份或终止年）
      if (start != null) {
        const calcEnd = ongoing ? (viewYear || 2023) : end;
        const dur = Math.max(0, calcEnd - start);
        rows.push(`<div><span class="k">历时：</span>约 ${dur} 年${ongoing ? '（延续中）' : ''}</div>`);
      }
      if (viewYear) rows.push(`<div><span class="k">当前视图年份：</span>${viewYear}</div>`);
      rows.push(
        `<div><span class="k">类型：</span><span class="status-tag" style="background:${st[1]}">${st[0]}</span></div>`
      );
      if (props.capname) rows.push(`<div><span class="k">首都：</span>${props.capname}</div>`);
      if (props.area != null)
        rows.push(`<div><span class="k">面积：</span>${Math.round(Number(props.area)).toLocaleString()} km²</div>`);
      if (props.gwcode != null) rows.push(`<div><span class="k">GW 编码：</span>${props.gwcode}</div>`);
      body.innerHTML = rows.join('');
      info.classList.remove('hidden');
      if (onShowInfo) onShowInfo(props);
    },
  };
}
