# AS-QUALITY-20261008 · 场景照片自然材质重生

基线 main 34aab6a3a4c0eab7ae86c52abdea837111186e1f。只用原 /root/ux_scene、gpt-6-luna/max 执行资产集成；新 branch agent/AS-QUALITY-20261008-textures、新 worktree 暗潮-worktrees/AS-QUALITY-20261008-textures。不得继续旧已交付任务，不操作其它代理和旧 automation。

## 目标

148张映射剧情照片视觉检查，19张墙面/地面均匀鳞片微纹理最明显的素材重新生图，保留其它129张和有意失焦。父方负责原图检查、内置 imagegen 每素材一次独立生成、选择与原图备份；执行者只使用 root validation/replacement-plan.json 中 approved=true 的 native 源图进行精确替换，未批准或缺失的素材不得提交。不得用滤镜/降噪/平滑替代重新生图。原图已备份 root validation/originals。

保持全部相机几何/比例、色调、线索、手/人物/道具、场景位置。重点消防栓轮/管/箱后缝、笔记和胶带、铁门窗口与送餐口、楼梯/栏杆、厨房铁钩与神龛、禁闭室三个圆孔/床/水盆。旧潮湿氛围由水渍、灰尘、局部大剥落体现，消除过密均匀鱼鳞/蜂巢/重复微循环、油画/过锐化伪纹。天然落叶、真实金属/瓷砖/正常不规则损坏应保留。不能添加剧情文字、符号或新线索，不能修正有意身份记忆冲突。

## 所有权

执行者唯一可写：replacement-plan.json 精确列出的19个 sourcePath 和19个 path（都是已存在的PNG/JPG源图与对应WebP），docs/as-quality-20261008/**（新实施/替换账本/全部提示词/生成来源及转码参数）。JPG保留真实JPEG格式，PNG保留PNG；尺寸/比例必须与原图一致。允许用Pillow正常格式转换/高质量等比尺寸转码，不允许滤镜、裁切、补画；若模型改变画幅或比例须报告父方拒绝重生。WebP92/method6，JPEG源quality98/subsampling0，不运行旧全量压缩脚本，不改历史账本。

父方可写：本工单 docs/work_orders/工单/AS-QUALITY-20261008.md、docs/reviews/AS-QUALITY-20261008.md、维护导航.md、docs/progress_log.md、docs/changelog.md、docs/todo.md；root AS-QUALITY-20261008-validation/**、发布包和release-main.json。执行者不得改上述父所有权文件。

其余全部只读：剧情/数据/资源ID/映射/assetLoader、全部TS/TSX/CSS/测试/配置、小说HTML/PDF、非授权源图、旧worktree。实际32项个人dirty和991条非授权tracked index冻结于protected-baseline.json，不得碰触个人原始src/第二幕、src/第三幕/1(n)图。

## 验收

必读AGENTS、维护导航、协作Git流程、game/04、本工单。每图记录原图/新图SHA256、源/输出尺寸字节、native路径、prompt、原有ID与用途，新增账本取代这19项资产当前版本信息但不改历史记录。记录19替换/129保留的检查边界（contact全量+selected full-resolution），不虚称逐像素检验。

Node24.15.0/npm11.x，portable runtime在REF-MAINT-20261006-validation/runtime/node-v24.15.0-win-x64/node.exe，npm子进程PATH必须前置其目录。安装npm ci --engine-strict --prefer-offline --no-audit --no-fund。执行者检查19源图/输出文件格式、尺寸、实际asset-map正确、构建、diff --check后提交fix(AS-QUALITY-20261008)，报告路径/提交/验证并停止；不用编写复制实现的测试。

父方审查全部19原图新图、关键点/连续空间；统一四门禁npm test -- --testTimeout=20000、build、build:offline、test:offline，已有Chrome file启动；真实宽1280×720/窄390×844核对第三幕走廊消防栓/铁门/厨房与第四幕禁闭/最后清醒照片显示及原交互。APPROVED后--no-ff合本地main，从main干净源重建网页/离线发布包、5339测试地址，核对32dirty/非授权991index及原PDF/HTML。

实际Codex300分钟窗口<=10%立即停止父开发并中断本任务原执行者运行turn；保留全部文件/提交/运行测试，在本任务quota-state.md记实际pause/reset/阶段/todo；只有实际>10%恢复原agent/model/worktree。用量不可读不可推断恢复，不买额度或用重置券。
