# 背景音乐

用户已选定 High Spires 循环音轨并授权接入，覆盖之前“仅预留接口”的暂缓要求。正式源为 `src/assets/audio/drmseq_06_High_Spires_loop.ogg`，2655823字节、Vorbis双声道48kHz、约115秒；逐字节复制用户本地源文件，原件保留，SHA-256 `d6af93937c028124a64ff69df9102d07b4ae9c6af12de36aaf4181ddfcaeb9a4`，未生成/转码。

配置入口 `src/media/backgroundMusic.ts` 通过 `?url&no-inline` 引入本地资源，`volume: 0.2`（0–1）、`loop: true`。音轨作为独立文件进入网页预加载清单和file离线包，兼容 `/AnChao/`，不依赖原始Mac路径。当前发布目录和版本以开发包根 `release-main.json` 为准。

`backgroundMusicPlayer.ts` 提供模块级播放器与订阅，`App.tsx` 顶层effect挂载/清理，body下仅一个 `audio[data-background-music]`。首次点击/键盘有效交互后尝试播放，拒绝不阻断剧情，可在章节窗口“重试播放”。切幕/打开章节窗口不重建；隐藏页面暂停，返回时仅按用户开启偏好恢复；卸载清理音频、监听和待完成播放状态，支持StrictMode。

居中“章节选择”窗口包含开关、音量滑条和播放状态；关闭后普通点击不重启。设置通过独立 `anchao.ui.backgroundMusic.v1` UI偏好保存，存储不可用时仍可操作，不改变存档schema/剧情。原T07环境声独立保持，没有新增duck或混音规则。

新增验证分为播放器行为测试、真实浏览器OGG解码/原生尾部循环、0→1挂载清理、宽窄/短屏控件与原清零取消，以及网页/离线包资源hash。jsdom不解码或播放音频，离线回归仅在测试夹具中模拟媒体API，保留零运行错误及本地资源断言。实际范围与日志见 `docs/reviews/LOAD-20261016.md` 和 `docs/load-20261016/validation/coverage.md`。
