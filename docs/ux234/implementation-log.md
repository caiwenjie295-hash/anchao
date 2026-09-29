# UX-234-REWORK 执行记录

> 当前交付状态：S0–S7 已完成，改动留在 `agent/UX-234-REWORK-investigation-flow`，尚未合并 `main`。当前存档版本为 `anchao.save.v1 / schema 10`。下方 S0 记录为实施前基线快照，不代表当前行为。

## S0 — 基线与流程映射（完成）

- 任务分支：agent/UX-234-REWORK-investigation-flow
- 任务 worktree：../暗潮-worktrees/UX-234-REWORK-investigation-flow-agent
- 基线：main / ce30a3ee854040db0e24ed95416c39d7178b475e
- 基线存档键与 schema：anchao.save.v1 / 9；从代码的 defaultState、类型、saveManager 与 eventBus 重新核对。实施后升级至 schema 10。
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
- 基线 SaveManager 支持 schema 1–9，保存键 anchao.save.v1；schema 10 实施后的迁移规则见 save-compatibility.md。

- 前置闭包检查：act3_t00.json 至 act3_t07.json 每个阶段均从首镜头沿有效 links 可达全部镜头，并逐步满足 requiresClueIds；未发现循环或不可达镜头。T06 对照节点需先取得五项环境观察，是门槛范围过宽而非死锁，后续改为最小核心证据集。

### 执行阶段

| 阶段 | 状态 | 记录 |
| --- | --- | --- |
| S0 | 完成 | main 基线、历史工单边界、测试基线、资源入口、三幕证据/判断/行动映射和第三幕前置闭包已核对。 |
| S1 / P0 | 完成 | 共用调查框架、导航、固定行动区、截图/特写弹层与受阻说明。 |
| S2 | 完成 | 第二、三、四幕接入可见路线、返回、推进与当前证据说明。 |
| S3 | 完成 | 第二幕相关搜索、双来源判断、有效截图与地点推论门槛调整。 |
| S4 | 完成 | 第三幕每阶段核心证据、路线确认与离场动作分离；可选观察可跳过。 |
| S5 | 完成 | 第四幕登录/时间线/广播/回忆/藏笔记/尾声推进门槛修订。 |
| S6 | 完成 | 笔记来源、跨幕提示、转场和 schema 10 存档清洗/兼容。 |
| S7 | 完成 | 全量测试、生产/离线构建、离线连续流程、初始浏览器冒烟及 T07 截图弹窗实测；结果与限制见测试矩阵。 |

## 当前实现与交付

- 共享调查框架位于 `src/components/investigation/`，照片查看与固定行动区位于 `src/components/PhotoViewport.tsx` 和 `photoViewport.css`。
- 第二幕流程与线索门槛覆盖 T01–T07；第三幕 T00–T07 改为核心线索集合并将判断与离场拆开；第四幕 T01–T10 保留有来源支撑的主线推理和可恢复广播/尾声动作。
- 第二幕 T07 视频截图查看器以 `object-fit: contain` 完整显示画面，按 4:3 比例自适应视口，弹层边框计入宽度，无横向溢出；在 1280×720、1440×900 与 390×844 实际浏览器视口核对。
- 最终提交、测试命令与浏览器验收边界见 `delivery.md`；各验收 ID 状态见 `test-matrix.md`；迁移细节见 `save-compatibility.md`。



