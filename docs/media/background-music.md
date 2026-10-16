# 背景音乐接入预留

用户正在选曲，本轮只预留 `src/media/backgroundMusic.ts`，没有实现播放。默认配置：`track: null`、`volume: 0.2`（范围 0–1）、`loop: true`。`BackgroundMusicTrack` 保存曲名 `title` 和构建后资源 URL `src`，`BackgroundMusicConfig` 是后续接入的统一配置入口。

模块不被入口/App 引用，不创建 Audio/AudioContext、不请求文件、不读写存储；现有第二幕 T07 调查环境声保持独立。当前上传包仍是 `暗潮网站-b7fa3916-AnChao`，这次无需重新上传。

## 用户选曲后再做

1. 根据用户提供的音轨和播放范围保存正式资源；以 `?url&no-inline` 导入本地音轨并填入配置，避免硬编码 `/assets/`，同时检查 `/AnChao/` 和 file 离线包。
2. 实现用户交互后的播放、循环、暂停/静音和音量控制，处理 `play()` 被浏览器拒绝的情况；具体控件和淡入方式届时确认。
3. 明确全局音乐与 T07 环境声的共存规则，音量偏好独立于剧情存档，切幕/卸载及时清理。
4. 检查音轨是否进入首屏预加载清单与离线包、失败是否阻断启动；完成播放/静音/循环和宽窄屏验收后重建上传目录。

以上均为待办，填写配置本身不会启用音乐。验收记录见 `docs/reviews/BGM-INTERFACE-20261016.md`。
