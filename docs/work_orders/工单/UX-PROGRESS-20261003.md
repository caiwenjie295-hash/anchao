# UX-PROGRESS-20261003 全游戏直白指引与调查进度抽屉

> 状态：2026-10-03 冻结扩展合同，与UX-CASEPATH-20261003同批验收/合并
> 基线：main / `81fafb13586e660b9bc2db1380467295aaee4b88`
> 授权：用户希望游戏主体顺畅，不为难玩家；右上提示更清晰直白；右侧抽屉展示“调查进度”、目前路线、待查方向和已知剧情回顾
> 主审：父代理，只写工单/审查、派发与集成；执行仅复用原a2/a34两个gpt-6-luna/max，不再增代理

## 目标与体验合同

1. 右上提示直接说下一步的地点/应用、要看的材料、要按的动作，避免“想一想、再看看”式模糊话。当前待办的简短下一步在收起状态也能看到，不要求多次展开才知道干什么。详细指引称“操作指引/具体操作”，不要“暗示”。不给未发现的剧情答案，也不替玩家打开证据或登记判断。
2. 新增名为“调查进度”的右侧抽屉，默认关闭，桌面与第一至第四幕均可访问；桌面沿用右上提示区的入口，调查场景优先放在已有页头右侧，与退出/主动作并列，自然换行，不做遮挡热点的悬浮大卡。没有现有提示卡的阶段和第一幕收尾也必须有入口。
3. 抽屉包含：当前幕/调查地点与当前目标、基于实际完成事实的路线示意、当前可执行的具体下一步、已掌握线索与剧情回顾、已出现但尚待调查的方向。路线用轻量节点/连接线和“已完成/当前/待核对”等状态，不能只有数字百分比或全Flag清单。
4. 回顾只能显示玩家已读/已检视/已记录的内容。未访问的后续地点/未知人物/后续章节原文/真相不能提前列出；未来未知部分可显示通用“待发现的新方向”。已知宣传与后续报道分别注明来源/性质；论坛昵称保持未核实，王澳亲历与调查者发现要分清。当前进度不能把“打开材料”当“已经确认结论”。
5. 全四幕覆盖：第一幕消息/邮件/网页/现场/照片；第二幕当地询问/地方志/旧录/学校/实名个案/宣传资料；第三幕按实际stage/已检视材料与已确认阶段呈现地点和下一项未读/待确认；第四幕按completedNarrativeSectionIds/actions显示已读篇章、当前阅读与尚缺动作。不能第三/四幕只显示空白或静态总路线。所有状态从现有事实派生；回顾不回退或改写阶段。
6. 指引可列出已知的操作步骤和查询词，减少找入口的成本。抽屉本轮默认只读；若加“打开应用”仅调用现有UI开窗动作且不越权推进。不要增加重复阶段入口、自动破谜或点击线索立即完成任务的捷径。明确告知仍需回到正文执行。
7. 开关/展开/回顾不写存档、Flag、笔记、已读或解谜状态；无新schema字段。刷新从现有存档正确恢复路线，清零后旧回顾必须消失。浏览器T06两人先后顺序自由、legacy合法完成标记也要准确。
8. 抽屉桌面宽约400–480px，右侧拉开；窄屏宽不超过视口，可覆盖大部分屏幕，但关闭后恢复原布局。原游戏画面尺寸不因默认关闭入口而收缩；不能重现学校/桥头被挤成条的回归。抽屉自身一个正文滚动区、标题与关闭按钮始终可达，按钮约44px，无横溢。
9. 模态对话语义、标题关联、Escape关闭、Tab焦点约束、关闭后返回入口焦点；背景游戏在打开时不可误操作。优先原生dialog或等效可靠实现，支持reduced-motion。剧情转场/图片详情/解谜模态打开时不能让抽屉越过它们或绕过确认，触发入口隐藏/禁用或保持背景inert；z-index不能让抽屉按钮盖住剧情模态。

## 最小实现方向

纯函数进度模型按AppState读取阶段/Flag/visited/reviewed/已知笔记/亲历阅读；使用既有源数据提供已知标题和正文摘要，不改故事数据。新UI上下文/Provider可让桌面提示卡与共用调查Shell访问同一个抽屉，不逐个传大量推进回调。它只属于显示层，不进入core。先向父说明所选入口/上下文/焦点实现。

已知taskGuide仅覆盖A1部分阶段与A2；需补足没有指南的现场、A3和A4，不能简单把现有指南全文当全游戏进度。当前目标要指向当前尚缺材料/动作，而非每阶段固定一段无论读完与否都相同的说明。

## 唯一写入者与授权扩权

### a34：全局进度产品与局部验证

沿用`agent/UX-CASEPATH-20261003-validation`分支与`UX-NARR-A34-20261002-implementation`工作树，父已冻结的T06独立回归/fixture/精准驱动职责保留。追加产品所有权：

- 新建`src/components/InvestigationProgressDrawer.tsx`、`InvestigationProgressContext.tsx`、`investigationProgress.css`（上下文可并入Drawer，不强制建多文件）。
- 新建`src/data/investigationProgressData.ts`及`.test.ts`，纯派生显示模型；禁止改其他src/data源文档。
- 新建`src/components/InvestigationProgressDrawer.test.tsx`。
- 修改`src/App.tsx`：仅接入显示Provider/抽屉及必要传入当前状态/转场可见性。保留既有controllers、判断、阶段入口、sceneOpen、dismiss、inert和转场行为；第一幕收尾早return也接入。
- 修改`src/components/DesktopTaskCard.tsx`、`.test.tsx`：当前步骤直白可见、指引名称、调查进度入口；保留旧props兼容与开应用语义。
- 可修改`src/components/AppWindow.tsx`及既有`.test.tsx`（若存在）：仅窗口标题栏的调查进度触发入口，不改拖动/缩放/最小化/关闭/业务props。用于活动/最大化应用时避免浮在桌面上的提示卡覆盖窗口控件；桌面提示仍清楚，窗口/场景入口也清楚，不出现两个重叠入口。
- 修改`src/components/investigation/InvestigationShell.tsx`、`.test.tsx`：仅页头右侧调查进度触发入口/可访问性接入，不改props契约、目标折叠、actions、导航或滚动结构。
- 修改`src/scenes/act1/Act1SceneExperience.tsx`、`src/scenes/act1/Act1Ending.tsx`：仅现有页头/收尾的抽屉入口，不改剧情/动作/热点逻辑。
- 修改`data/task_guides.json`：仅已有记录的summary、steps.label、steps.hint等显示文案。保持所有ID、phases、prerequisiteFlags、completionFlags、completionKind、caseId、appId及记录数量/顺序不变。纠正T07“完整播放视频”被误当门槛的提示；实际允许截帧比对，不新增播放门槛。
- 可修改`src/styles.css`：仅`.desktop-task-card*`提示卡文案布局和新增入口样式，其他选择器冻结。Shell入口排版优先用独立progress.css的局部类；禁止改上一轮act2-spacious滚动规则。
- 文档`docs/ux-progress-20261003/implementation.md`与`docs/ux-casepath-20261003/validation/**`验收夹具（扩展覆盖四幕+全局抽屉）。

所有全局维护文档仍a2唯一写入。a34不得碰a2 BrowserApp/PageView/browserApp.css或既有组件测试；发现T06产品问题报告。a2与a34通过已有UI状态观察同步，不增加core接口。

### a2

继续T06产品；本抽屉的全局维护导航/progress_log/todo/changelog在父提供证据后由你统一docs-only记录两份工单。不要修改a34上述产品/测试路径。

### 父

仅本工单、`docs/reviews/UX-PROGRESS-20261003.md`及既有CASEPATH审查，管理集成/验证/合并。实现或测试问题交回唯一写入者。

## 冻结区、只读来源

不改core/types/defaultState/saveManager/StateManager、任何阶段/Flag/schema/业务控制器、资源ID/图片、所有网页与剧情原文、source notes、依赖或非授权脚本。原29项改动保护沿用`UX-CASEPATH-20261003-protected-workspace.json`。CASEPATH原App/srcdata/data禁止条款以本工单明确列出的UI扩权为唯一例外。

只读：taskGuideData、noteData与notes、sceneData、act2各数据/StateManager门槛、act3Data/act3Presentation/routePolicy、act4NarrativeSections及narrativePolicy/current动作、StoryTransition与App原控制链、modal/image overlay层级。回顾以已知事实筛选后再取文本，不把未来完整数据直接dump进DOM。

## 验证

a34先单独提交Drawer/提示产品节点，再按a2T06最终节点完善独立回归/fixture/offline；可以在同一分支分开提交，不做循环互相merge。定向测试model/Drawer/DesktopTaskCard/Shell及必要App已有回归，生产build/diff；独立T06回归和fixture检查沿CASEPATH要求，不跑全量/offline/真实浏览器。

有价值回归：A1未读无未来人物/真相、部分事实只回顾已知；A2两来源打开与记录区分，钟先黄后/legacy；A3current/已确认/未发现区分；A4已读章节与当前待动作，不提前显示未来段落；打开/关闭/回顾无状态写入；Escape/焦点与清零恢复；右上收起提示仍有可执行说明。不要测试CSS字符串镜像。

两个子任务结束后父只跑同一批全量门禁一次：diffcheck、npm test、build、build:offline、默认两轮test:offline。真实IAB结合CASEPATH四幕代表checkpoint、1440默认窗/1366最大化/390窄屏检查：入口不遮挡、抽屉开关/键盘/不剧透、默认关闭不压缩原场景、手机可达，保存新截图。两份审查都APPROVED后才合并main，最后重建main离线manifest并核对原改动。发现新失败可补针对性检查，不重复无关全章试玩。

交付提交SHA、实际路径、真实定向验证、fixture场景/URL、已知限制；未经父完成不得标整批完成。

执行再分工以CASEPATH工单“2026-10-03执行再分工”段为准：a34保留全部PROGRESS产品和测试、独立T06回归/acceptance；尚未开始写入的`docs/ux-casepath-20261003/validation/**`与精准`verify-offline.mjs`T06适配由a2唯一写入。既有隔离/真实桌面/四幕/默认窗口验收合同不降低；双方均不跑父的全量/offline/真实浏览器门禁。

父只读全仓文字依赖发现`src/story/act2T01T03.acceptance.test.ts`约214行固定断言旧“查一次相关信息”。授权a34唯一修改这一处UI文字断言以验证新直白浏览器搜索指引；原交互、状态、恢复、阶段、Flag和后续路线断言全部保留，不重写该测试或其他幕。将此文件加入产品定向验证，实际路径/结果在实现记录说明。对应offline同一文字断言由a2按CASEPATH追加段处理。
