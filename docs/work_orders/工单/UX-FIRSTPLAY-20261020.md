# UX-FIRSTPLAY-20261020 首次试玩八项界面修复

> 状态：8项实现已完成；主审恢复工程验收通过，APPROVED。用户明确无需再次盲测。
> 基线：e23170010174d1a67c66ae6f125b6fbb5b34b3e7
> 唯一产品代码写入者：gpt-6-luna / max
> 分支：agent/UX-FIRSTPLAY-20261020-luna-max
> worktree：本文件所属独立工作树；执行者只读本合同，不修改合同或主审文件。

## 目标与来源

用户批准首次盲测提出的8项修复；先完整阅读开发包根`试玩评审-20261020/首次盲测-01a157b4/拟修改清单-待确认.md`和`首次试玩报告-冻结.md`，按F编号核对实际情况。报告为模型模拟首次玩家而非真人研究；已冻结，不反向改写。

## 必须交付与验收

1. F03：清除第三幕玩家展示description中的T00/001/003、后期覆盖/叠层、构图锚点、制作指令等，不全局替换真实剧情时间数字，不变更源图。只重述已有现场可见事实，不发明新线索或角色行为。
2. F01：学校记录面板显露双S比对待完成/已完成与既有可达入口；3/3标明只指三份材料，不改确认门槛。对照完成前后可分辨状态。
3. F02：第三幕缺项明确属于本阶段还是当前图。展示现有可达缺项/相关材料恢复入口，已观察热点可辨认。把普通前行路线改为“下一张现场照片”等实际含义，与阶段结束动作区分；不变更requiredClueIds、route availability和related-material导航算法，不跳过阶段。
4. F04：常规阅读推进直接显示下一段首屏原文，消除空标题“按按钮翻开”及动作后无信息的继续/翻开中间层。必须保留首次有意义章节封面/旧图片访问机会、密码输入/日期核对、开信/开档案/藏本等原必要动作和原manager调用；只合并表现层冗余。13步广播、上一步/重看/全文、完成门槛全部保持。回看、继续位置和旧存档兼容不回退。
5. F05：调整普通尾句孤页合并，原段落及顺序逐字不变；已知“应该只是撞伤吧”“我又看了2014档案”不独占新页。不要合并有明确悬念功能的身份切换/广播回应。保持scene ID、art映射及原page-index兼容处理；旧存档已读边界不能扩大或倒退。
6. F07：图书馆单页卷册/目录/末页的提示与实际可操作页数一致；不新增正确答案提示，不改卷册来源门槛。
7. F06：修复“主角收到收到”等重复UI标题。邮件23:41/08:17、鸡头岭等原稿冲突仅核查并在交付文档说明，不在本批修改叙事原文。已有维护导航记载完整HTML曾有限校订，可作为核查线索，但不能改受保护原稿。
8. F08：高中尚未读到机构名时，行动按钮中性命名；取得现有FLAG_A2_QIMING_NAME_FOUND后再出现启明。只改提示展示，不改解锁/路线，其他未授权提示强度不动。

## 冻结接口与保护

- 所有stage、Flag、state schema13、clue/action/resource IDs、判题答案、必需条件、保存迁移与manager公共API完全保持。
- 不修改`src/data/narrative/act4Narrative.ts`、小说HTML、PDF/DOCX原稿、所有图片/音乐、assetLoader/images/映射/manifest。
- 不修改默认测试超时/依赖/锁文件/全局测试脚本来掩盖失败。只针对新增行为更新必要回归测试；不能弱化既有断言。
- 不从旧停止WIP取代码/图，不接触其他worktree。旧art worktree包含未提交用户工作，完全保护。
- 用户只批准8项：提示强度、删减重复剧情、改变结局/角色/谜底均deferred—do not implement。

## 唯一写入路径

Luna允许（路径皆相对本worktree）：
- `data/act3_t00.json`至`data/act3_t07.json`，仅玩家展示description字段；相应结构字段/ID/正文事实不改。
- `src/scenes/act2/SchoolInvestigation.tsx`、`LibraryResearch.tsx`及各自`.test.tsx`。
- `src/scenes/act3/Act3Investigation.tsx`及`.test.tsx`。
- `src/data/act3Presentation.ts`及对应测试（可新增同名`.test.ts`）。
- `src/scenes/act4/Act4NarrativeReader.tsx`、`Act4ReaderBehavior.test.tsx`、`reader/Act4ReaderStoryBody.tsx`及对应`.test.tsx`、`reader/Act4ReaderCover.tsx`、`reader/Act4ReaderPager.tsx`、`reader/readerVisibility.ts`及`.test.ts`、`reader/readerModel.ts`、`reader/useAct4ReaderSession.ts`及`.test.tsx`。
- `src/scenes/act4/Act4LaterExperience.test.tsx`：仅同步本批封页→正文内配图/原图放大与T05部分回顾预期、F06邮件标题断言；其他行为保护断言保持。父审发现该未分配文件已被改写后逐hunk审查确属F04/F06必要回归，补充明确所有权；后续新增路径仍须先请求。
- `src/data/narrative/act4Presentation.ts`及`.test.ts`。
- `src/scenes/act4/reader/layoutPreferences.ts`与新增`layoutPreferences.test.ts`：仅当前560字分页到新表现布局的UI位置迁移；可提升独立reader-layout表现版本，保持游戏schema13/StateManager/故事Flags和原公共API，不伪造已读或动作。
- `src/act2/t05School.css`、`src/act3/act3Scene.css`、`src/act4/act4.css`，仅本批新增状态/入口样式，避免全局改版。
- 新增任务特定测试`src/data/firstPlayCopy.test.ts`。
- `scripts/verify-offline.mjs`：仅T04开邮件、T08开档案、T09藏本/出门、T10最后邮件动作后/重新挂载的旧空推进或封页预期改为直达已揭示正文预期，并明确原动作完成但当前段/A4尚未自动完成；保留其余四幕/广播/结束/资源断言与测试机制。此为F04行为同步，不改超时/重试或绕过验证。
- 实现说明和验收记录原定由Luna交付，但停止时未创建；恢复阶段主审独占新增`docs/ux-firstplay-20261020/implementation.md`和`validation.md`，只整理既有实现及实际验证，不修改产品代码。

主审独占：本合同、`docs/reviews/UX-FIRSTPLAY-20261020.md`、`维护导航.md`、`docs/progress_log.md`、`docs/todo.md`、`docs/changelog.md`、开发包根PROGRESS.md、外层本轮验证/报告。主审不写产品代码。

其他路径只读。需要新增/扩展路径先向主审发请求，不自行扩大。代理共享文件系统，但只有你写本工单产品路径；保存他人变动，禁止reset/回退未知文件。

## 实施与交付顺序

读取AGENTS/维护导航/协作工作流及必要01–04约束；确认本独立分支与基线。按模块小步实施→必要定向测试→提交到本分支（不合并main）→回报供主审审查。禁止再派任何子代理。

本机Node24.15.0已在`/private/tmp/anchao-node-24.15.0/node-v24.15.0-darwin-arm64/bin/`，用PATH前置；node_modules新树缺失时优先npm ci --offline --cache /private/tmp/anchao-npm-cache --engine-strict（失败再报告，不全局改依赖）。所有命令输出写本轮外层日志，避免大型输出。

Luna必须：定向Vitest（含分页原文完整性/迁移、门槛未改、阅读/回看、学校缺项、第三幕状态）；npm test（如本机既有5秒冷导入问题，保留失败并报告，未经主审不要改配置）；npm run build；npm run build:offline。

主审：审查diff/路径/保护blob，完整`npm run quality:gate -- --base-ref=e231700...`（含默认双轮四幕offline、Chrome file），真实1280x720和390x844浏览器原卡点复测及必要结束操作。全部通过→本合同主审APPROVED→--no-ff合入main→合并后复验。只本机，不推送/部署。

## 报告

Role / Delivered（逐8项） / Commit SHA / Changed paths / Validation实际命令结果 / 未完成与剧情核查（邮件时间、地名、可选对话） / 兼容风险 / Cross-boundary requests。禁止只回复完成，禁止声称未跑的检查通过。

## 2026-10-20 恢复与收尾

用户明确继续此前代码与测试工作，并要求不再盲测。恢复时已发现产品提交05bde99通过另一轮接续合入main 13ff141，树干净、产品树与停止快照一致；不重写已有提交或重复合并。父在独立`codex/UX-FIRSTPLAY-20261020-final-review`分支仅补齐维护/交付文档，保留Luna为唯一产品代码写入者。当前main已独立通过原npm test（125文件606项）和完整quality:gate，T04/T08动作直达及T10落幕宽窄工程检查通过；冻结首次报告保持。无推送/部署，历史ZIP不覆盖。
