# UX-RHYTHM-20261006 MEDIA 交付

## 完成内容

- T07 环境声改为本地 Web Audio 合成：低音量雨声与远风循环底噪，间隔稀疏的软键盘轻响。页面默认静音，只有玩家按“开启环境声”后才创建 AudioContext；无法播放时继续保留调查文本与幕末字幕。开关状态只记在 `localStorage` 的 `anchao.ui.t07AmbientAudioEnabled` UI 偏好键，不进入游戏存档。关闭、退出调查、回看资料、进入第三幕和组件卸载都会停止声音、计时器与旧 AudioContext。
- 公共可选接口位于 `src/media/investigationAudio.ts`：`investigationAudio.setEnabled(boolean)`、`investigationAudio.play('keyboard')`、`investigationAudio.stop()`。开启函数必须在真实用户手势中调用；没有 Web Audio 时返回 `false`，不影响无声路径。
- 移除了 T07 黑场上单独显示的“键盘声 / 雨声 / 风声”演出标签。原有三句落幕文字仍按现有节拍逐句显示，用户可以完整无声阅读。
- PhotoViewport新增 `explorationMode` 与 `revealBeat` 可选表现 props。A3 调查壳层可用 `explorationMode` 开启照片内边缘暗角和较低调的缩放控件；阅读、对照照片默认保持原亮度。普通换镜头使用 260ms 淡入淡出，显式 `revealBeat` 使用 420ms；`prefers-reduced-motion` 下即时切换。镜头/剧情状态不等动画，包含比例与热点坐标算法不变；切镜头后将焦点恢复到同 ID 热点或观察框。
- 新增三张第四幕氛围图，READER已确认消费位置：`IMG_A4_BLOG_WINDOW_001` 作 T03 私人动态页资料头图，`IMG_A4_FINAL_READING_001` 作 `T10_FINAL_MAIL` 段首阅读环境封面，`IMG_A4_READING_DETAIL_001` 作 T08“镜面中的人”转折前的独立封面。它们只补充环境，不表达文字答案或未发生事件。
- 资源按冻结路径新增：源 PNG 在 `src/第四幕/UX-RHYTHM/`，发布副本在 `src/assets/compressed/ux-rhythm/`。发布 WebP 合计 **155,426 B**；源 PNG 合计 **5,395,491 B**；没有新增音频二进制，播放时在本地即时合成。`data/images.json` 与 `asset-map.json` 只追加这三个 ID 和三条映射。assetLoader只为这三个精确 ID 与对应 PNG 文件名增加路径候选，既有路径和顺序不变。

## 验证范围

执行 MEDIA 定向行为测试、TypeScript 项目检查与 `git diff --check`。完整 Vitest、生产构建、离线构建/流程与真实浏览器宽窄屏验收由父级统一执行；本地不运行整套门禁。

## 边界

- 第四幕组件由 READER 消费新增 ID；MEDIA 不写第四幕组件或原文。
- 第三幕 `Act3Investigation` 的两项 props 由 FLOW 唯一消费；普通移动不设置 `revealBeat`。
- A1 实景组件使用既有自绘场景框，不消费 PhotoViewport，本批没有将其迁移到共用查看器。
- 音频依赖浏览器原生 Web Audio，不请求网络资源；不支持 Web Audio 的设备继续显示可用的无声文字路径。
