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
- Node.js 18+（仓库根目录含 `.nvmrc`）
- npm

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Geekee510/maptimemachine.git
cd maptimemachine

# 2. 安装依赖
npm install

# 3. 拉取自然地理数据（河流 / 山脉 / 湖泊，来自 Natural Earth 公共领域，需联网）
npm run fetch-data

# 4. 手动放置历史疆域数据
#    从 https://cshapes.org 下载 cshapes-2.1.geojson（约 26MB，CC BY-NC-SA 4.0）
#    放到 public/data/cshapes-2.1.geojson

# 5. 本地开发（默认 http://localhost:5173）
npm run dev

# 6. 构建（产物在 dist/，可托管到任意静态服务器 / Linux）
npm run build

# 7. 预览构建产物
npm run preview
```

> 浏览器打开后建议按 **Ctrl+F5** 强刷，避免旧缓存。

---

## 四、数据说明（重要）

`public/data/` 下的 `.geojson` **不入库**（已在 `.gitignore` 排除），原因有二：保持仓库精简、并尊重 CShapes 的 CC BY-NC-SA 许可（我们仅链接来源，不重新分发其 26MB 原文件）。

| 文件 | 来源 | 许可 | 获取方式 |
| --- | --- | --- | --- |
| `ne_rivers.geojson` | Natural Earth 50m 河流中心线 | Public Domain | `npm run fetch-data` |
| `ne_mountains.geojson` | Natural Earth 10m 山脉 / 高原（取质心成点） | Public Domain | `npm run fetch-data` |
| `ne_lakes.geojson` | Natural Earth 50m 湖泊 | Public Domain | `npm run fetch-data` |
| `cshapes-2.1.geojson` | CShapes 2.1 历史疆域 | **CC BY-NC-SA 4.0（非商业）** | 自行从 cshapes.org 下载后放入 |

`scripts/fetch-data.mjs` 会从 GitHub raw（jsDelivr 兜底）拉取 Natural Earth 数据并做字段裁剪，离线环境可手动下载对应文件放入 `public/data/`。

---

## 五、目录结构

```
maptimemachine/
├── index.html              # 页面骨架：地图容器、图层面板、时间轴、信息卡
├── vite.config.js          # Vite 配置（base './'）
├── package.json
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
│   └── data/               # 数据目录（.geojson 不入库，需按第四节获取）
└── 世界地理历史动态网站_需求与可行性分析报告.md  # 原始需求与可行性分析
```

---

## 六、部署

- `npm run build` 产出 `dist/`，是**纯静态文件**，`base: './'` 可直接托管到任意子目录或 Linux 静态服务器（Nginx / Caddy / 对象存储等）。
- 正式部署建议将 CShapes 改为 **PMTiles 矢量瓦片**，按需加载、节省 90%+ 流量；详见仓库内《需求与可行性分析报告》。
- 当前 MVP 使用全精度 CShapes（26MB），适合本机 / 小范围验证。

---

## 七、许可（License）

- **代码**：MIT License —— 见仓库根目录 `LICENSE`。
- **数据**：
  - CShapes 2.1：CC BY-NC-SA 4.0（**非商业用途**，需署名与相同方式共享）。
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
