# UX-234-REWORK 交付记录

## 交付内容

- 分支：`agent/UX-234-REWORK-investigation-flow`
- Worktree：`D:\暗潮开发\暗潮-跨电脑开发包-2026-09-24\暗潮-worktrees\UX-234-REWORK-investigation-flow-agent`
- 范围：第二幕 T01–T07、第三幕 T00–T07、第四幕 T01–T10 的调查导航、核心证据、推论边界、可选热点、返回/离场行动、存档恢复与相关文档导航。
- 第三幕视频截图弹窗已修复：画面使用 `object-fit: contain`，查看框按可用宽高比自适应，视口高度限制与 `box-sizing: border-box` 共同消除裁切及水平滚动；桌面与手机实测完整显示。
- 当前 schema 为 10，存档键仍为 `anchao.save.v1`，schema 1–9 兼容说明见 `save-compatibility.md`。
- 当前改动提交到任务分支；未合并 `main`。

## 验证

验证结果：`npm test -- --reporter=dot` 48 个文件、250 项通过；`npm run build`、`npm run build:offline`、`npm run test:offline`、`npm run test:browser` 均通过。离线验收覆盖 T07、第三幕 T00–T07、第四幕 T01–T10，以及两轮 A–K 连续流程。T07 截图弹窗另在 Chromium 1280×720、1440×900 与 390×844 实测；桌面截图见 `screenshots/t07-modal-desktop-1440x900.png`。

生产构建仍提示主 JS chunk 为 809.30 kB，超过 500 kB 建议阈值；构建成功。全量测试有 React `act(...)` 环境提示，无失败。

`test:browser` 仅验证离线首页挂载，不能代表全幕真实浏览器回归。NAV-01/05/06/07/10 的逐幕键盘、焦点恢复、放大文字和多种宽高比排列未被此交付报告为全部真实浏览器通过；自动化覆盖及局部真实视口结果见 `test-matrix.md`。

## 提交

- Commit：待提交后补录。
- 工作区基线为 `main / ce30a3ee854040db0e24ed95416c39d7178b475e`；主工作区中的用户改动没有复制进任务 worktree。
