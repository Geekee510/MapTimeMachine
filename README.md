# MapTimeMachine · 世界地理历史动态地图

一个**公益学术、公开数据、2D 平面**的世界地理历史动态可视化项目（MVP / 先期验证版）。
在同一张地图上叠加**历史疆域变迁**、**河流 / 山脉 / 湖泊 / 地形晕渲**自然地理要素，配一条 **前3000年–2023 年的时间轴**，可拖动、可播放、可步进，并支持中英文标签切换。

支持 **世界地图 / 中国历代疆域** 两种模式切换：

- **世界模式**：时间下限至**公元前 3000 年**。1886 年之后走 CShapes 2.1（含精确政体状态与宗主国），1886 年之前走 historical-basemaps 的 39 个年代快照（运行时按需拉取 + 缓存 + 相邻年代预取）。
- **中国模式**：按朝代（夏—清，前2070–1912）**加中华民国 / 中华人民共和国**（至 2023）展示疆域演变。采用**双层呈现**——
  - **疆域轮廓**（填充）：汉 / 唐 / 宋 / 元 / 明 / 清 / 现代的真实王朝多边形（含西域、外蒙古）；
  - **历代政区界**（描边）：CHGIS 州 / 郡 / 府 / 路，按 `beg–end` **逐年过滤**，即《中国历史地图集》式呈现。
  - 先秦（夏/商/西周/春秋）为手绘示意疆域，**战国**展示七雄等政权分立；秦 / 三国 / 两晋 / 南北朝 / 隋 / 五代 / 南宋 / 民国无王朝多边形，回落省界拼接。

点击疆域/都城/政区查看详情卡，点击时间轴年份读数查看该年大事（世界模式为世界大事，中国模式为朝代信息）。

> 定位：公益学术 + 开放数据起步；2D 平面；先期验证。中国历代疆域由「真实王朝轮廓 + CHGIS 政区界 + 现代省界拼接（缺数据朝代）」混合构成，先秦部分仍为**示意性近似**，详见 [KNOWN-ISSUES.md](./KNOWN-ISSUES.md)。

---

## 一、项目简介（内容）

- **历史疆域图层**：按年份实时过滤显示各国/政权疆域，颜色区分独立国、殖民地、保护国、托管地、被占领土。
  - 1886–2023：[CShapes 2.1](https://cshapes.org)（含 `ruledby` 宗主国字段，可显示「被谁占领/统治」）
  - 前3000–1886：[historical-basemaps](https://github.com/aourednik/historical-basemaps) 39 个年代快照（含 `SUBJECTO` 宗主国字段）
- **自然地理图层**：
  - 河流（Natural Earth 50m 主要河流，含黄河 / 长江 / 两河 / 多瑙河 / 莱茵河等，含中文河名标签）
  - 山脉（Natural Earth 山脉 / 高原范围质心点 + 中文名称标签）
  - 湖泊（Natural Earth 50m 主要湖泊面）
  - **地形晕渲（山脉形势）**：Amazon Terrarium DEM + MapLibre `hillshade`，喜马拉雅 / 安第斯 / 阿尔卑斯 / 天山 / 昆仑等山系起伏立体可见；开启时疆域填充自动降为半透明，使山体阴影透出
- **中国历代政区界**：CHGIS 州 / 郡 / 府 / 路共 2165 个单元，按设置/废止年代逐年过滤，可点击查看政区详情
- **时间轴**：滑块（前3000–2023，世界模式 / 前2070–2023，中国模式）+ 播放 / 暂停 + 步进（◀/▶）+ 速度 / 步长下拉（1 / 2 / 5 / 10 年）。播放速度与步进粒度共用同一下拉框，二者同步。
- **中英文标签**：右侧面板「中文标签」开关，一键切换国名 / 河名 / 山脉名的显示语言。
- **国旗**：国家名上方显示本地 SVG 国旗（flag-icons，271 面），台湾特判显示中国国旗并标注「中国」。
- **图层开关**：历史疆域、历代政区、主要河流、山脉、地形晕渲、湖泊、底图陆地（含小岛）可分别显隐。
- **交互**：缩放 / 平移地图；点击疆域、政区或山脉点弹出信息卡（存续时间、类型、首都、面积、宗主国等）；拖动年份时介绍卡随当前年份同步，该政权当年不存在则自动清空。

---

## 二、技术栈

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 构建 | **Vite 5** | 纯静态站点，`base: './'` 便于子目录 / Linux 静态托管 |
| 底图 | **MapLibre GL JS 4** | 使用免费 `demotiles` 底图，自带英文地形标签已隐藏 |
| 叠加层 | **deck.gl 9** | `@deck.gl/mapbox` 的 `MapboxOverlay` + `GeoJsonLayer` / `ScatterplotLayer` / `TextLayer` |
| 地形 | **MapLibre `hillshade`** | Amazon Terrarium DEM 瓦片（`elevation-tiles-prod`），无需 API Key |
| 语言 | 原生 **JavaScript (ESM)** | 无框架，轻量 |
| 数据 | CShapes 2.1、historical-basemaps、CHGIS、Natural Earth、DataV | 混合许可，见 [第七节](#七许可license) |

**架构要点**
- 四类数据**并行加载**（CShapes 26MB 不再阻塞河流 / 山脉 / 湖泊），单项失败不影响其它。
- **1886 年前的年代快照运行时按需拉取**：不打包进仓库（否则体积再增 30–50MB），首次访问某年代时从 jsDelivr 拉取并缓存，同时预取相邻年代。
- deck.gl 覆盖层绘制在 MapLibre 样式之上，故「地形晕渲」开启时通过降低疆域填充 alpha 让山体阴影透出，而非图层排序。
- 时间轴与图层面板**先行创建**，任何情况下控件可用。
- 文字标签用 deck.gl `TextLayer` 的 SDF 字体图集（128px）渲染中文；依赖外部状态（中英开关）的属性均加 `updateTriggers` 强制重算。
- 国名标签按国名**去重**（同一国家同年多块领土只标一次），河名按河名去重（同一条河多段只标最长段中点）。

---

## 三、安装与使用

### 环境要求
- Node.js 18+（仓库根目录含 `.nvmrc`，推荐 22）
- npm

### 步骤

```bash
# 1. 克隆仓库（地理数据已随仓库提供，无需额外下载）
git clone https://github.com/Geekee510/MapTimeMachine.git
cd MapTimeMachine

# 2. 安装依赖
npm install

# 3.（可选）重新生成 Natural Earth 数据（河流 / 山脉 / 湖泊，来自公共领域）
#    CShapes 2.1 历史疆域数据已随仓库提供，无需此步
npm run fetch-data

# 3b.（可选）重新生成中国历代疆域数据（朝代疆域，依据 DataV 省界拼接）
#    依赖 public/data/china_provinces.geojson（DataV 省界，已随仓库）
npm run gen-china

# 3c.（可选）重新生成中国历代政区界（CHGIS 州/郡/府/路，逐年过滤）
#    源数据已随仓库存于 public/data/china_hist/
npm run gen-china-regions

# 3d.（可选）重新生成中国王朝轮廓（汉/唐/宋/元/明/清/现代）
#    从 historical-basemaps CDN 拉取，需网络
npm run gen-china-outline

# 4. 本地开发（默认 http://localhost:5173）
npm run dev

# 5. 构建（产物在 dist/，纯静态文件）
npm run build

# 6. 预览构建产物
npm run preview
```

> 浏览器打开后建议按 **Ctrl+F5** 强刷，避免旧缓存。

---

## 四、数据说明（重要）

为便于一键部署与「克隆即运行」，`main` 分支已将 `public/data/` 下的所有 `.geojson` 数据**随仓库提交**（含 CShapes 2.1 历史疆域 26MB）；**开发分支 `dev/data-upgrade` 为精简体积不再包含 CShapes（约 26MB），详见下方「开发分支数据说明」**。如本地数据损坏，仍可用 `npm run fetch-data` 重新生成 Natural Earth 三类数据（CShapes 需另行从 cshapes.org 获取或已在 main 分支中）。

| 文件 | 来源 | 许可 | 获取方式 |
| --- | --- | --- | --- |
| `ne_rivers.geojson` | Natural Earth 50m 河流中心线 | Public Domain | 随仓库 / `npm run fetch-data` |
| `ne_mountains.geojson` | Natural Earth 10m 山脉 / 高原（取质心成点） | Public Domain | 随仓库 / `npm run fetch-data` |
| `ne_lakes.geojson` | Natural Earth 50m 湖泊 | Public Domain | 随仓库 / `npm run fetch-data` |
| `cshapes-2.1.geojson` | CShapes 2.1 历史疆域 | **CC BY-NC-SA 4.0（非商业）** | 随仓库提供 |
| `china_provinces.geojson` | 阿里云 DataV.GeoAtlas 省级行政区划边界 | DataV 使用条款（学习 / 公益，禁商用转售） | 随仓库 / `npm run gen-china` 前置 |
| `china_dynasties.geojson` | 夏—清—民国—共和国疆域：秦以后按省界拼接，先秦为手绘示意、战国为七雄政权分立 | 同上（**示意性近似**疆域，先秦极粗略） | `npm run gen-china` 生成 |
| `china_hist/*.json`（21 个） | **CHGIS** 中国历代政区（州 / 郡 / 府 / 路），含 `beg_yr` / `end_yr` | 见 [第七节](#七许可license) | 随仓库（`public/data/china_hist/`） |
| `china_regions.geojson` | 由上者生成：2165 个政区单元，按 `beg`–`end` 逐年过滤（只描边不填充） | 同上 | `npm run gen-china-regions` |
| `china_outline.geojson` | 汉 / 唐 / 宋 / 元 / 明 / 清 / 现代**真实王朝轮廓**（含西域、外蒙古），15 个要素 | **CC BY-SA 4.0** | `npm run gen-china-outline`（CDN 拉取） |
| `world_YYYY.geojson`（前3000–1886） | historical-basemaps 年代快照 | **CC BY-SA 4.0** | **运行时按需从 jsDelivr 拉取**，不随仓库 |

### 开发分支（dev/data-upgrade）数据说明

> ⚠️ 本开发分支为**精简开发分支**，为减小仓库体积（约 26MB），**不包含** `public/data/cshapes-2.1.geojson` 历史疆域数据文件。
> 世界地图模式（1886–2023）依赖该文件；如需在本地运行世界模式，请先手动补回：
> 1. 从 `main` 分支或 `v1.0.0` 发布标签中复制 `cshapes-2.1.geojson` 到 `public/data/`；**或**
> 2. 从 CShapes 官方项目（<https://cshapes.org>，数据集 Weidmann et al. 2010，CC BY-NC-SA 4.0）获取 CShapes 2.1，放置为 `public/data/cshapes-2.1.geojson`。
>
> 中国历代疆域模式与河流 / 山脉 / 湖泊等自然地理图层**不受影响**，无需该文件。`main` 分支与发布版本均已内置 CShapes 数据，可直接克隆运行与部署。
| 国旗 SVG（271 个） | flag-icons | MIT | 随仓库 `public/flags/` |
| 地形晕渲瓦片 | Amazon Terrain Tiles（Terrarium 编码） | 见 [AWS 条款](https://registry.opendata.aws/terrain-tiles/) | **运行时在线请求**，无需 Key |

`scripts/fetch-data.mjs` 会从 GitHub raw（jsDelivr 兜底）拉取 Natural Earth 数据并做字段裁剪。
中国历代疆域采用**三层混合**方案，优先级依次为：真实王朝轮廓 → 省界拼接 → 手绘示意（仅先秦）。

1. `china_outline.geojson`（historical-basemaps，含西域/外蒙古，最准）
2. `china_dynasties.geojson`（DataV 省界按朝代关键词拼接，坐标降精度到 2 位小数）
3. `china.js` 内联 `bounds` / `states`（夏 / 商 / 西周 / 春秋 / 战国，极粗略）

> ⚠️ **CHGIS 政区数据的覆盖范围限制**：经度仅约 **91–122°**，不含新疆西部、西藏、青海西部与外蒙古（CHGIS 只收录「本部」正式政区）。因此政区界**只作叠加描边**，疆域轮廓仍由上层数据决定，不可互换。

中国省级边界数据来源：阿里云 DataV.GeoAtlas。

---

## 五、目录结构

```
MapTimeMachine/
├── index.html              # 页面骨架：地图容器、图层面板、时间轴、信息卡
├── vite.config.js          # Vite 配置（base './'，适配 GitHub Pages 子路径）
├── package.json
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages 自动部署工作流
├── scripts/
│   ├── fetch-data.mjs         # 拉取 Natural Earth 河流/山脉/湖泊
│   ├── gen-china.mjs          # 生成朝代疆域（省界拼接 / 手绘示意 / 政权分立）
│   ├── gen-china-regions.mjs  # 生成历代政区界（CHGIS，按 beg–end 逐年过滤）
│   ├── gen-china-outline.mjs  # 生成真实王朝轮廓（historical-basemaps）
│   ├── gen-country-zh.mjs     # 生成国家中文译名表
│   ├── check-china.mjs        # 校验朝代省份匹配
│   └── check-flags.mjs        # 校验国旗覆盖率
├── src/
│   ├── main.js             # 主逻辑：地图、图层、中英切换、缩放联动、地形晕渲
│   ├── style.css           # 样式
│   ├── data/
│   │   ├── loaders.js      # CShapes 加载（含超时 / 重试）
│   │   ├── i18n.js         # 中英文译名表（国名 / 河名 / 山脉名 / 历史政权名）
│   │   ├── china.js        # 朝代定义（起止 / 都城 / 简介 / 大事 / 省份 / 政权）
│   │   ├── events.js       # 国家重大事件库
│   │   ├── worldEvents.js  # 世界大事库（按年份）
│   │   └── country-zh.json # 国家中文译名（全量 252）
│   └── ui/
│       ├── panel.js        # 右侧图层开关 + 信息卡（国家 / 朝代 / 政区）
│       └── timeline.js     # 时间轴控件（滑块 / 播放 / 步进 / 步长）
├── public/
│   ├── data/               # 数据目录（含 CShapes 26MB、china_hist/ 等）
│   └── flags/              # 国旗 SVG（flag-icons，271 个）
├── KNOWN-ISSUES.md         # 已知不足与改进方向
├── THIRD-PARTY-NOTICES.md  # 第三方数据许可清单
└── 世界地理历史动态网站_需求与可行性分析报告.md  # 原始需求与可行性分析
```

---

## 六、部署

### 方案 A：GitHub Pages 自动部署（推荐，免费）
本仓库已配置 GitHub Actions（`.github/workflows/deploy.yml`）：推送 `main` 分支即自动构建并发布到 GitHub Pages，任何人可通过 `https://<用户名>.github.io/MapTimeMachine/` 访问。

**首次启用步骤：**
1. 进入仓库 **Settings → Pages**；
2. **Build and deployment → Source** 选择 **GitHub Actions**；
3. 此后每次 push 到 `main` 会自动部署（仓库 **Actions** 标签页可看进度）。

### 方案 B：自建静态托管
- `npm run build` 产出 `dist/`，是**纯静态文件**，`base: './'` 可直接托管到任意子目录或 Linux 静态服务器（Nginx / Caddy / 对象存储等）。
- 正式部署建议将 CShapes 改为 **PMTiles 矢量瓦片**，按需加载、节省 90%+ 流量；详见仓库内《需求与可行性分析报告》。
- 当前 MVP 使用全精度 CShapes（26MB），适合本机 / 小范围验证。

---

## 七、许可（License）

本项目采用**代码与数据分离授权**（参照 [orbis-chronos](https://github.com/void-space912/orbis-chronos) 的做法）：代码宽松授权，数据沿用各自原始许可。

### 代码

**MIT License** —— 见仓库根目录 `LICENSE`。可自由使用、修改、分发（含商业用途）。

### 数据（沿用各自原始许可）

| 数据 | 许可 | 商用 | 署名要求 |
| --- | --- | --- | --- |
| Natural Earth（河流 / 山脉 / 湖泊） | **Public Domain** | ✅ | 无 |
| flag-icons（国旗 SVG） | **MIT**，© Lipis | ✅ | 建议保留 |
| Amazon Terrain Tiles（地形晕渲） | 见 [AWS Open Data 条款](https://registry.opendata.aws/terrain-tiles/) | 视条款 | 建议署名 |
| 阿里云 DataV.GeoAtlas（省级边界） | DataV 使用条款 | ❌ 禁商用转售 | 署名 |
| **CShapes 2.1**（1886–2023 疆域） | **CC BY-NC-SA 4.0** | ❌ 非商业 | **必须** |
| **historical-basemaps**（前3000–1886 疆域、王朝轮廓） | **CC BY-SA 4.0** | ✅ 允许 | **必须** |
| **CHGIS**（中国历代政区） | 见 [CHGIS 使用条款](https://chgis.fudan.edu.cn/) | 需确认 | **必须** |

> ⚠️ **CC BY-SA 4.0 具有传染性**：若你在 CShapes / historical-basemaps 数据基础上再创作并以某种形式分发，衍生数据需以**相同方式（CC BY-SA 4.0）**共享，并保留署名。**仅本项目代码（MIT）不受此约束。**
> 本项目为公益学术用途，不用于商业盈利。若需商用，请自行向数据提供方获取授权。

### 署名（Attribution）

```
历史疆域数据：
  · CShapes 2.1 — Weidmann, Nils B., Doreen Kuse, and Kristian Skrede Gleditsch (2010).
    "The Geography of the International System: The CShapes Dataset." International Interactions 36(1).
    https://cshapes.org  |  CC BY-NC-SA 4.0
  · historical-basemaps — Aurélien Aourednik (2023).
    "Historical Basemaps: 3000BC–AD2010." https://github.com/aourednik/historical-basemaps  |  CC BY-SA 4.0

中国历史政区数据：
  · CHGIS — China Historical Geographic Information System,
    Harvard Yenching Institute / Fudan University Center for Historical Geography.
    https://chgis.fudan.edu.cn  |  经 china-history-map 项目整理分发

自然地理数据：
  · Natural Earth — https://www.naturalearthdata.com/  |  Public Domain
  · Amazon Terrain Tiles — https://registry.opendata.aws/terrain-tiles/

其他：
  · flag-icons — © Lipis, https://github.com/lipis/flag-icons  |  MIT
  · 阿里云 DataV.GeoAtlas — https://geo.datav.aliyun.com
```

完整的第三方许可清单见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。

---

## 八、已知不足

详见 [KNOWN-ISSUES.md](./KNOWN-ISSUES.md)。当前主要短板：

- 首屏加载慢：CShapes 26MB 全量加载（规划 PMTiles 矢量瓦片化）
- 三国、五代十国仍为「并立政权画成单块」的历史遗留问题（南北朝已修）
- 先秦疆域（夏 / 商 / 西周 / 春秋）仍为手绘示意，非精确边界
- 世界大事库无地理坐标，暂不能在地图上打点
- CHGIS 政区仅覆盖「本部」（经度 91–122°），边疆地区无政区界

## 九、后续规划（Roadmap）

- 修三国 / 五代十国的并立政权拆分（魏蜀吴、五代 + 十国）
- PMTiles 矢量瓦片化与 Linux 生产部署，解决首屏 26MB
- 世界大事库接入地理坐标（可参考 orbis-chronos 的 94 条带坐标事件），支持地图打点
- 先秦疆域接入 CHGIS V6 / 谭其骧《中国历史地图集》矢量化数据
- 山脉范围多边形（OSM Overpass `natural=mountain_range`，当前因反复超时暂缓）
- 首都中文译名库、战争 / 民族 / 探索等更多时空维度
- 开放数据接口，便于他人在此基础上细化

欢迎 Issue / PR 共建。
