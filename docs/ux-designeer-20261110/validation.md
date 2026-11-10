# 独立验收记录

状态：进行中。基线 3d3ec299；本轮停留新分支，不合并主线。

## 基线

- 2026-11-10：Node 24.15.0，`vitest run --testTimeout=20000`，132 文件 / 679 项通过。日志 `/private/tmp/anchao-designeer-baseline-tests.log`。
- 已实看并保存旧版开场、桌面、A3 地下走廊、图书馆、A4 晚自习截图。
- 原主仓库 main 无未提交变更；旧工作树和发布包不改。

## 验收入口与存档隔离

- `fixture.html?mode=opening` 不写初始存档，复现首次开场。
- `fixture.html?mode=desktop` 使用合法初始状态并已看过前言，只看桌面。
- 其他模式复用既有受测 `fixtureCheckpoints.ts`：bridge/library/tales/school/qiming/finale/a3-t04/a4-t05/a4-blog/a4-ending。
- `installFixtureMemoryStorage` 在正式 App 和状态单例导入之前替换存储；不读取、清空或写入玩家正式存档。
- `viewport.html?width=390&height=844&mode=desktop` 等在真实浏览器内建立精确尺寸同源 iframe。浏览器窗口本身受桌面侧栏约束，验收取 iframe 实际 body 宽度并截图裁切；不把侧栏尺寸误报为手机尺寸。
- `motion=reduce` 只模拟 JS 的 matchMedia 返回，不改变系统偏好或 CSS 媒体查询。CSS 减少动态需要另行静态审查，不把该参数称为完整系统级实测。

## 完成前需确认

- 全量原测试、网页构建、离线构建和默认双轮离线流程。
- 新源码路径符合合同；只读核心、数据、文学与素材无改动；无生成物提交。
- 桌面/开场/六应用/章节窗口/进度抽屉、A2 图书馆和学校、A3 热点与放大复位、A4 阅读/翻页/图片放大，1280 与390宽检查。
- 动画不改变游戏动作时序和完成条件；动画减少回退、可读性、滚动、焦点及主要动作可达。

截图目录：`/Users/jay/.codex/visualizations/2026/11/10/01a1c304-8212-7ab3-ae41-0f8c2d3b863c/anchao-redesign/`。
