# UX-234-REWORK 执行记录

## S0 — 基线与流程映射（完成）

- 任务分支：agent/UX-234-REWORK-investigation-flow
- 任务 worktree：../暗潮-worktrees/UX-234-REWORK-investigation-flow-agent
- 基线：main / ce30a3ee854040db0e24ed95416c39d7178b475e
- 存档键与 schema：anchao.save.v1 / 9；从代码的 defaultState、类型、saveManager 与 eventBus 重新核对。
- 工单归档：docs/work_orders/工单/UX-234-REWORK.md；与原始用户计划 SHA-256 相同：E4A84675A8E7C373293BA45978BD7FCFBC9F7AF53A7B7A11AF1A7F6DFEFC9539。
- 用户主目录改动：data/story_transitions.json、scripts/new-worktree.sh、scripts/quality-gate.sh、小说文档删除和未跟踪图片保留在原主目录；未复制进任务 worktree。
- Windows 环境有两个 .sh 文件的可执行位显示差异；Git 内容与基线相同。检查任务改动使用 core.filemode=false 过滤模式噪音，提交时只点选工单路径。
- 依赖：npm ci 成功，无漏洞。Node v24.13.1 对 jsdom 30.1.0 的 engines 要求发出警告。
- 基线 npm test：45 个测试文件、247 项通过。test:browser 尚未验证三幕交互；基线浏览器脚本只验证离线首页挂载。
- 已核对上一轮的 A3-T03–T07、A4-IMPL-0001/0002、WB-0010/0011 和相关审查记录。旧工单内状态、维护导航和 todo 有已完成任务的历史快照，冲突时以本工单、当前代码与 APPROVED 合并状态为准。
- 详细的当前门槛/目标证据/行动/边界映射见 flow-map.md。

### S0 发现的主要代码证据

- PhotoViewport 把物件热点和路线按钮一起放在带 zoom/pan transform 的 world 内；路线仅靠 hover/focus 显示标签。图片 object-fit: cover，热点坐标为静态百分比。
- Act3Investigation 使用 act3StageClueIds 汇总每个阶段全部热点；UI 与 StateManager 都要求全部 inspected 才能确认。confirmAct3Stage 同时设置完成/出口 Flag、改 phase/stage 并切首镜头。链接序号用来推测“返回”，locked 路线不可点且无近旁原因。
- 第二幕 T01 controller 要求“补”和“双 S”两个固定搜索 Flag，并设 15 秒提示计时；T04 状态要求三篇阅读、摘录、12 卡全摆和排序后确认推论。
- 第四幕 T01 前进要求 P01 与九页全部读；T03 社交时间线需要 P06 解题后才允许记录阅读；T09/T10 仍在后续节点要求 P21/P23，导航是按 next scene 强制顺序切换。
- SaveManager 当前支持 schema 1–9，保存键 anchao.save.v1；当 schema 10 字段定义和 migration 实现冻结后更新 save-compatibility.md。

- 前置闭包检查：act3_t00.json 至 act3_t07.json 每个阶段均从首镜头沿有效 links 可达全部镜头，并逐步满足 requiresClueIds；未发现循环或不可达镜头。T06 对照节点需先取得五项环境观察，是门槛范围过宽而非死锁，后续改为最小核心证据集。

### 执行阶段

| 阶段 | 状态 | 记录 |
| --- | --- | --- |
| S0 | 完成 | main 基线、历史工单边界、测试基线、资源入口、三幕证据/判断/行动映射和第三幕前置闭包已核对。 |
| S1 / P0 | 未开始 | 共用导航、缩放分离、受阻反馈、焦点返回样板。 |
| S2 | 未开始 | 二三四幕导航与操作规则接入。 |
| S3 | 未开始 | 第二幕推理和搜索流程。 |
| S4 | 未开始 | 第三幕空间、必要证据和消防栓谜题。 |
| S5 | 未开始 | 第四幕 P01–P24 取舍、回忆与广播高潮。 |
| S6 | 未开始 | 跨幕笔记、提示、转场和存档整合。 |
| S7 | 未开始 | 全量回归、真实浏览器、离线与提交报告。 |



