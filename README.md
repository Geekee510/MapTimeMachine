# MapTimeMachine · 世界地理历史动态地图

一个**公益学术、公开数据、2D 平面**的世界地理历史动态可视化项目（MVP / 先期验证版）。
在同一张地图上叠加**历史疆域变迁**、**河流 / 山脉 / 湖泊**自然地理要素，配一条 **1886–2023 年的时间轴**，可拖动、可播放、可步进，并支持中英文标签切换。

> 定位：公益学术 + 开放数据起步；2D 平面；先期验证。后续可扩展中国专题（CHGIS）、PMTiles 矢量瓦片部署、地形渲染等。

---

## 一、项目简介（内容）

- **历史疆域图层**：基于 [CShapes 2.1](https://cshapes.org)（1886–2023 全球历史国界），按年份实时过滤显示各国/政权疆域，颜色区分独立国、殖民地、保护国、托管地、被占领土。
- **自然地理图层**：
  - 河流（Natural Earth 50m 主要河流，含黄河 / 长江 / 两河 / 多瑙河 / 莱茵河等，含中文河名标签）
  - 山脉（Natural Earth 山脉 / 高原范围质心点 + 中文名称标签）
  - 湖泊（Natural Earth 50m 主要湖泊面）
- **时间轴**：滑块（1886–2023）+ 播放 / 暂停 + 步进（◀/▶）+ 速度 / 步长下拉（1 / 2 / 5 / 10 年）。播放速度与步进粒度共用同一下拉框，二者同步。
- **中英文标签**：右侧面板「中文标签」开关，一键切换国名 / 河名 / 山脉名的显示语言。
- **图层开关**：历史疆域、主要河流、山脉、湖泊、底图陆地（含小岛）可分别显隐。
- **交互**：缩放 / 平移地图；点击疆域或山脉点弹出信息卡（存续时间、类型、首都、面积等）。

---

## 二、技术栈

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 构建 | **Vite 5** | 纯静态站点，`base: './'` 便于子目录 / Linux 静态托管 |
| 底图 | **MapLibre GL JS 4** | 使用免费 `demotiles` 底图，自带英文地形标签已隐藏 |
| 叠加层 | **deck.gl 9** | `@deck.gl/mapbox` 的 `MapboxOverlay` + `GeoJsonLayer` / `ScatterplotLayer` / `TextLayer` |
| 语言 | 原生 **JavaScript (ESM)** | 无框架，轻量 |
| 数据 | CShapes 2.1、Natural Earth | 均为公开 / 公共领域数据 |

**架构要点**
- 四类数据**并行加载**（CShapes 26MB 不再阻塞河流 / 山脉 / 湖泊），单项失败不影响其它。
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

为便于一键部署与「克隆即运行」，本仓库已将 `public/data/` 下的所有 `.geojson` 数据**随仓库提交**（含 CShapes 2.1 历史疆域 26MB）。如本地数据损坏，仍可用 `npm run fetch-data` 重新生成 Natural Earth 三类数据（CShapes 需另行从 cshapes.org 获取或已在仓库中）。

| 文件 | 来源 | 许可 | 获取方式 |
| --- | --- | --- | --- |
| `ne_rivers.geojson` | Natural Earth 50m 河流中心线 | Public Domain | 随仓库 / `npm run fetch-data` |
| `ne_mountains.geojson` | Natural Earth 10m 山脉 / 高原（取质心成点） | Public Domain | 随仓库 / `npm run fetch-data` |
| `ne_lakes.geojson` | Natural Earth 50m 湖泊 | Public Domain | 随仓库 / `npm run fetch-data` |
| `cshapes-2.1.geojson` | CShapes 2.1 历史疆域 | **CC BY-NC-SA 4.0（非商业）** | 随仓库提供 |

`scripts/fetch-data.mjs` 会从 GitHub raw（jsDelivr 兜底）拉取 Natural Earth 数据并做字段裁剪。

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
│   └── fetch-data.mjs      # 一键拉取 Natural Earth 河流/山脉/湖泊
├── src/
│   ├── main.js             # 主逻辑：地图、图层、中英切换、缩放联动
│   ├── style.css           # 样式
│   ├── data/
│   │   ├── loaders.js      # CShapes 加载（含超时 / 重试）
│   │   ├── i18n.js         # 中英文译名表（国名 / 河名 / 山脉名）
│   │   └── country-zh.json # 国家中文译名（全量 252）
│   └── ui/
│       ├── panel.js        # 右侧图层开关 + 信息卡
│       └── timeline.js     # 时间轴控件（滑块 / 播放 / 步进 / 步长）
├── public/
│   └── data/               # 数据目录（.geojson 已随仓库提供，含 CShapes 26MB）
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

- **代码**：MIT License —— 见仓库根目录 `LICENSE`。
- **数据**：
  - CShapes 2.1：CC BY-NC-SA 4.0（**非商业用途**，需署名与相同方式共享，来源 cshapes.org）。本仓库随附该数据仅用于公益学术展示与本地研究；若用于商业用途，请自行从 cshapes.org 获取授权。
  - Natural Earth：Public Domain（公共领域，可自由使用）。

请在使用时遵守对应数据的许可条款；本项目为公益学术先期验证，不用于商业盈利。

---

## 八、后续规划（Roadmap）

- 中国专题分支（CHGIS：秦—清 疆域变迁、先秦 / 春秋战国 / 近现代 / 红军历史等）
- PMTiles 矢量瓦片化与 Linux 生产部署
- 山脉范围多边形 / 地形渲染（DEM）替代当前质心点
- 首都中文译名库、战争 / 民族 / 探索等更多时空维度
- 开放数据接口，便于他人在此基础上细化

欢迎 Issue / PR 共建。
