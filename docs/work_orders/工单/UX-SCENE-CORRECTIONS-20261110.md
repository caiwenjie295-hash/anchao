# UX-SCENE-CORRECTIONS-20261110 用户截图四项纠偏

基线eb970196；用户明确要求修正第一幕山腰破庙图框背景、按钮断行、第一章初入图片丢失，以及真正鼠标擦除黑色半透明层/靠近调查点白光增强。电脑端优先，原虚拟桌面禁止修改。旧聚光只A3且光圈跟随不能满足本次擦除需求。

唯一产品写入Luna Max，独立新agent/UX-SCENE-CORRECTIONS-20261110-luna-max工作树。主审只合同/文档/验收/集成。所有原剧情/Flag/schema/资源ID/素材字节/热点坐标/原观察动作/关闭回焦均保护。

允许产品写：src/design/photoInteractions/**（可新增ScratchVeil与行为测试）；src/design/evidence.css；src/scenes/act1/Act1SceneExperience.tsx；src/scenes/act1/act1InteractionGuidance.css；src/components/PhotoViewport.tsx（缓存load竞态可修正，既有算法/坐标不改）；src/design/theme.css（仅有证据时开场图显示修复）；docs/ux-scene-corrections-20261110/implementation.md。原测试不改；可在photoInteractions下新增行为回归。禁止桌面外壳/core/story/data/assets/package/scripts等路径。若确认asset映射缺失先报告，不擅改资源表。

规则：A1图片两侧容器透明或与A1页面同色，完整比例保持，不扩图。A1动作按钮white-space:nowrap + flex-shrink:0，允许动作组换整行/说明另占行；不用固定宽挤压按钮。检查首次从开场/旅程进入首场景（不是只检查破庙checkpoint），排查资源/缓存/失败状态；已有PhotoViewport被动effect清load存在缓存竞态可在允许文件内修，需真正缓存回归。

擦除遮罩：A1有热点照片与A3调查照片均开启（无热点照片不强塞层）。鼠标移动无须按住，扫过留下透明痕迹直到换图（可canvas destination-out，软笔刷，DPR/resize不残留错位）；层pointer-events:none，不阻断原热点/拖动/缩放/键盘。不设置擦除百分比门槛，不自动观察。靠近原热点DOM可见区域时白色光晕随距离平滑增强（例如160px起，边缘最强），原坐标/按钮语义与蓝色已选状态不改，需在真实照片上看得到。连续值ref/CSS/rAF，不逐帧React状态或游戏写盘；换图/卸载清理监听/帧。减少动态/触控静态可直接点热点，键盘focus-visible给白光，不依赖擦除。

执行顺序：先交A1底色/按钮/首次图片定位修复的小提交，再交擦除+光晕。每节点立刻报告SHA，别等完整gate。Node24.15.0 targeted新增/旧组件回归+build+diff-check。主审纳入后实际1280/1440 UI验收、最终完整quality gate/离线和推送；不合main。五小时剩30%须保存暂停（开工剩39%，预算有限），不得超线继续或重复测试。

主审允许文档：本合同、docs/ux-scene-corrections-20261110/除implementation.md、docs/reviews/同任务md、维护导航/CLOUD_HANDOFF及progress/changelog/todo。其余只读。最终报告明确已实施/未实施/实际测试和加载定位证据，不能用旧门禁代替新验收。
