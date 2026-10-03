# UX-LAYOUT-20261003 · A2 实现与集成记录

## 交付范围

本分支修复第二幕高中（T05）与桥头（T02）的调查版式，只调整展示和滚动结构。阶段、Flag、schema 13、素材与材料 ID、故事原文、双 S、老人交谈、出示证据、拆字与推进门槛均沿用现有实现。

高中回忆默认收为一条既有日常消息引子；原生 `details/summary` 可键盘展开完整消息与两张旧照，摘要为“展开小月的日常消息与两张旧照片”，使用闭合右箭头/展开向下箭头提示状态。“整理已读材料”入口显示从现有 flags 得出的已读数量与来源选择数量，例如“已读 0 / 3 · 已选不同来源 0 / 2”，窄屏允许换行。其下所有材料、禁用原因、来源选择、判断选项和完成回顾仍保留。展开与关闭仅切换展示层，不写状态；选择仍须满足双 S 与至少两种不同来源等既有条件。

高中画面改为内容驱动纵向布局：地点列表与 4:3 完整场景照片并列，窄屏自然上下排列。照片按 `min(100%, 70vh, 920px)` 限制宽度，不随回忆/材料展开而缩小。页面限宽 1440px 并居中，地点列表与正文不再各自建立纵向滚动槽。

桥头保持照片、四位老人、追问、原有出示照片、口述/拆字记录、锁定/重试和继续的原顺序。照片与当前老人交谈并排呈现，内容使用合理行宽；对话和桥头场景内部不再建立纵向滚动槽。页面限宽 1360px 并居中，照片保持 4:3，出示/追问/拆字控件保留约 44px 触控高度。专用场景滚动区稳定预留滚动条宽度，避免手机长对话出现后照片横向缩小。

学校和桥头使用专用 `investigation-shell--act2-spacious` modifier：shell 顶部和固定操作栏保持原位，`.investigation-shell__scene` 承担唯一主要纵向滚动。其他调查语义页不消费此 modifier。

## 修改路径

- `src/scenes/act2/SchoolInvestigation.tsx`
- `src/scenes/act2/BridgeInvestigation.tsx`
- `src/act2/t05School.css`
- `src/act2/t02Bridge.css`
- `src/components/investigation/investigation.css`（仅新增专用 modifier）
- `src/scenes/act2/SchoolInvestigation.test.tsx`

实现提交：`7854e04`；展示层状态箭头/窄屏换行 follow-up：`340875c`；宽屏桥头居中修正：`3e8cfdb`；专用场景稳定滚动条槽：`257e19e`。

## 本地验证

- `npx vitest run src/scenes/act2/SchoolInvestigation.test.tsx src/scenes/act2/BridgeInvestigation.test.tsx src/components/investigation/InvestigationShell.test.tsx src/components/investigation/InvestigationNavigation.test.tsx`：4 个文件、19 项通过。
- `npm run build`：TypeScript 与 Vite 通过，280 modules；保留既有 500 kB 以上 chunk 提示。
- `git diff --check`：通过。

19 项定向测试在 `340875c` 这次纯 CSS 箭头与摘要换行修正前通过；该修正后重跑了生产构建与 diff 检查，没有重复运行定向测试。

## 集成与浏览器验收

- A34 fixture 和独立回归、父级真实浏览器验收及集成门禁已完成。集成 `npm test`：60 个文件、321 项通过；该结果在全部功能实现和 A34 集成后运行，早于 `3e8cfdb`、`257e19e` 两次纯 CSS 修正。集成生产 `npm run build`：280 modules 通过；`npm run build:offline`：278 modules、143 个文件、197.41 MiB；`npm run test:offline` 默认两轮通过。
- 两次后续 CSS 修正各自运行生产构建与 `git diff --check`。最终 CSS 集成节点 `9b7225a` 后，父级再次运行离线构建及默认两轮 offline，均通过；集成审查 `d683666` 的结论为 `APPROVED`。
- 真实 IAB 使用实际组件、StateManager 和隔离的 MemoryStorage fixture，在 2556×1370、1440×900、1366×768、390×844 检查。高中场景照片高度依次为 690、472.5、403.19、250 px；展开回忆/材料不降低照片高度。验证了两来源条件、Escape 返回焦点，以及显式“前往浏览器核查启明”继续操作。
- 桥头照片高度依次为 577.5、472.5、403.19、263 px。稳定滚动条槽使手机短对话增长为长对话后照片仍为 263 px；四个入口均为 44×44 px，无横向溢出，长对话没有内部纵向滚动。正确的“黑补母”判断后才能显式继续到图书馆。
- 父级审查记录 `docs/reviews/UX-LAYOUT-20261003.md`（提交 `d683666`）给出 `APPROVED` 结论并记录集成证据；集成验收通过，主审随后执行本地 main 合并。本记录不填写尚未生成的 merge SHA。
- 本轮没有修改生产 core、App、data、剧情、Flag、schema、公共接口、依赖或图片资源。
