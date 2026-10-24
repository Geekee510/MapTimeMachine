# 已知不足与改进路线（dev/data-upgrade 分支）

> 记录时间：2026-10-24 · 基线提交：`d6d7b17`（main 已推送）
> 本文件随改造推进更新；每项完成后划掉并注明落地提交。

## 一、数据层短板（本次改造目标）

> **进度（2026-10-24）**：第 1、2、3 项已在本分支完成，见下方各节"已完成"标注。

### 1. 世界地图只覆盖 1886 年之后
- **现状**：疆域数据只有 CShapes 2.1（`gwsyear`–`gweyear`），时间范围 **1886–2023**。
  时间轴 `YEAR_MIN = 1886`，1886 年之前的任何年份地图上都是空白。
- **影响**：名为"编年历史地图"却看不到古代/中世纪/近代早期的世界，是最大缺口。
- **改进**：接入 [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)（CC BY-SA 4.0）
  54 个年代快照，覆盖 **前 10000 年 – 2010 年**；字段 `NAME / SUBJECTO / BORDERPRECISION / PARTOF`。
  1886 年之前走该数据，1886 年之后仍走 CShapes（CShapes 有精确的政体状态与宗主国 `ruledby`）。
- **✅ 已完成**：时间轴下限扩至前 3000 年；1886 年前按年代快照**按需从 jsDelivr 拉取**
  （不打包，避免仓库膨胀）+ 内存缓存 + 相邻年代预取；补 60 条历史政权中文译名
  （`src/data/i18n.js` 的 `HB_ZH`）；属地用 `SUBJECTO` 显示宗主国；跨年代时介绍卡同步。

### 2. 中国朝代疆域是"手绘示意"，精度不足
- **现状**：`src/data/china.js` 中秦以后各朝代用**现代省级边界拼接**（DataV 省界按省份关键词选取），
  先秦（夏/商/西周/春秋）与南北朝/战国用**手绘简化 `bounds` 多边形**。
- **影响**：疆域形状明显不准，已被多次质疑：
  - 南北朝原本被画成一块统一疆域（实为南朝/北朝并立）；
  - 南宋曾包含云南（大理国）、贵州（羁縻）、宁夏（西夏）；
  - 唐以后西部（青藏/新疆）曾出现空白块；
  - 青海/宁夏/海南长期不在版图内。
- **改进**：改用现成真实几何
  - [pessimistcamellia/china-history-map](https://github.com/pessimistcamellia/china-history-map)
    的 `v2/data/geo/*.json`（西汉/东汉/晋/辽/五代/明/元/清…）与 `v2/data/eras/china.json` 朝代表；
  - historical-basemaps 的 **Tang Empire(800/900)、Song Empire(1000–1200)、Ming Empire(1492)、
    Manchu/Qing Empire(1650–1900)** 多边形作为交叉校验与补充。
- **✅ 已完成（双层方案）**：
  1. **疆域轮廓层** `china_outline.geojson`（15 个要素）：汉 / 唐 / 宋 / 元 / 明 / 清 / 现代
     改用 historical-basemaps 的王朝多边形（按历史疆域绘制，含西域），优先于省界拼接；
     秦、三国、两晋、南北朝、隋、五代、南宋、民国无对应政权，仍回落省界拼接。
  2. **政区界层** `china_regions.geojson`（2165 个要素）：CHGIS 州/郡/府/路，
     按 `beg`/`end` 逐年过滤、只描边不填充 —— 即《中国历史地图集》式"疆域 + 内部政区界"。
  3. 时间轴扩至 **2023**（新增中华民国 1912–1949、中华人民共和国 1949– ）。
  4. 新增"历代政区界"图层开关与政区详情卡（`panel.showChinaRegion`）。
- **⚠ 已确认的数据限制**：CHGIS 政区经度约 91–122°，只覆盖"本部"，
  **不含新疆西部、西藏、青海大部与外蒙古** —— 所以政区界只能作"内部细节"，
  不能单独当疆域轮廓使用。

### 3. 没有山脉形势图
- **现状**：山脉层只是 Natural Earth `geography_regions_polys` 中 `Range/mtn` 类
  **取质心后画的点**（`ne_mountains.geojson`），共 219 个小山丘。
- **影响**：喜马拉雅、安第斯、阿尔卑斯、落基、天山、昆仑等**主山系全都没有**，
  只有 Wasatch、Lebombo 一类次要山名；谈不上"形势"。
- **✅ 已完成（改用 DEM 晕渲方案）**：新增"**地形晕渲（山脉形势）**"图层开关，
  用 Amazon Terrain Tiles 的 **terrarium 编码 DEM** + MapLibre `hillshade` 图层，
  喜马拉雅、安第斯、阿尔卑斯、天山、昆仑等山脉起伏可真实呈现（默认关闭，勾选开启）。
  开启时疆域填充自动降为半透明（alpha 150），使山体阴影透出。
- **❌ 矢量山体面方案已放弃**：OSM Overpass 拉取 `natural=mountain_range` **反复超时**
  （东亚大 bbox 4 分钟、阿尔卑斯小 bbox 2.5 分钟、仅 way 查询 1.7 分钟均失败）；
  `overpass.osm.ch` 是瑞士区域实例（东亚返回空）；overpass-api.de TLS 握手失败、
  overpass.osm.jp 证书过期。若日后需要矢量山体面，建议改用 GeoFabrik 洲级 PBF +
  osmium 本地提取（不走 Overpass）。
- 待办：山系名称标签仍只有 Natural Earth 的 219 个小山丘点，主山系（喜马拉雅等）无名称标注。

## 二、其他已知问题

- **首屏加载慢**：CShapes 26MB 未精简（可用 mapshaper 降精度/抽稀，或改 PMTiles / 分块加载）。
- **世界大事无坐标**：`src/data/worldEvents.js` 是按年份的文字条目，没有经纬度，
  无法在地图上打点。可参考 orbis-chronos 的 `data/events.json`（94 条，含 `lat/lng/分类/中英名`）。
- **省界粒度的固有近似**：并立政权（三国 / 五代十国）按现代省界划分，跨界的省
  （如江苏、安徽跨淮河南北）无法在省界粒度下拆分，只能整体归入一方；
  边界附近存在整省近似误差。精确化需 CHGIS 府/县级几何。
- **历史地名译名**：接入新数据集后，政权名（Han Empire / Great Khanate / Manchu Empire 等）
  需要补充中文译名表（`src/data/country-zh.json` 目前按 CShapes 国名归一化）。

## 三、改造顺序（本次分支）

1. ✅ 推送 `d6d7b17` 到 main，建立 `dev/data-upgrade` 分支，记录本清单
2. ✅ 替换手绘中国疆域为真实几何（`415b112`）
3. ✅ 补世界 1886 年前的疆域空白（`b15b32a`）
4. ✅ 山脉形势图：改用 DEM 地形晕渲（矢量 Overpass 方案已放弃，原因见上）
5. ✅ 许可合规：README「第七节」改为代码/数据分离授权 + `THIRD-PARTY-NOTICES.md` 完整清单
6. ✅ 修并立政权单块化：三国（魏/蜀汉/孙吴）、五代十国（五代 + 五大十国块）拆分 + 政权分色

## 四、新增数据与许可

| 文件 | 来源 | 许可 |
|---|---|---|
| `public/data/china_hist/*.json`（21 个） | pessimistcamellia/china-history-map（CHGIS 政区） | 待上游确认，使用前需补声明 |
| `public/data/china_regions.geojson`（2165 要素，2.0MB） | 由上者生成 | 同上 |
| `public/data/china_outline.geojson`（15 要素，140KB） | aourednik/historical-basemaps | **CC BY-SA 4.0**（需署名 + 相同方式共享） |
| 1886 年前世界疆域 | 同上，**运行时从 jsDelivr 按需拉取**，未打包 | **CC BY-SA 4.0** |
| 地形晕渲瓦片 | Amazon Terrain Tiles（Mapzen） | 需在地图 attribution 注明（已加） |

**⚠ 待办**：CC BY-SA 4.0 与本项目 MIT 的混合需在 README 明确声明
（代码 MIT / 数据分区声明 + 署名段 + THIRD-PARTY.md，参照 orbis-chronos 做法）。
