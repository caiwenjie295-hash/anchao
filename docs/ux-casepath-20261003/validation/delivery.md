# CASEPATH 夹具与离线步骤交付

范围：`docs/ux-casepath-20261003/validation/**` 仅供本地检查的真实 whole-App checkpoint 夹具、存档隔离 helper/测试/说明，以及 `scripts/verify-offline.mjs` 中 T06 可见标签和两人切换/来源返回步骤。正式 `App`、状态模型、剧情 Flag、schema 和页面原文不由此夹具修改。

fixture 使用默认的 860×560 浏览器窗，并可选最大化和手机尺寸检查。关键 checkpoint 经 `hydrateState` 保存/重载检查；A3 T04 与 A4 T05 的旧进度/当前未完成状态已作为专门断言。重挂载从内存 StateManager 当前序列化存档还原，并检查 fixture session 键隔离。父级整体验收及 A34 的独立回归仍待合并前执行。

浏览器路径、选人标签、来源动作和离页返回定位见本目录 [README.md](README.md)。
