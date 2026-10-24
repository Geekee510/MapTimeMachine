# 已知不足与改进路线（dev/data-upgrade 分支）

> 记录时间：2026-10-24 · 基线提交：`d6d7b17`（main 已推送）
> 本文件随改造推进更新；每项完成后划掉并注明落地提交。

## 一、数据层短板（本次改造目标）

### 1. 世界地图只覆盖 1886 年之后
- **现状**：疆域数据只有 CShapes 2.1（`gwsyear`–`gweyear`），时间范围 **1886–2023**。
  时间轴 `YEAR_MIN = 1886`，1886 年之前的任何年份地图上都是空白。
- **影响**：名为"编年历史地图"却看不到古代/中世纪/近代早期的世界，是最大缺口。
- **改进**：接入 [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)（CC BY-SA 4.0）
  54 个年代快照，覆盖 **前 10000 年 – 2010 年**；字段 `NAME / SUBJECTO / BORDERPRECISION / PARTOF`。
  1886 年之前走该数据，1886 年之后仍走 CShapes（CShapes 有精确的政体状态与宗主国 `ruledby`）。

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

### 3. 没有山脉形势图
- **现状**：山脉层只是 Natural Earth `geography_regions_polys` 中 `Range/mtn` 类
  **取质心后画的点**（`ne_mountains.geojson`），共 219 个小山丘。
- **影响**：喜马拉雅、安第斯、阿尔卑斯、落基、天山、昆仑等**主山系全都没有**，
  只有 Wasatch、Lebombo 一类次要山名；谈不上"形势"。
- **改进**：从 OSM Overpass 拉取 `natural=mountain_range` 的 relation/way 几何，
  生成山体面（`ne_mountain_ranges.geojson`），按缩放分级渲染 + 山系名称标签。
  - Natural Earth 无可用山体面（已验证：`Range/mtn` 不含主山系）；
  - Overpass 可用镜像：`overpass.kumi.systems`、`overpass.osm.ch`（bbox 顺序为 **南,西,北,东**）。

## 二、其他已知问题

- **首屏加载慢**：CShapes 26MB 未精简（可用 mapshaper 降精度/抽稀，或改 PMTiles / 分块加载）。
- **并立政权单块化**（同南北朝旧问题，尚未修）：三国（魏/蜀/吴）、五代十国
  目前仍各画成一块统一疆域，未按政权拆分。
- **世界大事无坐标**：`src/data/worldEvents.js` 是按年份的文字条目，没有经纬度，
  无法在地图上打点。可参考 orbis-chronos 的 `data/events.json`（94 条，含 `lat/lng/分类/中英名`）。
- **许可合规**：historical-basemaps 为 **CC BY-SA 4.0**（传染性），
  混入 MIT 项目需代码/数据分开声明、README 署名、附 `THIRD-PARTY.md`
  （参照 orbis-chronos 的做法）。引入前先确认可接受该义务。
- **历史地名译名**：接入新数据集后，政权名（Han Empire / Great Khanate / Manchu Empire 等）
  需要补充中文译名表（`src/data/country-zh.json` 目前按 CShapes 国名归一化）。

## 三、改造顺序（本次分支）

1. ✅ 推送 `d6d7b17` 到 main，建立 `dev/data-upgrade` 分支，记录本清单
2. 替换手绘中国疆域为真实几何
3. 补世界 1886 年前的疆域空白
4. 拉取全球山脉形势图
