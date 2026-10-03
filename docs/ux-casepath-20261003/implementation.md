# UX-CASEPATH-20261003 · A2 局部实现记录

## T06 实名个案路径

实名复核区一次呈现一位学员，黄子山和钟子月可任意顺序选择。进度、来源已读状态、缺失步骤与记录状态均由既有 `visitedPageIds`、`reviewedCases` 和 `legacyCompletionMigrated` 派生；切换人物、查看页面和展开指引不写入新状态。

单人物路径为：打开共用宣传来源 `PAGE_A2_T06_004` → 打开该人的后续来源（黄子山 `PAGE_A2_T06_008`、钟子月 `PAGE_A2_T06_009`）→ 返回同一人物的材料核对 → 选择有材料支持的发现并记录 → 明确继续核对另一人 → 两人都记录后主动进入既有资料核对阶段。只通过真实 `openPage` 路径访问页面才记录现有浏览访问事实；已访问材料可回看，未提交的选择在工作区和网页之间、切换人物时保留。

宣传页保留已有复制按钮和成功/失败文案，反馈使用相符的颜色并随页面、人物或浏览器视图切换清除。复制只辅助手动搜索；同页提供“调查黄子山材料”“调查钟子月材料”两个直接入口，不要求剪贴板或论坛。来自某位学员路径时，宣传页、008/009 页面显示当前人物、两份来源状态、下一份待开材料及对应返回按钮；手动打开008/009也分别归到黄/钟。返回聚焦对应材料标题并滚至人物区。

玩家可以先选择越界结论，界面明确说明材料不能支持因果或论坛身份，来源和选择仍保留，可改为有材料支持的结论。只读来源原文、ID、日期和出处、StateManager 方法、阶段、Flag、`schemaVersion: 13`、存档字段及既有推进门槛未改。实现局限于 `BrowserApp.tsx`、`BrowserPageView.tsx`、`browserApp.css` 和两份获准浏览器组件测试；全局进度抽屉与提示由 A34 按扩展工单独立实现，未在本记录中提前宣告集成完成。

## 局部验证

- `npx vitest run src/modules/browser/BrowserApp.test.tsx src/modules/browser/BrowserPageView.test.tsx src/modules/browser/browserPresentation.test.ts src/data/browserData.test.ts`：4 个文件、35 项通过。覆盖钟先黄后路径、宣传页直接入口、手动来源人物定位、返回焦点、跨页未提交选择保留、越界后修正、复制失败/成功反馈及上下文切换清除反馈。
- `npm run build`：TypeScript 与 Vite 通过，280 modules；保留既有大 chunk 提示。
- `git diff --check`：通过。
- 普通受限执行第一次因 Vite 配置加载的 Windows `spawn EPERM` 在测试启动前失败；同一授权定向命令在提升执行环境下完成并通过。

A34 的 T06 独立回归、fixture、acceptance 与 offline 驱动适配，以及全局进度抽屉尚待合入。父代理统一运行整批集成门禁并检查真实浏览器宽屏/窄屏，本地记录不替代这些验收；此节点没有运行全量测试、offline 或真实浏览器。

## 调查桌面壁纸

按用户提供的原图字节复制 `D:\暗潮开发\暗潮-跨电脑开发包-2026-09-24\bd764bb25d49a05105060185774ba14cd2c846f7.jpg` 至 `src/assets/desktop-wallpaper.jpg`；副本 SHA-256 为 `86316098369820B22CE0265E8D0149EBB321FF5F1D33B4ACA004F6F7D74D3642`（1,601,144 字节）。原图未修改。只在 `src/imageAssets.css` 的 `.desktop`、`.desktop::after`、`.desktop-icon`、`.desktop-icon span:last-child` 作用域设置居中 cover 壁纸、关闭旧斜线伪元素，并为图标标签加白字阴影。

壁纸添加后 `npm run build` 通过（280 modules；保留既有大 chunk 提示），`git diff --check` 通过。未新增测试或运行 offline；父代理的最终桌面浏览器检查仍待执行。
