# UX-DESKTOP-20261005 桌面修复主审

> 结论：APPROVED（源码、构建与静态资源审计范围）。
> 基线：`6be8a4eaf25931ac859e89ec4b283dfff72b6cb1`。
> 实现：唯一原 Luna / max a2，`6d6efa0ac1fc321f269f698023a9d654f9742016`。
> 父只写工单/审查、核对实际差异并集成；业务修改由原执行者完成。

## 原因与修复

- 右侧 DesktopTaskCard 原显示条件把任何打开的应用视为隐藏依据。现在 notepad 的 normal/maximized 状态保持卡片挂载，与 activeAppId 分开，切焦点不重置展开/暗示状态。现场、转场和结束黑幕原隐藏/inert范围保留；进度抽屉仍按原模态行为工作。
- 宽屏卡片避开调查窗口标题栏，空间不足时移到标题栏上方；上方计算也被视口任务栏边界限制，避免旧存档或任意拖动的较大 bounds.y 将提示推出屏幕。窄屏停靠任务栏上方，限制最大高度、支持卡片滚动，顶部调查页签不被覆盖。
- 图标从左侧纵向填列，单列空间不够再加列；保持原 apps 顺序与打开回调。宽屏为右侧提示预留水平区域；窄屏为底部提示预留垂直区域，图标容器可滚动，内部溢出受限。
- 壁纸原离线 CSS url 为 `../desktop-wallpaper.webp`，而文件位于 `assets/desktop-wallpaper.webp`，多退一层目录。改为 App 显式 no-inline URL import 和 inline backgroundImage；离线 JS 构造 URL 使用 document.currentScript.src，从 app.js 所在 assets 目录正确解析。CSS不再保留错误相对路径；center/cover、白色图标标签和原阴影保留。

## 范围与资源证据

实现仅5个授权路径：App.tsx、DesktopTaskCard.tsx、styles.css、imageAssets.css及本批implementation。状态接口、原文、data、应用顺序、原图、压缩副本、构建脚本、依赖和测试无改动；原两处shellmode差异未暂存。未读取/改变玩家存档。

原JPEG与用户原来源为1,601,144 bytes，SHA256 `86316098369820B22CE0265E8D0149EBB321FF5F1D33B4ACA004F6F7D74D3642`；同一WebP为776,594 bytes，SHA256 `4B90611727FDB8D63875DAE7353E47054266AC2A663E81CF99014949183A72EF`。原图不变。父静态读取子交付：offline/assets/desktop-wallpaper.webp存在，app.js包含从脚本目录解析的构造，app.css的错误父级路径已消失。

开工main原30项dirty与上批精确一致，29保护路径无存在性/哈希差异。结束再次核对；不提交或恢复任何用户文件。

## 验证边界

| 项目 | 结果 |
| --- | --- |
| 实际范围与 git diff --check | 通过 |
| 执行者 TypeScript / 网页构建 | 通过，289 modules |
| 执行者离线构建 | 通过，144文件 / 42,911,482 B / 40.92 MiB |
| 父离线路径、文件存在与壁纸SHA读取 | 通过 |
| 游戏 / Vitest / test:offline / 真实浏览器试玩 | **NOT RUN** |

延续用户“不用测试”，未新增测试或fixture，仓库一般测试/浏览器要求由用户指令覆盖。以上是源码及产物核对，不声称真实宽窄屏视觉、完整操作或通关已经验收。允许按已授权 --no-ff 合入本地main，功能合并后派同一a2更新进度文档，父再审查并合文档；最终main重建网页和离线包，确认manifest.gitSha=HEAD及资源存在。无push或部署。
