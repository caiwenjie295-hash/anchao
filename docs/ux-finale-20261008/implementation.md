# UX-FINALE-20261008 实施记录

## 实现范围

- `T08_KITCHEN_ESCAPE` 的“难以确认的恐惧”段使用 `IMG_A4_FINALE_FEAR_001`，保留原段落和相邻退场段的既有映射。
- 实际 `Act4NarrativeReader` 的 `T09_BROADCAST` 接入逐句演出：开头两句沿用 `IMG_A4_T09_004` 远景，随后进入数米外的 `IMG_A4_FINALE_DOOR_001`，第四个广播词前切换到接近门槛的 `IMG_A4_FINALE_DOOR_002`，并随句推进增加模糊度。原文“我倒在地上，慢慢闭上眼睛……”出现后才显示 `IMG_A4_FINALE_SURROUND_001`，并保持到“回收完成。”。
- 演出只使用组件局部状态，不改小说正文、schema、domain 或公开剧情动作。既有藏笔记与走出门动作仍由原门槛控制；只有逐句读到结尾或显式确认已读完整原文后，才开放阅读器的继续动作。
- 组件提供上一步、从头重看、原文折叠阅读及显式完成按钮；缺图时仍可继续读，并给出图像替代说明。按钮、原生 `details/summary`、实时字幕具备语义与键盘操作；窄屏布局允许换行，减少动态偏好下移除滤镜过渡和缩放。

## 图片来源与转码

四张源图由父方按冻结提示生成，保存在开发包根目录 `UX-FINALE-20261008-validation/assets-source/`；提示记录为 `UX-FINALE-20261008-validation/imagegen-prompts.json`。源图均为 1672×941 PNG。执行者只用 Pillow 12.3.0 以 WebP quality 88、method 6 转码，未裁切或缩放；发布文件位于 `src/assets/ux-finale-20261008/`。

| 资源 ID / 文件 | 使用位置 | 发布字节 | 发布 SHA-256 | 源 PNG SHA-256 |
| --- | --- | ---: | --- | --- |
| `IMG_A4_FINALE_FEAR_001.webp` | T08 厨房回望 | 122,652 | `4052FC6D4B1603BE1126BBAEC7B607D53DCF246C033990C0503D552ACA525416` | `10C4372A88D9AA39FC71FF4F0086476694C80A1CD3A27E2AEBBE918C611EF6B2` |
| `IMG_A4_FINALE_DOOR_001.webp` | T09 门外数米处 | 218,008 | `EEE32DFE718FDF7D3559C21A8247B878B271D9972CA9CA7A677BBAB967A67D79` | `FEB69CDD7DAF149FB8AB886AEC548E58FE2DC7A038A573ED450E1600F1F416D8` |
| `IMG_A4_FINALE_DOOR_002.webp` | T09 近门槛、逐渐失焦 | 92,412 | `A11F2938D1A91D7EB2F0426C5A2175CD2FCE76631806C85A4C6CF5604BBB087D` | `45FA1B6C2E50162118368BD565A12CCA4FC306B314D767BAF56314C196258B59` |
| `IMG_A4_FINALE_SURROUND_001.webp` | T09 倒地后的第一人称视角 | 60,172 | `1CB736E7BACFE97E7DBE95409AE5C77A953D0625927440EE5FC10FEC9709B6D4` | `C2D6CA84631EC0C4E2111937390D05249FE55BE0EDD2E2BAE9C778A5E5FA687B` |

## 验证

- Node.js `v24.15.0`、npm `11.12.1`。
- `npm ci --engine-strict --prefer-offline --no-audit --no-fund` 最终重跑退出码 0（添加 82 个锁定依赖）。首次清理时父方 5396 QA Vite 仍占用 Rolldown 原生文件，报 `EPERM unlink`；父方停止该服务后，未改依赖清单再次安装成功。
- 定向 Vitest：新增广播演出、`act4Presentation`、`assetLoader`、`Act4ReaderBehavior`、`Act4LaterExperience` 五个测试文件，29 项通过。
- `npm exec -- tsc -b --pretty false` 退出码 0；`npm run build` 通过。构建输出包含四个独立、带 hash 的 WebP 资源；没有将图像内联进 JS。Vite 报告现有应用 JS chunk 超过 500 kB（1,063.11 kB，gzip 318.77 kB）。
- 暂存后使用 `git diff --cached --check`；父方继续执行完整门禁及宽屏、窄屏真实浏览器验收。

父方继续执行完整门禁及宽屏、窄屏真实浏览器验收。
