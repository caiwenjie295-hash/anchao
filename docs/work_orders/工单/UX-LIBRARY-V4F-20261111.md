# UX-LIBRARY-V4F-20261111 用户补丁整合合同

目标：将用户2026-11-11提供的暗潮-UX-v4f补丁-20261111.zip整合到当前改造分支9d92af7；补丁基线85cc140，不能按脚本回退/覆盖当前分支。用户授权补丁包含的图书馆大改和其附带聚光/拍立得/A4改动，不扩大为重新设计。原虚拟桌面/main与第一幕修复2f013da保持；不改剧情Flag/schema/完成门槛/存档核心。执行脚本只作参考，不盲跑。

补丁路径 /private/tmp/anchao-ux-v4f-20261111.patch。归档和参考截图在外层03_测试与验收/UX-LIBRARY-V4F-20261111/reference。补丁SHA256 f5bcbc714e05770dbcc28ae02a441fdc8f53df23d02db820f2a56926c614c45a。

## 唯一所有权

Luna Max唯一产品/测试写入：补丁内全部26路径（git apply --stat可列出）；以及必要的src/design/photoInteractions/**、src/design/evidence.css、src/scenes/act1/SceneClueFocus.tsx（仅避免双层纸框兼容，保留A1现有效果），src/assets/library-v4f-20261111/**（仅当Vite拒绝public静态import时复制补丁原3张jpg字节，禁止重生成/变更hash），docs/ux-library-v4f-20261111/implementation.md。若需其他路径先报告主审分配；禁止core/story生产逻辑、data正文、原资源映射、桌面外壳、package和配置、无关脚本。补丁已包含src/story的两项测试更新，允许按真实新UI更新而不弱化业务断言。导入的原public图片字节保持。

Codex主审：scripts/verify-offline.mjs（唯一写入者，正常UI路径迁移，保留双轮/业务断言/无网络/零错误/清档）；本合同、docs/ux-library-v4f-20261111/除implementation.md外的文档与夹具、docs/reviews/UX-LIBRARY-V4F-20261111.md、CLOUD_HANDOFF/维护导航/progress/changelog/todo。只读参考产品，做集成和组合验收。节点应用/cherry-pick后实看，不复制执行者WIP。

## 合并规则

1. 执行者独立新agent/UX-LIBRARY-V4F-20261111-luna-max工作树，从当前review最新建。用git apply --3way --binary预检/应用并逐项处理冲突；禁止reset/强推/整树覆盖。若先基线建补丁commit须报告后由主审集成。不合main。
2. 图书馆以用户v4f为准：全景/九格架→书→封面/目录/本卷阙/补母志/卷末三志异/后记，保留固定分页、抽屉与判断条件。SHOW_FENGTUZHI_MISSING_PAGES保持补丁默认true；说明列出的七条尚未处理意见不擅自优化，仅记录。
3. 新图片绝对URL /assets/library/...在file与子路径部署会丢图。保留public图片，LibraryResearch通过相对静态import ?url（可import public内文件，Vite是否支持须验证；不支持则已授权复制到src/assets/library-v4f-20261111新子树（与public原图SHA相同））让生产/离线包emit带hash资源，并使file可用。不得引入远端地址/依赖。测试适配实际打包URL，不能断言网络根目录。
4. 用户中途明确“拍立得效果你做的更好，那个保留”：保留当前review PolaroidPhoto、A3 ClueDetailEvidence wrapper和A1独立照片纸框，不纳入补丁InvestigationDetail.tsx/InvestigationDetail.test.tsx/polaroidCard.css三路径的替换，除非确有必要的独立类型修复且不改变效果。旧investigationSpotlight默认兼容可保留，新pointerSpotlight按补丁A3启用时关闭旧层，禁止双层罩。长纸片转录继续在倾斜卡片外，原Esc/焦点/观察/缩放/拖动/蓝色选中态不改。
5. 连续指针不写游戏状态；减少动态/粗指针/无canvas可回退；原PhotoViewport缓存load已知观察不扩展修复除非本次导致。按补丁实际行为记录聚光，勿声称A1也启用。
6. 第一幕act1InteractionGuidance.css修复不可回退；A4正文不被pager盖住，保留2f/ed934旧收口。审查旧evidence样式高优先级可能压新library CSS，必要时只对新库作用域调整。

## 验证与提交

先提交已合并可看节点立即发SHA，给出冲突处理与26路径清单，再跑针对性Library/Tales/endmatter/PhotoViewport/InvestigationDetail及build。测试可按补丁UI改动迁移但不能削弱业务完成条件；原全量超时/脚本不改。主审实际1280/1440全景/选书/目录锁定跳转/补母志摘录/三志异末页与判断抽屉/离开，A1首图和按钮/桌面保护/A4正文；再Node24.15.0完整quality:gate（默认双轮离线、277+新图完整性、Chrome file）。本轮原始截图仅参考，不冒充合并后结果。遇失败修复后只重复有关检查。

产品最终冻结后更新导航/审查，通过才推送原改造分支；不合main，不改公开状态或旧release-main指针，生成同源最新源码/离线ZIP。五小时剩30%时保存暂停；开始时90%剩，额度够则持续完成。最终报告实际测试、冲突与已知限制。
