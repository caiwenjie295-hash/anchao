# UX-CASEPATH-20261003 黄子山与钟子月跨网页调查路径返修

> 状态：2026-10-03 冻结执行合同
> 基线：main / `81fafb13586e660b9bc2db1380467295aaee4b88`
> 主审：父代理，只写工单/审查、派发、只读复核、一次必要集成验收及提交合并
> 执行：复用a2与a34两个gpt-6-luna/max子代理；不新增代理
> 授权：用户指出第二幕黄子山/钟子月调查存在卡点，跨网页复制核对路径不清晰；沿用核对后提交合并本地main的授权
> 扩展：用户随后要求全游戏直白提示与右侧调查进度抽屉，追加合同`UX-PROGRESS-20261003.md`；a34拥有明确列出的全局显示产品/测试扩权，a2仍唯一写入T06产品与全局维护文档。两份合同同批集成，其他冻结条款不变。

## 问题与取舍

T06宣传案例页的复制按钮只调用系统剪贴板，成功/失败后没有接上姓名搜索或实名材料复核。复核区与网页视图切换丢失明确的人物上下文；阅读后须自行找顶栏返回，再在两个人和四张来源卡中找下一步。论坛昵称又可能让人误以为要把复制姓名与昵称配对才能继续。

本次让实名调查可连续完成：选人物→查看宣传原文→查看该人的后续原文→返回该人的来源对照→选择有材料支持的发现并记录→明确调查另一个人→两人记录后主动继续。复制仍是手动搜索的辅助，不是必须操作，不依赖系统剪贴板权限。保持网页探索、搜索、标签、历史和完整原文，不增加剧情答案或新状态门槛。

## 用户可见验收

1. **明确当前人物与下一步**：复核区显示两人各自状态与总进度，当前人物清楚。优先一次核对一人的材料，避免两个人各两份来源挤成四列。可自由切人，不强制先黄后钟。主动作从既有visited/reviewed状态导出，具体指出缺哪份来源；全程不要求记住“返回”入口在哪里。
2. **复制有去处**：宣传案例原文处保留原复制按钮及真实成功/失败反馈，并提供直接调查黄子山/钟子月的入口，连接同一工作区或既有姓名查询。说明复制仅用于手动搜索；拒绝/无clipboard时直接调查仍完整可用。若提供一键姓名搜索，必须经既有submitSearch/搜索历史/可见性门槛，不能暗中访问来源。
3. **来源页保留调查上下文**：从个案区打开完整网页时，明显显示正在调查谁、当前来源、已打开/待打开的来源，以及返回对应人物核对的按钮。可继续查看该人的缺失来源。共用宣传页在来自钟子月路径时不得默默返回黄子山。手动搜索打开008/009也必须能找到所属人物的复核入口；无关网页不能伪装成此人的证据。
4. **准确打开与记录**：004为共用宣传来源；黄后续008、钟后续009。只有真正通过玩家打开来源的现有动作才能写visited；只显示步骤、切人物、复制、进入复核区不自动开页、不自动写review/Flag/笔记。两来源齐备才可判断；有边界结论和越界结论都保留，越界反馈可修正且来源不丢失。成功反馈不能使用错误的红色外观。
5. **不丢上下文**：网页→复核回到对应人物/对照位置，键盘焦点落在可解释的标题或下一操作，避免仅滚到总面板顶部。未提交选择在视图往返和切人物后保留；刷新/重开按持久visited/reviewed恢复下一步，未提交选择可按既有组件生命周期重置。浏览器前进/后退/标签/搜索历史仍可用；切换来源或人物时不能残留另一网页的复制成功文案。
6. **明确收束**：第一人记录后提供“继续核对另一人”动作和进度；两人都记录后才开放现有“与小月继续核对资料”，需主动点击才进入finale。legacyCompletionMigrated的合法旧档继续入口保留。论坛昵称维持可选/身份未核实，不成为主链门槛；没有论坛访问、没有复制亦能完成。
7. **排版与可达性**：1440×900的正式默认浏览器窗860×560，以及1366×768最大化、390×844窄屏。小窗口主路径可见且通过一个主要内容滚动区域到达；状态栏紧凑，正文不被步骤/按钮挤成窄条；窄屏无横向溢出，来源对照自然纵排。主要按钮约44px触控范围、focus-visible、radio/人物切换和返回能键盘操作。保留完整原文、出处与日期，不用字号缩小掩盖拥挤。

## 冻结接口与来源

| 项 | 约定 |
| --- | --- |
| 公开来源 | PAGE_A2_T06_004 / _008 / _009原ID、正文、日期、出处不改 |
| 状态写入 | 既有recordBrowserPageVisit、recordBrowserSearch、reviewAct2QimingCase、recordAct2QimingNicknameAssessment、enterAct2FinaleInvestigation；签名/门槛不改 |
| 结论 | public-claims-and-followup-differ，仅宣传与后续说法差异，不证实因果或论坛身份 |
| 存档 | schema13、visitedPageIds、reviewedCases、legacyCompletionMigrated不改，无新存档字段 |
| 组件 | BrowserApp依然支持注入manager；BrowserPageView可新增可选的UI回调，独立调用旧props仍兼容且原copy-names可用 |
| UI状态 | 当前人物、返回位置、临时选择仅组件状态；进度与缺项从已有事实导出 |

## 唯一写入者与精确路径

### a2：产品实现与局部验证

- branch：`agent/UX-CASEPATH-20261003-implementation`
- worktree：`D:/暗潮开发/暗潮-跨电脑开发包-2026-09-24/暗潮-worktrees/UX-NARR-A2-20261002-implementation`
- 允许：`src/modules/browser/BrowserApp.tsx`、`BrowserPageView.tsx`、`browserApp.css`；必要时新增`QimingCaseNavigation.tsx`或`qimingCaseNavigation.ts`（仅此目录的UI导航/步骤函数，无状态写入）；既有`BrowserApp.test.tsx`、`BrowserPageView.test.tsx`；`docs/ux-casepath-20261003/implementation.md`；`维护导航.md`、`docs/progress_log.md`、`docs/todo.md`、`docs/changelog.md`。
- 所有其他生产路径只读，包括全局styles与BrowserSearchResults/browserPresentation。CSS新规则限于T06或组件自身，不能改变第一幕/普通网页布局。
- 先报告选用的UI动作名称/定位与回调契约给a34，避免测试驱动猜测。提供简单可复现路径与未决问题。只运行浏览器组件/数据/呈现相关定向测试、生产build、diffcheck；不跑全量/offline/真实浏览器，不在main实现/合并。
- docs先写实际局部交付，最后由父根据集成证据派docs-only收尾。禁止提前标全量验收通过或填写尚未生成main SHA。

### a34：独立回归、真实浏览器夹具、精准离线驱动适配

- branch：`agent/UX-CASEPATH-20261003-validation`
- worktree：`D:/暗潮开发/暗潮-跨电脑开发包-2026-09-24/暗潮-worktrees/UX-NARR-A34-20261002-implementation`
- 允许新建：`src/modules/browser/Act2CasePath.test.tsx`；`docs/ux-casepath-20261003/validation/`内fixture/helper/tests/README/delivery。
- 允许更新：`src/story/act2T01T06.acceptance.test.ts`（只适配T06可见导航，原门槛/恢复/越界断言保留）；`scripts/verify-offline.mjs`（只现有T06浏览器段，当前约774–800行，改为新可见动作/当前人物切换与返回定位；不改通用click/等待、其他幕、两轮设置、状态门槛和资源校验）。确需超出范围先报告。
- 产品与a2测试、全局维护文档只读。先准备隔离fixture与有价值回归，在a2提交后只读合入并验证；不能自己修产品、不能把jsdom当几何证据。
- fixture动态导入游戏前安装独立MemoryStorage（可读取上一fixture helper，不修改它），隔离失败停止；无真实存档读取/清空。正式BrowserApp+真实StateManager+Act2T06Controller；模拟合法T05完成→T06空白、只黄已录、只钟已录、两人完成、legacy档等起始状态，并提供刷新/重挂载验证同一临时存档的方法。不得每次“恢复”偷塞visited或reviews。
- 优先挂载正式桌面AppWindow/AppShell，先把合法状态写入内存存档再动态导入默认manager；若用注入manager的BrowserApp独立容器，明确设置生产默认860×560内容几何并解释差异。提供无QA控制条的clean URL、default/maximized模式和mobile，控制条不挤占或覆盖正式可视区域。阶段推进到finale时显示真实阶段或正式下一页，不空白、不回退伪装。
- 回归至少覆盖：clipboard拒绝/不存在仍可无复制完成；官方页直接调查/名字搜索有明确去处；手动008/009归属正确；返回到原人物且未提交选择保留；缺来源/切换/复制不会自动写review；钟先黄后完成；越界拒绝后修正；持久部分进度重挂载恢复；两人齐备后显式进入finale；主路径不需论坛；前T06不可泄露/后T06清洗。
- 定向运行新测试+既有T06acceptance，fixture严格类型/单入口编译，`node --check scripts/verify-offline.mjs`与diffcheck。父负责全量/离线/真实浏览器，禁止重复全量门禁。

### 父代理

只写本工单和`docs/reviews/UX-CASEPATH-20261003.md`，管理分支、只读审查、门禁、截图与合并。功能和测试返修回原子代理，不代写。

## 只读依赖与禁止区

先读AGENTS、维护导航、Git工作流、game/04及本工单。必要锚点：src/data/browserData.ts、data/browser_pages.json的T06记录、data/search_queries.json、data/task_guides.json、StateManager T06方法、Act2T06Controller、defaultState/saveManager/types、AppWindow/AppShell/styles、已有浏览器测试与T06acceptance及offline段、上一轮隔离fixture模式。

禁止修改`src/core/`、`src/App.tsx`、所有`data/`及`src/data/`、生产`src/story/`、其他幕/场景、全局样式、图片、依赖、未授权脚本和原29项用户改动。新文案仅为UI操作/进度/反馈，不重写网页原文。两处shell文件模式差异不暂存；不reset/stash/强删。

## 集成与交付门禁

两个子任务完成后父在review审计路径和diff，统一一次运行`git diff --check`、`npm test`、`npm run build`、`npm run build:offline`、默认两轮`npm run test:offline`。仅有新返修/失败才补必要定向检查。

真实IAB核验1440默认窗、1366最大化、390窄屏：从宣传到个人后续再返回记录的连续路径，至少一条钟先黄后无复制/论坛路径，来源返回定位、进度恢复、键盘、长内容/无横溢；保存可读的新截图。批准后a2补维护记录，`APPROVED`才允许`--no-ff`合并本地main。main再生成离线入口并核对manifest.gitSha=HEAD、原29项存在性/哈希/dirty状态；不上传远程。回退`git revert -m 1 <main-merge-sha>`。

原工作区保护记录：工作区根目录`UX-CASEPATH-20261003-protected-workspace.json`，开工已与上轮29项保护逐项核对一致。

交付格式：执行角色、实现结果、提交SHA、实际路径、运行验证/结果、未决或跨边界请求；a34另给fixture URL与真实起始/恢复方式。不得虚构手工全章试玩或主审尚未完成的门禁。
