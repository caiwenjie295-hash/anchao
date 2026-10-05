# UX-POLISH-EXTRAS-20261006 高中优先级、阅读和共用补全

> 状态：权威执行工单（执行者只读）
> 基线：4e1900a9b12bcc9685eb5d2dc23fe7ad299ffbb2
> 执行：gpt-6-luna / max；独立 worktree；禁止合并 main。

## 共用约束

先读 AGENTS.md、维护导航.md、docs/协作开发与Git工作流.md、UX-POLISH-20261006.md。本次用户授权四个 Luna/max 子代理；主审负责合并和最终一轮验证。不得另开子代理。实现阶段可运行 tsc、git diff --check、资源检查；不要各自重复运行完整测试/构建/浏览器门禁。可以编写必要的行为测试，交最终集成运行。

保留原小说字句、30项主工作区状态、141张已有原图、现有资源 ID、Flag、存档 schema 13 和剧情门槛；不修改 data/story_transitions.json 和原始剧情 JSON。微信模块、微信 CSS 及聊天交互冻结。保留桌面 Windows 壁纸、列优先纵向图标、调查 App 打开时常驻右侧卡片、A2→A3直接入口、A4呼应回顾、黑幕落幕和 VeinJay_C 署名。任何范围外需求先向主审发消息，不自行改共享文件。

视觉：克制的白灰调查界面，统一绿灰主色；正文16–18px（小说按阅读设置），次要文字至少12px；正文有宽度上限和行距；卡片减少重复边框；每阶段一项主动作。按应用实际容器宽度适配，390px和约800px应用窗口不能依赖整个浏览器宽度。按钮触控目标约44px、键盘可达、焦点可见，弹窗 Esc/Tab/关闭回焦；完整照片不裁切，热点使用图像平面归一化坐标。

最终报告：Role / Delivered / Commit SHA / Changed paths / Validation run / Deferred or blocked / Cross-boundary requests。只显式暂存允许路径，禁止 add -A、reset、格式化未分配文件，禁止提交 dist、node_modules、离线产物、日志、本机配置。

> 分支 agent/UX-POLISH-EXTRAS-20261006

## 必须交付

1. A4阅读位置：跨返回桌面/刷新保留当前block、正文页、封面已看，进入已有章节继续原位；回顾与主链进度分开。仅独立UI存储（新key如anchao.ui.v1），不变剧情存档schema13，不越过未解锁章节/用页号自动写剧情Flag。无效/越界数据安全夹取，重置存档后不得残留旧阅读进度。紧凑上一页/页码/下一页＋可折叠目录，取消不断增长的按钮墙；原小说字节冻结。
2. A4封面映射：大学日常缺图用IMG_A4_T08_011；厨房逃出后的消防栓段用IMG_A4_T08_012或明确阶段相符旧图fallback；2014禁闭用IMG_A4_T06_007。T08不同段不能连续不合理复用厨房图。保留封面页→纯文字页的阅读结构与呼应提醒（可折叠、只已知），保留黑幕故事已结束和三行VeinJay_C署名。末页可准确HTML呈现信/笔迹，不改原文。
3. A3已发现细节照片：底座近景IMG_A3_T06_009接入该热点已有详情/对照；纸条复用现有IMG_A3_T04_005和T05_005，把VVaKe/13aCK准确文字层与纸片详情区分明；不能增答案门槛、预告未来或给未发现证据。
4. common提示/进度/UI文案：浮窗简洁当前下一步，调查App行动与记录，右侧抽屉已知路线+回顾；减重复、去报告味和开发备注。去掉主动登录/有边界/材料未证因果等操作性说教但保留事实不确定性；小说、微信、A2/browser原text由其owner维护。常驻浮窗不随调查App消失。
5. 设置与存档：读者字号18/20/22（或等价三档），独立UI key；在调查App或通用菜单提供存档导出/导入（调用现有验证/hydrate或添加窄API），清楚成功失败/保存反馈，损坏导入不能覆盖合法存档；重置有清楚二次确认，与设置分开。禁止新音频资源/编造效果。具体自有模块 src/modules/settings 与commonUI可新增。
6. 高频写盘：如现实现每pointermove/文本键入同步localStorage，保持story commit即刻通知与重要剧情即刻保存，仅节流窗口几何/照片调节/笔记连续保存并pagehide/visibilitychange flush；修改core之前精读saveManager，写必要行为回归（单round由父执行），异常能反映状态。Flag/schema/状态API不变；若风险过高，优先可靠flush与保留现有保障，在交付报告具体解释不可安全完成部分。不得把saveexport变成不验证JSON直接写storage。
7. App.tsx唯一写入：集成A1图标选中/小屏边界请求（新API兼容），保持桌面壁纸导入、列优先网格和调查窗口浮窗；在合图后确认新图片消费者。index.html title改全项目名。

## 允许写入

- src/App.tsx、index.html、src/modules/notepad/**、src/modules/settings/**（新增）
- src/components/investigation/**、PhotoViewport.tsx/photoViewport.css、DesktopTaskCard.tsx及同名测试、InvestigationProgress*.tsx及对应测试/investigationProgress.css、ResetProgressButton.tsx
- src/data/investigationProgressData.ts及对应测试、src/data/narrative/act4Presentation.ts（原act4Narrative.ts绝对禁止）
- src/scenes/act3/**、src/scenes/act4/**、src/act3/**、src/act4/**
- src/core/saveManager.ts/stateManager.ts及对应必要测试；新增 src/core/uiPreferences.ts/uiPreferences.test.ts、src/core/readingPosition.ts/readingPosition.test.ts；不改Flag/types/schema/storylogic
- docs/ui-polish-20261006/extras/**
- 第二阶段仅在父通知功能合并后：维护导航.md、docs/progress_log.md、docs/todo.md、docs/changelog.md

禁止A1/A2/browser/WeChat、styles.css/imageAssets.css、AppWindow/DesktopIcon、图片manifest/map/源图、原剧情json/act4Narrative/story策略/Flag/schema。

## 验收

阅读恢复不推动故事或泄露内容；导入损坏存档失败原存档仍可用，正常导入/导出/重置可用；频繁动作通知即时且末尾/页面退出能保存；异常可见；所有新图片按已发现状态显示；常驻卡片/壁纸/纵列保留。整轮测试由父统一。提交前tsc -b --pretty false + git diff --check，测试编写侧重恢复/存档不坏/flush，非样式快照。
