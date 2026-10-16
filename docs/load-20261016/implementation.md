# LOAD-20261016 实现记录

## 启动加载

`src/startup/download.ts` 按响应流逐块累计真实字节，使用 60 秒无数据活动期限；每个文件最多尝试三次，网络中断、停滞、HTTP 408/429/5xx会短暂退避后重试。404/403等确定性HTTP错误立即结束。文件大小或SHA-256不符时分类为完整性错误，并绕过旧游戏缓存重取一次。单次失败尝试的临时字节会回退，成功缓存资源计入已加载量但不会增加网络流量或下载速度。

`src/startup/metrics.ts` 分开统计已校验字节、本次真实网络字节和未校验的当前文件进度；速度使用最近3秒网络流量，并在静默、失败或完成后归零。首屏 `index.html` 显示总大小、已加载量、十进制 KB/s以及可读错误详情；相对文件路径经文本节点写入。清单和入口版本分别提示重试或刷新。所有资源大小与哈希全部通过后才解除启动壳。

预加载请求带 `X-Anchao-Preload: 1`，使 `public/anchao-preload-sw.js` 绕过可能陈旧的同版本缓存；缓存读取异常退回网络请求。工作线程仍仅处理游戏 base 内的静态 GET。未改缓存命名、剧情数据或玩家存档。

`scripts/startup/manifestPlugin.mjs` 从必需资源清单排除 Markdown、README/许可说明、开发文档目录和常见系统杂项。原 `public/` 文件保留并照常复制；独立 HTML 小说、音频、字体、图片、JS、CSS等运行资源仍按字节数和 SHA-256 全量校验。这样上传包缺少本地 README 不会阻断启动。

## 循环音乐

原 OGG 逐字节复制为 `src/assets/audio/drmseq_06_High_Spires_loop.ogg`，大小 2,655,823 bytes，SHA-256 `d6af93937c028124a64ff69df9102d07b4ae9c6af12de36aaf4181ddfcaeb9a4`。既有 `backgroundMusicConfig` 通过 `?url&no-inline` 引用构建资源，标题为 High Spires，循环开启，默认音量 0.2。

`src/media/backgroundMusicPlayer.ts` 提供模块级播放器单例；`App` 挂载它一次，body 中可检查到唯一的 `<audio data-background-music>`。首次指针或键盘交互后尝试播放，浏览器拒绝时显示状态并允许菜单内显式重试。关闭偏好不会被后续普通点击重新打开。页面隐藏时暂停，返回时按偏好恢复；卸载会移除监听器、卸载媒体源并删除 audio 节点。独立 `anchao.ui.backgroundMusic.v1` 偏好读取/写入都受异常保护，音量与开关不进入剧情存档。

音量开关位于居中的章节选择窗口，range 使用原生键盘交互，纳入该窗口的焦点边界，控件点击/焦点目标至少44px。沿用现有深色绿灰配色与字体。

## 验证

- `tsc -b` 通过。
- 局部 Vitest：构建资源清单、启动下载、预加载、Service Worker、章节菜单和音乐播放器共6个文件、34项通过。
- `npm run build -- --base=/AnChao/` 通过；最终清单273项、82,925,597 bytes。README 仍保留在输出目录，但不在清单；OGG以独立文件进入清单且输出 SHA-256 与原文件一致。
- `git diff --check` 通过。

真实浏览器布局、首次播放与拒绝重试、隐藏/返回、跨幕稳定性和完整仓库门禁由主审继续验收。本实现不推送或部署远程服务器。
