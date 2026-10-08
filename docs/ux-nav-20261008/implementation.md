# UX-NAV-20261008 实施记录

章节记录使用独立版本化 sidecar `anchao.chapter-history.v1`，原档案仍维持 schema 13。章节入口只从实际 `game.act` / active stage 推导；加载和导入存档时会补齐真实到达幕的入口快照。缺快照或快照无效时，从存档现有前幕材料重建该幕起点；有效的首次入口快照保留。重玩先通过原有存档保护流程写入入口，成功后才发布新状态，并清理阅读位置；重玩早期不会降低既有解锁幕数。正式清零先更新 sidecar，再写主存档；主存档写入失败会恢复原章节记录并保持当前 App 状态。

全局“章节选择”菜单仅显示已到达章节，清零操作位于折叠的“其他选项”内。重玩和清零分别要求确认，默认聚焦取消；确认对话框的 Escape/Tab 事件不会冒泡到幕末父对话框，菜单 Escape 会关闭并将焦点返回入口。App 收到普通导入事件时仅依据导入状态决定是否显示新前言，不把导入显示成清零成功。

T07 新增中性分段定位、截帧后的时刻提示、底部横向胶片条和同屏来源对照。定位本身不写入已播放进度；影片仍需实际播放覆盖原时段。胶片条保留原始截取顺序、时间戳、选择、放大与带入对照操作。对照页复用两侧 PhotoViewport，提供较宽的可疑区域标记及文字入口；观察只改变当前呈现状态，既有语义对照与章节门槛保持不变。

## 验证

使用 Node `v24.15.0` / npm `11.12.1`。

- `npm exec vitest run src/core/persistence/chapterHistory.test.ts src/core/chapterNavigation.test.ts src/core/stateManager.chapters.test.ts src/components/chapterNavigation/ChapterNavigation.test.tsx src/scenes/act2/T07Investigation.test.tsx`：5 个文件、32 个测试通过。
- `node node_modules/typescript/bin/tsc --noEmit`：通过；`npm run build` 的 `tsc -b` 亦通过。
- `npm run build`：通过；Vite 输出一条超过 500 kB 的 chunk 体积提示。
- `npm run build:offline`：通过，生成 160 个离线文件。
- `npm run test:offline`：通过；离线 T07、Act 3/4 主流程、两轮桌面流程、清零后重载、无网络资源和零运行时错误均通过。

宽窄屏真实浏览器、完整单测门禁及最终包验收由父任务执行。
