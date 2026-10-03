# UX-LAYOUT-20261003 · A2 实现记录

## 交付范围

本分支修复第二幕高中（T05）与桥头（T02）的调查版式，只调整展示和滚动结构。阶段、Flag、schema 13、素材与材料 ID、故事原文、双 S、老人交谈、出示证据、拆字与推进门槛均沿用现有实现。

高中回忆默认收为一条既有日常消息引子；原生 `details/summary` 可键盘展开完整消息与两张旧照，摘要为“展开小月的日常消息与两张旧照片”，使用闭合右箭头/展开向下箭头提示状态。“整理已读材料”入口显示从现有 flags 得出的已读数量与来源选择数量，例如“已读 0 / 3 · 已选不同来源 0 / 2”，窄屏允许换行。其下所有材料、禁用原因、来源选择、判断选项和完成回顾仍保留。展开与关闭仅切换展示层，不写状态；选择仍须满足双 S 与至少两种不同来源等既有条件。

高中画面改为内容驱动纵向布局：地点列表与 4:3 完整场景照片并列，窄屏自然上下排列。照片按 `min(100%, 70vh, 920px)` 限制宽度，不随回忆/材料展开而缩小。页面限宽 1440px 并居中，地点列表与正文不再各自建立纵向滚动槽。

桥头保持照片、四位老人、追问、两份出示资料、口述/拆字记录、锁定/重试和继续的原顺序。照片与当前老人交谈并排呈现，内容使用合理行宽；对话和桥头场景内部不再建立纵向滚动槽。页面限宽 1360px，照片保持 4:3，出示/追问/拆字控件保留约 44px 触控高度。

学校和桥头使用专用 `investigation-shell--act2-spacious` modifier：shell 顶部和固定操作栏保持原位，`.investigation-shell__scene` 承担唯一主要纵向滚动。其他调查语义页不消费此 modifier。

## 修改路径

- `src/scenes/act2/SchoolInvestigation.tsx`
- `src/scenes/act2/BridgeInvestigation.tsx`
- `src/act2/t05School.css`
- `src/act2/t02Bridge.css`
- `src/components/investigation/investigation.css`（仅新增专用 modifier）
- `src/scenes/act2/SchoolInvestigation.test.tsx`

实现提交：`7854e04`；展示层状态箭头/窄屏换行 follow-up：`340875c`。

## 本地验证

- `npx vitest run src/scenes/act2/SchoolInvestigation.test.tsx src/scenes/act2/BridgeInvestigation.test.tsx src/components/investigation/InvestigationShell.test.tsx src/components/investigation/InvestigationNavigation.test.tsx`：4 个文件、19 项通过。
- `npm run build`：TypeScript 与 Vite 通过，280 modules；保留既有 500 kB 以上 chunk 提示。
- `git diff --check`：通过。

19 项定向测试在 `340875c` 这次纯 CSS 箭头与摘要换行修正前通过；该修正后重跑了生产构建与 diff 检查，没有重复运行定向测试。

本分支没有运行真实浏览器、全量测试或 offline 门禁。A34 的隔离 fixture 与新增回归、父级 2556×1370 / 1440×900 / 1366×768 / 390×844 几何验收和集成门禁仍待完成；对应结果应由主审按证据补记，不在此提前标记通过。
