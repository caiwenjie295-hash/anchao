# UX-POLISH-ART-20261006 七张细节图片补充

> 状态：权威执行工单（执行者只读）
> 基线：4e1900a9b12bcc9685eb5d2dc23fe7ad299ffbb2
> 执行：gpt-6-luna / max；独立 worktree；禁止合并 main。

## 共用约束

先读 AGENTS.md、维护导航.md、docs/协作开发与Git工作流.md、UX-POLISH-20261006.md。本次用户授权四个 Luna/max 子代理；主审负责合并和最终一轮验证。不得另开子代理。实现阶段可运行 tsc、git diff --check、资源检查；不要各自重复运行完整测试/构建/浏览器门禁。可以编写必要的行为测试，交最终集成运行。

保留原小说字句、30项主工作区状态、141张已有原图、现有资源 ID、Flag、存档 schema 13 和剧情门槛；不修改 data/story_transitions.json 和原始剧情 JSON。微信模块、微信 CSS 及聊天交互冻结。保留桌面 Windows 壁纸、列优先纵向图标、调查 App 打开时常驻右侧卡片、A2→A3直接入口、A4呼应回顾、黑幕落幕和 VeinJay_C 署名。任何范围外需求先向主审发消息，不自行改共享文件。

视觉：克制的白灰调查界面，统一绿灰主色；正文16–18px（小说按阅读设置），次要文字至少12px；正文有宽度上限和行距；卡片减少重复边框；每阶段一项主动作。按应用实际容器宽度适配，390px和约800px应用窗口不能依赖整个浏览器宽度。按钮触控目标约44px、键盘可达、焦点可见，弹窗 Esc/Tab/关闭回焦；完整照片不裁切，热点使用图像平面归一化坐标。

最终报告：Role / Delivered / Commit SHA / Changed paths / Validation run / Deferred or blocked / Cross-boundary requests。只显式暂存允许路径，禁止 add -A、reset、格式化未分配文件，禁止提交 dist、node_modules、离线产物、日志、本机配置。

> 分支 agent/UX-POLISH-ART-20261006

## 执行与必须交付

使用 imagegen 技能（读 C:/Users/Jay Cai/.codex/skills/.system/imagegen/SKILL.md），默认内置image_gen工具。不能用脚本/SVG假装生成照片，也不能切CLI付费API。先view_image查看每个参考图；每张独立生成或编辑，输出逐一检查并copy进工作区。新文件不覆盖任何原图。生成时严格符合原场景物件/年代/风格，不添加新线索、血腥、神像超自然解释或假关键文字。

七个ID/路径和消费者见总合同。参考：
- 卷封面/旧纸：src/第二幕/IMG_A2_T03_001.jpg；同一阅览室书册、旧纸细节，留白，准确标题由页面渲染，禁止AI虚构文字。
- 笔记页边：src/第二幕/IMG_A2_T05_006.jpg；同一本笔记的纸页近景，重要双S由既有SVG叠加，不生成不同答案。
- 底座：src/第三幕/IMG_A3_T06_007.png + 第一幕破庙/黑补母图；同一空木神龛底座的近景，保留空处/材质结构，不能凭空加神像或新字。
- 禁闭：src/第四幕/T06/IMG_A4_T06_006.png；2014仍在使用，不是荒废旧址。维持三孔与翻盖送餐口、封闭空间，无人物暴力。
- 校园：src/第四幕/T08/IMG_A4_T08_002.png，配合原T08大学日常段（只读原文）；同季节普通校园一天、纪实安静，无身份新增。
- 逃离：src/第四幕/T09/IMG_A4_T09_001.png + 原T08厨房逃出后原文；同位置消防栓附近的低视角，无新情节、不将厨房作为该段封面。

发布副本：现有工具Pillow/压缩流程生成WebP，最长边约1440–1600、质量约80–85，纸张保证放大清晰；总发布体积目标≤2MiB。不能降质量到看不清或重新压缩141原发布图。用data/images.json新增记录、asset-map追加标准源路径；保持现有所有字段/行/条目含义不变。act4的file必须${id}.png以符合既有act4AssetPath。

## 允许写入

总合同7个原图路径与对应 src/assets/compressed/第二幕/*.webp、第三幕/*.webp、第四幕/T06或T08/*.webp（仅新ID）；data/images.json；src/assets/compressed/asset-map.json；docs/ui-polish-20261006/art/**。

禁止其他图覆盖/删除、组件/加载器/CSS/剧情/核心/全局docs。没有批准的新增图片ID不得注册。父与其他消费者只读本分支注册表。源PNG控制合理体积无需4K，逐图记录图像尺寸、bytes、prompt、参考、SHA、注册字段、消费建议。生成结果不符合年代/物件则返修，不用“氛围图”顶替。

## 验收

7个ID能被现有assetLoader加载；七张真实成果、参考一致；关键字形交代码层；新增发布体积符合预算；原141图片和原manifest条目未改；不把生成图留在Codex缓存作为运行依赖。只做图像/映射/bytes静态校验和diff check，不重复完整测试/构建。
