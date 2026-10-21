# UX-PHOTOSTAGE-20261021 冻结工单

用户明确要求第三幕照片主舞台：图片成为页面主体（面积70%仅参考），旁白薄叠层或主动点开，底栏一行状态不重复，上一张/下一张仅一对、结束阶段降级。沿用用户指定唯一原Luna Max产品写入。基线7aba2d696a1b390155ea316197824cac14e291dd；Codex主审。

## 产品与量化标准
- 用户最新修订：70%不是硬指标，图片成为整个页面主体是实际目标。改第三幕所有T00–T07默认调查画面（截图无窗走廊入口、厨房门牌是必验）；记录真实图片绘制区域与frame、viewport交集比例作为参考，不能把大留白画布叫做大图。默认面板关闭时在1280×720、1440×900、390×844、320×568及844×390均测，视觉上照片主导、紧凑标题/工具、场景文字薄叠层/主动查看；不为比例牺牲原图构图，不压扁或加糊图。
- 可为第三幕启用等比cover/沉浸fit并保留平移、缩放和主动全图入口；共享PhotoViewport默认contain及A2/A4调用行为不变。若cover默认会裁切，必须可通过拖拽/方向键/全图查看完整原图，边缘热点在键盘聚焦时可见可激活、坐标随同照片平面；不得裁掉不可达线索或自动观察。未知/失败图片的文字备用入口保持。
- 用户新增放大操作修复：真实鼠标/触摸放大后上下左右均可平移到原图边缘，不能只横向或缩放但无法移动；zoom=1的cover溢出也可平移。方向键、复位、全图入口保持。用可收起的薄提示与明显放大控件引导玩家主动尝试：初始“滚轮或双指放大，拖动画面查看细节”，放大后“拖动查看四周”，配合可拖光标；不得提示特定线索位置、自动zoom/inspect或新增持久Flag/schema。
- 默认只留一行真实状态：本张待看N（存在未观察时不得称已清）、本张已清（N=0）、本阶段还差M。完整说明/观察记录按需打开；不再默认展示重复清单、重复提示、每个必需缺项的重复“前往下一张”按钮。删除这些快捷钮，不通过CSS假藏但同时仍有多份可访问导航。
- 仅一组上一张/下一张主导航；所有原合法路线（包括分支）必须可用，额外分支放次级地点/更多动作；结束本阶段/离场/翻笔记等原动作保持门槛并降为次要动作，不自动推进。保留阻塞原因与相关材料显式打开/焦点返回。小屏工具44px左右可操作，单行状态省略可展开，不让顶部三个大按钮挤掉图。
- 词表/旧庙照片对照仍可主动打开全文与原图，不删线索/转录；默认不挤占主图。观图弹窗/用户主动展开完整说明/全图缩略状态不作为默认照片主导验收，但必须正常可达、可关闭恢复现场。
- 字体、色彩延续现有调查游戏；原图不换、不生图、不拉伸。禁止剧情/数据/资源ID/Flag/schema/required门槛/路线/存档/解锁/外挂变更，不动A4封面与已验邮件。不能添加产品调试入口。不能全仓格式化、依赖升级或降低测试。

## 文件所有权
Luna独占：src/scenes/act3/Act3Investigation.tsx及Act3Investigation.test.tsx；src/act3/act3Scene.css；可新增src/scenes/act3/Act3PhotoStage.tsx、Act3PhotoStage.test.tsx（若需要拆分导航/画面）；共享src/components/PhotoViewport.tsx、photoViewport.css、PhotoViewport.aspect.test.tsx、PhotoViewport.observer.test.tsx、可新增PhotoViewport.cover.test.tsx；src/components/investigation/InvestigationShell.tsx及InvestigationShell.test.tsx、investigation.css（仅第三幕opt-in呈现）；如确需调整导航，可改InvestigationNavigation.tsx及其同名.test.tsx（默认其它幕行为必须保持）；docs/ux-photostage-20261021/implementation.md。
共享API授权仅可增加PhotoViewport可选fit/沉浸呈现参数与必要几何helper、InvestigationShell/Navigation可选第三幕呈现参数，默认语义与现有调用保持；不改公共核心API。其余路径只读。如遇新测试受旧选择器影响先报父精确增补所有权，不能扩大产品范围。
父独占：本工单、docs/ux-photostage-20261021/validation.md、docs/reviews/UX-PHOTOSTAGE-20261021.md、维护导航.md、docs/progress_log.md、docs/todo.md、docs/changelog.md；开发包外层03_测试与验收/本任务QA、01_最新交付新版本与90_历史归档（保留旧包）。执行者不得编辑/提交父工单。

## 固定验证与顺序
父复制与main锁文件一致的独立node_modules。Node24.15.0/npm11。Luna先实现+定向几何/界面测试（默认contain保护、cover等比/resize/pan/焦点、单份导航、状态、blocked/材料/特殊线索），通知父可验收；随后npm test / npm run build / build:offline / test:offline，全通过提交自己分支，实施文档写实际SHA/命令/限制。不得合main/推送。
父审查diff与授权/原文资源保护，完整quality:gate、真实宽窄/短屏/横屏的图片实际占比与热点交互、静态包重点复核（无整轮盲测）。主审APPROVED后--no-ff集成main、合并后门禁；最终/AnChao/部署文件夹与精简源码同源，01_最新交付更新，已整理目录继续保持整齐。默认画面照片不成为主体、放大后无法上下左右移动或把线索裁不可达即不通过；70%仅记录为参考。
