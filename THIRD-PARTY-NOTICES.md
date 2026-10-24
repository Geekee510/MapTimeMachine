# 第三方许可声明（THIRD-PARTY NOTICES）

本项目为公益学术用途，聚合了多个公开数据集。**代码为 MIT，数据沿用各自原始许可。**

---

## 一、总览

| # | 组件 / 数据 | 用途 | 许可 | 商用 | 随仓库 |
| --- | --- | --- | --- | --- | --- |
| 1 | CShapes 2.1 | 1886–2023 世界历史疆域 | CC BY-NC-SA 4.0 | ❌ | ✅ 26MB |
| 2 | historical-basemaps | 前3000–1886 世界疆域 + 中国王朝轮廓 | CC BY-SA 4.0 | ✅ | 部分（轮廓✅ / 快照运行时拉取） |
| 3 | CHGIS | 中国历代政区（州/郡/府/路） | 学术使用条款 | 需确认 | ✅ 2.1MB |
| 4 | Natural Earth | 河流 / 山脉 / 湖泊 | Public Domain | ✅ | ✅ |
| 5 | 阿里云 DataV.GeoAtlas | 中国省级边界 | DataV 使用条款 | ❌ | ✅ |
| 6 | Amazon Terrain Tiles | 地形晕渲（山脉形势） | AWS Open Data 条款 | 视条款 | ❌ 在线瓦片 |
| 7 | flag-icons | 国旗 SVG | MIT | ✅ | ✅ 271 个 |
| 8 | MapLibre GL JS | 底图渲染 | BSD-3-Clause | ✅ | npm |
| 9 | deck.gl | 叠加层渲染 | MIT | ✅ | npm |
| 10 | Vite | 构建工具 | MIT | ✅ | npm |

---

## 二、逐项声明

### 1. CShapes 2.1 — CC BY-NC-SA 4.0

```
The Geography of the International System: The CShapes Dataset
Weidmann, Nils B., Doreen Kuse, and Kristian Skrede Gleditsch (2010)
International Interactions, 36(1), 86-106.

Source:  https://cshapes.org
License: CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)
```

- **使用方式**：`public/data/cshapes-2.1.geojson`（26MB，随仓库提供）
- **约束**：非商业用途；必须署名；衍生作品须以相同方式共享
- **用途**：世界模式 1886–2023 的疆域多边形、政体状态（`status`）、宗主国（`ruledby`）

### 2. historical-basemaps — CC BY-SA 4.0

```
Historical Basemaps: 3000BC–AD2010
Aurélien Aourednik

Source:  https://github.com/aourednik/historical-basemaps
License: CC BY-SA 4.0 (Attribution-ShareAlike)
```

- **使用方式**：
  - 中国王朝轮廓（`geojson/world_*.geojson` 中 `Han/Tang/Song/Great Khanate/Ming/Manchu/Qing/China` 等要素）→ 构建期下载，产物 `public/data/china_outline.geojson`（144KB，随仓库）
  - 前3000–1886 年代快照 → **运行时从 jsDelivr 按需拉取 + 缓存 + 相邻年代预取**，不随仓库
- **约束**：必须署名；衍生数据须以相同方式共享（**允许商业用途**，与 CShapes 的 NC 条款不同）
- **字段**：`NAME / ABBREVN / SUBJECTO（宗主国）/ BORDERPRECISION / PARTOF`

### 3. CHGIS（中国历史地理信息系统）— 学术使用条款

```
China Historical Geographic Information System
Harvard Yenching Institute / 复旦大学历史地理研究中心

Source:  https://chgis.fudan.edu.cn
```

- **使用方式**：经 [pessimistcamellia/china-history-map](https://github.com/pessimistcamellia/china-history-map) 项目整理分发，本仓库取用其 `v2/data/geo/*.json`（21 个朝代文件），存于 `public/data/china_hist/`；由 `scripts/gen-china-regions.mjs` 生成 `public/data/china_regions.geojson`
- **约束**：学术/教育用途；商业使用需向 CHGIS 官方确认；必须署名
- **重要限制**：经度覆盖约 **91–122°**，不含新疆西部、西藏、青海西部与外蒙古，故**仅作政区界叠加描边**，不可替代疆域轮廓

### 4. Natural Earth — Public Domain

```
Natural Earth — Free vector and raster map data
Source:  https://www.naturalearthdata.com/
License: Public Domain（公共领域，无使用限制）
```

- 50m 河流中心线、10m 山脉/高原、50m 湖泊

### 5. 阿里云 DataV.GeoAtlas — DataV 使用条款

```
阿里云 DataV.GeoAtlas 行政区划边界数据
Source:  https://geo.datav.aliyun.com
```

- **使用方式**：`public/data/china_provinces.geojson`（省级边界）；`scripts/gen-china.mjs` 据此按朝代关键词拼接疆域
- **约束**：仅用于学习 / 公益展示，**禁止商业用途或转售**

### 6. Amazon Terrain Tiles（Terrarium 编码 DEM）

```
Terrain Tiles — AWS Open Data Registry
Source:  https://registry.opendata.aws/terrain-tiles/
Endpoint: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

- **使用方式**：运行时在线请求，MapLibre `hillshade` 图层渲染地形晕渲（山脉形势）
- **注意**：依赖 AWS 公共数据集的持续可用性，生产部署建议自建瓦片或改用付费服务

### 7. flag-icons — MIT

```
flag-icons — Copyright (c) Panayiotis Lipiridis (Lipis)
Source:  https://github.com/lipis/flag-icons
License: MIT
```

- `public/flags/` 下 271 个 4×3 SVG
- **注**：`dd.svg`（东德）、`yu.svg`（南斯拉夫）为本项目手绘，非 flag-icons 原始内容，同样以 MIT 提供

### 8–10. 软件依赖

| 依赖 | 许可 |
| --- | --- |
| MapLibre GL JS | BSD-3-Clause |
| deck.gl | MIT |
| Vite | MIT |

---

## 三、合规要点

1. **代码 / 数据分离**：本仓库代码为 MIT，可自由使用；数据沿用各自许可，**不得因代码授权而推定数据授权**。
2. **CC BY-SA 4.0 传染性**：在 CShapes（NC-SA）或 historical-basemaps（SA）数据基础上再创作并分发时，衍生数据须以相同方式共享并保留署名。
3. **非商业约束**：CShapes（NC）与 DataV 明确禁止商业用途；historical-basemaps 的 SA 版本允许商业使用。
4. **本项目声明**：公益学术先期验证，不用于商业盈利。

如需商业使用，请自行与 CShapes、CHGIS、DataV 三方分别获取授权。
