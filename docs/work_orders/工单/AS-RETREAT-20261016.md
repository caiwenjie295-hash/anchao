# AS-RETREAT-20261016 往回走补图与子目录包

基线 main ba911310f960b3b5d5074550674cbdfa044fca45。用户明确要求补最后逃离的缺图后生成可从 /AnChao/ 启动的上传目录；延续 Luna max 生图授权。

## 冻结定位与范围
T08:T08_KITCHEN_ESCAPE 第三个场景 T08_KITCHEN_RETREAT「往回走」，现有 BLOCK_PAGE_ART 第三项 undefined。仅补该项。原段落9–12：受伤主角一瘸一拐上楼记录，抵达禁闭区和教室区交界，转角听见身后脚步，随后摔倒。图片是摔倒前、凌晨室内往出口走的第一人称照片，不描绘额外追赶者或揭示身份。

## 资源接口
新增公共资源 IMG_A4_FINALE_RETREAT_001（本工单明确授权此单个新增ID），横向约16:9、优先1672×941，不透明PNG原稿；发布 src/assets/ux-finale-20261008/IMG_A4_FINALE_RETREAT_001.webp。data/images.json 标记act4/A4_T08/scene，assetLoader uxFinale列表注册该ID。封面替换 undefined，alt「王澳拖着受伤的腿沿走廊撤离，转角处视线模糊」。放大入口若无独立近景则使用原图（act4IllustrationDetailAssetIdForSource(coverAssetId!) ?? coverAssetId），现有近景不变。仅生成这一张，不另造近景。

风格：普通手机随手拍、低饱和低对比、中性白平衡、自然柔和曝光，轻微失焦/摇晃。便宜旧校舍仍在运营，米白上墙/灰绿下墙、完整墙门设备、干燥整洁地砖；不可废墟式大片剥落、落叶、积水、霉斑。不要可读文字/密码/身份、不要怪物或额外人物/血腥。可有边缘手和难辨小笔记本，不增加线索。可读取现有前后图作为风格参考，最多2张参考，不加载历史全集。

## 唯一写入者
Luna执行：独立 agent/AS-RETREAT-20261016-luna 分支，工作目录 ../AS-OPS-20261015-art；只写上述新WebP、docs/as-retreat-20261016/art/**（prompt先落盘、native保存、账本）、data/images.json、src/core/assetLoader.ts、src/data/narrative/act4Presentation.ts、src/data/narrative/act4Presentation.test.ts、src/scenes/act4/Act4NarrativeReader.tsx，及必要的该场景现有行为测试。开发包 assets/as-retreat-20261016/** 仅Luna写。PROGRESS.md仅父写，Luna报告保存路径/检查结论即可。不得修改本工单。
父集成：独立 codex/AS-RETREAT-20261016-integration 分支；只写本工单、docs/reviews/AS-RETREAT-20261016.md、docs/as-retreat-20261016/validation/**、维护导航.md；子提交后单向集成；统一验收、main合并和外层发布包/上传包/PROGRESS/release-main.json由父负责。
所有其他原图、旧art/native、剧情正文、Flags、schema、存档、无关代码禁止写入/删除。禁止删除已生成图片和历史分支。不得连接腾讯云写入。

## 实施与验收
1. Luna读取AGENTS/导航/本合同；保存完整prompt后内置imagegen一次调用，返回立即复制到项目art/native和开发包assets；不输出编码。全尺寸视觉检查后编码WebP，记录hash/尺寸/工具/采用情况。
2. 连接资源和封面，添加针对缺图回归：第三个场景有可用资源且紧邻场景仍保持原映射；若调整放大回退须有实际浏览器覆盖。执行相关测试，git diff --check，提交只报告SHA/路径/结论。执行者不得合并main。
3. 父审diff/所有权；npm test -- --testTimeout=20000、build、build:offline、默认test:offline两轮、verify-offline-package、Chrome test:browser；真实1280×720/390×844该封面/放大/正文及前后段检查，无玩家存档操作。APPROVED后--no-ff入main。
4. 干净main新建独立上传目录，build --base=/AnChao/，校验所有入口/动态资源路径及HTTP200，实际浏览器生产包启动。更新上传说明/逐文件校验/PROGRESS及release-main。保留旧目录，用户自行上传服务器。

交付：Luna报告分支SHA、精确修改路径、原生PNG/WebP/prompt路径与hash、测试、遗留。父报告新图片/上传文件夹/地址与必要结论。
