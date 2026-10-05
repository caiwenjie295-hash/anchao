# UX-DESKTOP-20261005 桌面常驻提示、壁纸与纵向图标修复

> 状态：权威执行工单
> 基线：main / `6be8a4eaf25931ac859e89ec4b283dfff72b6cb1`
> 唯一执行者：原 a2（Luna / max），复用原 implementation worktree
> 实现分支：`agent/UX-DESKTOP-20261005-implementation`
> 主审：父仅工单、审查、构建、集成；执行者只读本工单，不开其他子代理。

## 目标与已定位原因

用户追加三个要求：打开“调查”APP后右侧常驻提示仍可用，恢复指定 Windows 壁纸，桌面图标左侧自上而下排列。此前授权的本地 main 提交/合并继续适用；原文和所有剧情状态保持冻结，沿用“不用测试”。

1. App.tsx 的 taskCardVisible 在任何 active window normal/maximized 时为false。“调查”仍是 notepad appId。至少此应用正常/最大化/从抽屉打开时，右侧 DesktopTaskCard必须继续显示；保留展开提示和调查进度抽屉功能，不因App出现重置其局部展开状态。其他应用无需扩展本批行为。全屏现场、剧情转场和结尾黑幕仍按原约束隐藏/抑制。
2. 确定的离线错误：`暗潮离线/assets/app.css` 内 wallpaper 引用 `../desktop-wallpaper.webp`，实际文件在 `assets/desktop-wallpaper.webp`，引用多退了一层。网页 CSS引用正确，图片文件776594 bytes仍在。通过 App 对同一现有WebP的显式URL import（沿用 ?no-inline）和 inline backgroundImage/CSS变量修正：离线iife的URL应由 app.js 所在目录解析；普通网页按Vite产物URL。imageAssets.css 不保留另一条失效CSS图片路径，不改构建脚本或复制/新增图片。壁纸保持center/cover/不拉伸，图标白字阴影可读；原图和副本字节冻结。
3. desktop__icons 使用列优先布局，正常桌面单列自上而下。高度不足时先填满一列再换下一列，全部六个图标可见，避让52px任务栏、右侧提示和窗口控件；无横向文档溢出。保留apps顺序、图标ID、双击/键盘打开功能。

## 实现与回归约束

- 右提示不被调查普通/最大化窗口遮盖；最大化时尤其不能遮挡窗口关闭/最小化按钮，可用 scoped modifier向下移出标题栏。窄屏提示可保持紧凑折叠，展开可滚动，玩家仍能操作调查内容和任务栏。
- 保留App正常焦点、弹窗/inert、读原core最新状态、幕间衔接、A4 ending suppress；不制造新的状态或存档字段。
- CSS以桌面范围为界，不改场景照片/全局页阅读、主题或其他应用排版。

## 文件所有权

阶段一仅 a2 可写：
- `src/App.tsx`：仅提示显示、必要modifier和壁纸URL。
- `src/styles.css`：仅 desktop/desktop__icons/desktop-task-card 的 scoped布局。
- `src/imageAssets.css`：仅桌面壁纸、图标的相关原规则。
- `src/components/DesktopTaskCard.tsx`：仅必要显示class/prop，原状态及提示内容不改。
- `docs/ux-desktop-20261005/implementation.md`：实际原因、实现、产物引用核对、构建与NOT RUN。
只读全部其他文件。core、schema、剧情/证据/资源ID、apps顺序、data、scene/reader、原141图、compressed副本/map、public、依赖、构建脚本、测试、fixtures、用户原素材和其他文档冻结。两处原shellmode差异不得暂存/恢复；禁止add-A、stash、reset、未知文件清理。

阶段二必须功能合 main 之后再派发原 a2：只更新 `维护导航.md`、`docs/progress_log.md`、`docs/todo.md`、`docs/changelog.md` 与本批implementation；以实际功能合并SHA记录，保留旧历史、NOT RUN与未做的视觉验收。父仅写本工单和 `docs/reviews/UX-DESKTOP-20261005.md`。

## 克制验证

用户“不用测试”覆盖AGENTS的一般npm/Vitest/offline游戏验收和真实浏览器测试要求，本批均不写、不跑，明确NOT RUN；不读取/修改真实玩家存档。执行者跑 `git diff --check`、`npm run build`、`npm run build:offline`，无需安装依赖。沙箱EPERM用已授权require_escalated，不改配置绕过。

静态核对3种桌面窗口状态、CSS列优先/矮屏/窄屏、标题栏避让与真实壁纸在最终JS的URL解析、manifest文件存在及图片hash。构建/源码核对不等同游戏试玩。父审通过才允许合 main，之后同一a2更新进度文档、父再合文档，最终main重建两种产物并核对manifest.gitSha=HEAD。保留原30项dirty、29保护路径和素材。

## 交付

报告实际SHA、变更路径、当前三个需求、CSS尺寸策略/壁纸解析、两种构建结果、NOT RUN及跨界事项。显式限定暂存，不自行合main。阶段一完成后等待父审查/功能合并及阶段二派发。

## 2026-10-05 集成记录

功能实现 `6d6efa0ac1fc321f269f698023a9d654f9742016` 经父审查，已合入本地 main `e539d50d4ce63354378384c9ab7f660cb5bb6e8c`。随后复用同一 a2 完成文档阶段 `43d9a2b095e3e51ae067190f3e07701a72f3df1c`，只更新上述五份记录，保留真实视觉与游玩验收待办，未重跑测试或修改业务代码。父已核对五文件范围、实际差异和 diffcheck，通过文档审查；最终发布产物以文档合并后的 main HEAD 与离线 manifest.gitSha 一致为准。

功能合并后静态审计：9个冻结文件、141张源图和29个保护路径均无哈希/存在性差异，main原30项工作树状态保持一致。网页和离线构建将从最终 main 重新生成；游戏、Vitest、浏览器和离线流程测试继续 **NOT RUN**，没有推送或部署。
