import { regionOf } from './polity-desc.js';

// 数据加载器：CShapes 历史疆域 GeoJSON（1886–2023）
// 公共目录 public/data 下，前端直接 fetch 静态文件。
// 当前使用全精度原文件（约 26MB，边界最准，适合本机/MVP 开发）。
// 正式部署到 Linux 时建议改用 PMTiles 矢量瓦片（按需加载、省 90%+ 流量），见需求报告。
//
// CShapes 时间字段：gwsyear/gweyear（整数年），gwsdate/gwedate（"DD.MM.YYYY HH:MM:SS"）。
//
// ⚠️ 时间语义（搞错会导致渲染错误，务必牢记）：
//   1) gweyear 是"该片疆域结束的日历年"，而且**与下一片的 gwsyear 常常相同**——
//      同一年内可能发生多次疆域变更，被切成多片。典型：美国
//      [1886~1959]（本土48州）/ [1959~1959]（+阿拉斯加）/ [1959~2023]（+夏威夷），
//      起始日分别是 1885-12-31 / 1959-01-02 / 1959-08-20。
//      若简单用 start<=y<=end 过滤，1959 年会有 3 个美国多边形叠在一起（填充叠色、
//      边界重影、点选命中错层）。
//      → 同年多片时只保留 **起始日期最晚** 的那一片（即该年的最终状态）。
//      全量校验：710 个要素中共有 395 个"国-年"存在这种年内切片（单年最多 7 片），
//      且**不存在**"同国同年且起始日相同"的情况（即没有需要同时渲染的并列领土），
//      所以"取最晚一片"不会丢领土。见 startKey 字段。
//   2) 存在"空档年"：某国某几年没有任何要素（CShapes 不把苏联各加盟共和国当作
//      独立国家，故爱沙尼亚 1941–1990 无疆域）。这是数据事实，渲染时如实留白。
const CSAPES_URL = './data/cshapes-2.1.geojson';
const YEAR_MIN = 1886;
const YEAR_MAX = 2023;

function toNum(v) {
  // 注意：Number(null) === 0、Number('') === 0，必须显式排除，
  // 否则字段缺失时 startYear 会变成 0（公元前），过滤结果全错。
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function yearOf(s) {
  const m = String(s ?? '').match(/(\d{4})/); // "31.12.1885 23:00:00" -> 1885
  return m ? parseInt(m[1], 10) : null;
}
// "31.12.1885 23:00:00" -> 18851231，可直接比较大小（用于年内切片取最晚一片）
function dateKey(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : 0;
}

// ---- 主权归属校正 ----
// CShapes 沿用 COW/GW 体系，个别条目与我国立场不符：
//   · 台湾 1895–1945 为日本殖民地（CShapes 记 colony / ruledby=740 日本，正确）；
//     但 1945 年台湾光复归还中国后，CShapes 仍记为 **independent 独立政权**
//     （gwcode 713，且 1946–1948 年无要素 → 台湾岛会整段消失）。
//   · 西藏 1913–1950 同样被记为 independent（gwcode 711）。
// 台湾、西藏是中国领土不可分割的一部分，历史上从未成为独立国家，
// 故统一并入中国（China）渲染：与中国同色、不再作为单独"国家"标注。
// 只改显示名与归属标记，**不改 gwcode**（改了会与年内切片去重的分组键冲突，
// 导致台湾要素把中国本土要素挤掉）。
const CHINA_PART = {
  Taiwan: { from: 1946, zh: '中国台湾' }, // 1946 起（补上 CShapes 缺失的 1946–1948）
  Tibet: { from: 1913, zh: '中国西藏' },
};

// 粗算要素的中心经纬度（只扫每个 Polygon 的首个外环，够用于判断所属大区，避免全量扫描拖慢启动）
function roughCenter(geometry) {
  if (!geometry) return null;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  let sx = 0; let sy = 0; let n = 0;
  for (const poly of polys) {
    const ring = poly && poly[0];
    if (!Array.isArray(ring)) continue;
    for (const c of ring) {
      if (Array.isArray(c) && typeof c[0] === 'number') { sx += c[0]; sy += c[1]; n++; }
    }
  }
  return n ? [sx / n, sy / n] : null;
}

async function fetchCShapesOnce() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // 60s 超时（26MB 本地也应秒级，超时说明服务异常）
  let res;
  try {
    res = await fetch(CSAPES_URL, { signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    throw new Error('CShapes 网络请求失败（数据文件未部署或网络受限）: ' + e.message);
  }
  clearTimeout(timer);
  if (!res.ok) throw new Error('CShapes 数据加载失败: HTTP ' + res.status);
  console.time('[CShapes] 下载+解析耗时');
  const gj = await res.json();
  console.timeEnd('[CShapes] 下载+解析耗时');
  return gj;
}

/**
 * 加载 CShapes 并预处理为带 startYear/endYear 的扁平数组。
 * 失败自动重试一次（dev server 偶发 26MB 大文件传输中断）。
 * @returns {Promise<Array<{feature:object, startYear:number, endYear:number, startKey:number, props:object}>>}
 */
export async function loadCShapes() {
  let gj;
  try {
    gj = await fetchCShapesOnce();
  } catch (e) {
    console.warn('[CShapes] 第一次加载失败，自动重试一次：', e.message);
    gj = await fetchCShapesOnce();
  }
  let fixed = 0;
  const out = gj.features.map((f) => {
    const p = f.properties || {};
    let sy = toNum(p.gwsyear) ?? yearOf(p.gwsdate);
    let ey = toNum(p.gweyear) ?? yearOf(p.gwedate);
    if (sy == null) sy = YEAR_MIN;
    if (ey == null || ey < sy) ey = YEAR_MAX;

    // status 缺失兜底（数据中 Morocco 1904 两条缺 status）：有宗主国即为属地
    if (!p.status) {
      p.status = p.ruledby != null && p.ruledby !== p.gwcode ? 'colony' : 'independent';
    }

    // 主权归属校正：台湾（1946 起）/ 西藏（1913 起）并入中国
    const fix = CHINA_PART[p.cntry_name];
    if (fix && ey >= fix.from) {
      p.cntry_orig = p.cntry_name; // 原名（供信息卡显示"中国台湾/中国西藏"）
      p.cntry_name = 'China'; // 标签与配色并入中国
      p.isChinaPart = true;
      p.zh_override = fix.zh;
      p.status = 'independent';
      p.ruledby = p.gwcode; // 不再显示"殖民主国/宗主国"
      // 台湾：把起始年提前到光复后的 1946 年。CShapes 的台湾要素从 1949 年起，
      // 1946–1948 三年没有任何要素 → 台湾岛会在地图上整段消失，必须补上。
      sy = Math.min(sy, fix.from);
      fixed++;
    }

    // 所属大区（供信息卡生成兜底简介，如"位于东亚的独立国家"）
    const c = roughCenter(f.geometry);
    p.region = c ? regionOf(c[0], c[1]) : '';

    return {
      feature: f,
      startYear: sy,
      endYear: ey,
      startKey: dateKey(p.gwsdate) || sy * 10000, // 起始日期键：同年多片时取最晚一片
      props: p,
    };
  });
  if (fixed) console.info(`[CShapes] 主权归属校正：${fixed} 个要素并入中国（台湾/西藏是中国领土不可分割的一部分）`);
  return out;
}
