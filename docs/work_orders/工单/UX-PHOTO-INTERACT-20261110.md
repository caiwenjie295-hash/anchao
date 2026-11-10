# UX-PHOTO-INTERACT-20261110 调查照片交互与图书馆间距

> 权威执行合同；基线85cc140f；产品唯一写入者Luna Max；主审Codex。
> 用户已要求落实三项并完成最终视觉与离线验收；电脑端优先；原虚拟桌面禁止修改。

## 交付

1. 第三幕照片调查主舞台：半透明黑色遮罩与“滑动鼠标调查，点击高亮点查看”提示；指针扫过时局部亮起。它是纯观看增强，不增加擦除门槛、不自动观察，不拦截高亮点、照片拖动/缩放或键盘。
2. 第二幕图书馆：建立局部统一间距（8/12/16/24/32px起点）、目录/书架与正文的明确分栏、内容内距、工具分组和少量细线；避免卡片套娃。实看目录展开、取册、翻页、书签/关键词、长页滚动，不能只做空态。
3. 照片调查热点特写：既有证据照片以拍立得纸框展示，暖白边与较厚底边，轻微指针倾斜/移出复位；标题/说明完整。先用于第三幕全部有独立细节照片的热点，第一幕独立细节照片可安全复用；普通背景裁切特写保持原比例与裁切逻辑。
4. 主审完成全量测试、网页构建、离线构建、默认双轮离线、包完整性和Chrome file检查，以及1280/1440电脑实看。

## 指定参考

按 docs/ux-designeer-20261110/下一步参考与实施清单.md 的三个具体详情页：Burak Aslan苔藓纸卡交互转译为黑色局部照明；Damir Unslopping a vibecoded dashboard用于图书馆边框/间距；Adi Japanese Id card用于拍立得深度/倾斜/复位。用户已给截图，主审继续查看动态演示；不复制外部素材，不新增依赖。

## 接口冻结与实现规则

- PhotoViewport可新增默认关闭的纯展示可选prop（例如investigationSpotlight），保持现有调用兼容，第三幕显式开启；不靠URL或全局开关打开。
- 新展示叶子组件放src/design/photoInteractions/。聚光连续值用ref/CSS变量/rAF，禁止每次pointermove触发React状态或游戏写盘；原手势处理器不改算法。按frame而非缩放后的照片平面定位遮罩，离开/切图/卸载清理。
- 键盘焦点应保持照片和热点可读，触控与不支持hover时使用静态提示或关闭跟随。减少动态偏好关闭聚光跟随、卡片倾斜和新入场动画，监听偏好变化；不支持相关API时可安全回退。
- 拍立得可封装无业务状态的框组件；保留原img/alt/资源ID/图像比例与文字回退。paper transcript等长文字不跟随卡片晃动。不能改观察调用的时机、关闭/Esc/焦点约束与回焦。
- 第一幕SceneClueFocus如接入仅包装原独立图片分支，不改变background局部放大、失败重试、旁白或事件。
- 旧虚拟桌面/壁纸/图标/任务卡/Dock/窗口框架与上一检查点保持一致。新CSS变量仅局部，不放:root。
- 原剧情、Flag、存档schema13、资源和文字、照片原图、热点坐标、蓝色选中区域、阅读分页/高水位不改。

## 文件所有权

| 角色 | 独占写入路径 |
| --- | --- |
| Luna Max产品 | src/design/photoInteractions/**（含新测试）；src/components/PhotoViewport.tsx；src/scenes/act3/Act3Investigation.tsx；src/scenes/act1/SceneClueFocus.tsx；src/scenes/act1/Act1SceneExperience.tsx（仅纯展示接入，如不需要不改）；src/act2/t03Library.css、act2ReadingRoom.css、act2ShelfMap.css；src/scenes/act2/LibraryResearch.tsx（仅必要呈现wrapper，不改行为）；src/design/evidence.css；docs/ux-photo-interact-20261110/implementation.md |
| Codex主审 | 本合同；docs/ux-photo-interact-20261110/除implementation.md外的文档/夹具；docs/ux-designeer-20261110/文档与夹具；docs/reviews/UX-PHOTO-INTERACT-20261110.md；CLOUD_HANDOFF.md；维护导航.md；docs/progress_log.md、changelog.md、todo.md |

未列出的路径只读。尤其core/story/data/素材/原测试/package/配置/脚本/桌面外壳不写。需要越界先报告。新测试必须覆盖行为风险（连续指针、清理、偏好、回退），不写纯样式镜像测试。

## 工作树与步骤

主审继续在codex/UX-DESIGNEER-20261110-review，产品在新独立agent/UX-PHOTO-INTERACT-20261110-luna-max和对应同名工作树。冻结合同后再交执行者。产品先交图书馆和新组件节点，后交接入/测试节点；主审纳入提交后实看，失败由原写入者修复。

执行者验证：git diff --check、TypeScript/build、新交互测试和相关旧组件回归，提交后报告SHA、路径、真实测试和限制，不合main。

主审最终运行npm run quality:gate -- --base-ref=85cc140f（Node24.15.0，显式Chrome路径）。不改原脚本/默认超时；若发现环境或旧测试问题，先保留失败记录并定位，不绕过断言。

五小时额度已刷新，主审定期检查；剩30%即保存并暂停。不得重复工作耗完预算。完成则更新当前GitHub改造分支，仍不合main、不改仓库可见性；发布包与源码保持同一提交。最终交付明确实际覆盖和限制。
