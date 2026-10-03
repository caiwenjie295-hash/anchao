# UX-LAYOUT-20261003 验证交付

## 实现与验证范围

- 新增 `src/scenes/act2/Act2SpaciousLayout.test.tsx`，覆盖学校回忆折叠不改变存档/调查进度、支持来源在材料折叠开关间保留、少于两种来源时确认被阻止、两种来源后可确认；桥头覆盖先追问再出示、照片后才出现口述与拆字、重听口述、答题并推进到地方志。
- 新增 `docs/ux-layout-20261003/validation/` 下的真实组件 fixture 与内存 Storage helper。Fixture 先替换并自检 `localStorage`，再动态导入游戏/状态模块；真实 UI 通过 `Act2Experience` 挂载并订阅真实当前stage。推进到高中/桥头范围以外时，显示明确的片段完成与当前stage提示。普通模式为实测高度避让工具条，clean 模式不渲染工具条并使用零 inset。
- 仅按工单授权修改 `scripts/verify-offline.mjs`：T05 来源选择前，断言整理面板初始收起，再由 summary 显式展开；其他离线断言和驱动流程未改。

## 真实验收入口

- 高中未读：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=school-unread&clean=1`
- 高中已读材料：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=school-sources&clean=1`
- 桥头完整路线：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=bridge&clean=1`

在 worktree 根目录用 `npm run dev -- --host 127.0.0.1` 启动。三条 clean URL 直接载入对应合法当前状态；不含 fixture 工具条或自动剧情推进。页面刷新可重置当前模式。此 fixture 用于定向场景核验，不代表从第一幕开始的全流程试玩。

## 实际命令与结果

- `npx vitest run docs/ux-layout-20261003/validation/fixtureStorage.test.ts src/scenes/act2/Act2SpaciousLayout.test.tsx`：2 个测试文件、4 项通过。Windows 下用已授权的 `require_escalated` 绕过 Vite realpath 子进程的 `spawn EPERM`。
- `npx tsc --ignoreConfig --noEmit --strict --noUnusedLocals --noUnusedParameters --target ES2022 --lib ES2022,DOM,DOM.Iterable --types vite/client --module ESNext --moduleResolution Bundler --skipLibCheck --jsx react-jsx --esModuleInterop --allowSyntheticDefaultImports docs/ux-layout-20261003/validation/fixture.tsx docs/ux-layout-20261003/validation/fixtureStorage.ts src/scenes/act2/Act2SpaciousLayout.test.tsx`：通过。
- Vite 单入口构建 `docs/ux-layout-20261003/validation/fixture.html`：通过，转换 227 个模块并生成正式 School/Bridge 样式、脚本与图片资源；临时 rollup input config 和输出目录已删除。该 fixture 使用项目中的 `src/styles.css`。
- `node --check scripts/verify-offline.mjs`：通过。
- `git diff --check`：通过。

未启动浏览器，故本分支不报告照片像素高度、横向溢出或真实滚动几何结果；由父审按工单尺寸抽查。未运行全量测试、生产 build 或 offline 门禁，这些由父审统一执行。
