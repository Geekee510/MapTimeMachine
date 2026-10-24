// 数据加载器：CShapes 历史疆域 GeoJSON（1886–2023）
// 公共目录 public/data 下，前端直接 fetch 静态文件。
// 当前使用全精度原文件（约 26MB，边界最准，适合本机/MVP 开发）。
// 正式部署到 Linux 时建议改用 PMTiles 矢量瓦片（按需加载、省 90%+ 流量），见需求报告。
// CShapes 真实时间字段为 gwsyear/gweyear（数值），日期字符串为 gwsdate/gwedate（DD.MM.YYYY）。
const CSAPES_URL = './data/cshapes-2.1.geojson';

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function yearFromDate(s, fallback) {
  if (s == null) return fallback;
  const m = String(s).match(/(\d{4})/); // "31.12.1885 23:00:00" -> 1885
  return m ? parseInt(m[1], 10) : fallback;
}

/**
 * 加载 CShapes 并预处理为带 startYear/endYear 的扁平数组。
 * @returns {Promise<Array<{feature:object, startYear:number, endYear:number, props:object}>>}
 */
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
 * @returns {Promise<Array<{feature:object, startYear:number, endYear:number, props:object}>>}
 */
export async function loadCShapes() {
  let gj;
  try {
    gj = await fetchCShapesOnce();
  } catch (e) {
    console.warn('[CShapes] 第一次加载失败，自动重试一次：', e.message);
    gj = await fetchCShapesOnce();
  }
  const YEAR_MIN = 1886;
  const YEAR_MAX = 2023;
  return gj.features.map((f) => {
    const p = f.properties || {};
    const sy = toNum(p.gwsyear) ?? yearFromDate(p.gwsdate, YEAR_MIN);
    let ey = toNum(p.gweyear);
    if (ey == null || ey < sy) ey = yearFromDate(p.gwedate, YEAR_MAX);
    if (ey == null || ey < sy) ey = YEAR_MAX;
    return { feature: f, startYear: sy, endYear: ey, props: p };
  });
}
