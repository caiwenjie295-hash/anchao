# 当前检查点

2026-11-10，Asia/Shanghai。状态：实施收口中；五小时最近检查剩46%，剩30%立即暂停。

- 主审工作树：本目录所在仓库，分支 codex/UX-DESIGNEER-20261110-review。
- 产品工作树：同级 UX-DESIGNEER-20261110-luna-max，唯一产品执行者 Luna Max。
- 原main保持3d3ec299，无改动，不合并、不部署。
- 已纳入产品：dbde55f、ace98e2、09be0ab（主审cherry-pick SHA不同）；最后一项专门恢复虚拟桌面。
- 用户优先级：只重点电脑页面；虚拟桌面全部恢复原样。按钮与卡片/面板分隔仍是核心改造项。

## 已独立复核

原版679项全通过；第一批开场/章节/进度相关23项通过。新开场/桌面恢复/章节开关与回焦；A3头栏/导航/暖纸特写、观察计数、选中热点蓝色、125%放大与100%复位；A2地方志选择→取册→正文；A4翻页高水位；照片曝光调节→恢复；微信读母亲→邮件→浏览器搜索跨应用推进，均已在真实浏览器操作。截图在validation.md所列目录。

## 收口与剩余

执行者正在修正A2/A4部分旧按钮覆盖、邮件日期/星标空间、浏览器和调查普通窗口密度，并改善A4宽屏阅读工具可达性。收到最后提交后检查diff，运行完整门禁，再复看相应页面及六应用、进度关闭按钮。不要重复基线全量或重新盲测。未完成则如实记录并暂停。

## 运行与定位

Node：`/private/tmp/node-v24.15.0-darwin-arm64/bin/node`；设置该bin到PATH最前。review工作树node_modules为忽略目录，内部依赖链接原仓库。

现有隔离开发服务为127.0.0.1:5340，review树。预览路径 `/docs/ux-designeer-20261110/viewport.html?width=1280&height=800&mode=desktop`；width可1440，mode可opening/photo-editor/library/bridge/school/finale/a3-t04/a4-t05等。浏览器侧栏无法稳定设置精确尺寸，iframe实际body宽度已经验证；截图fullPage后clip到对应尺寸。操作可使用当前AX索引的pressKey(Return)，原页面鼠标操作正常；外层侧栏裁切时不可把点击定位失败误报产品故障。

最终门禁使用 `ANCHAO_BROWSER=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，现有quality:gate包含全量分组测试、双构建、默认双轮离线与file浏览器检查。需联网/打开本机端口的命令已使用正常授权的提权；不改仓库默认版本或超时规则。
