# 暗潮：电脑端改造云端交接

更新：2026-11-10。**这是进行中的改造检查点，尚未全部验收完成。**

仓库：<https://github.com/caiwenjie295-hash/anchao>（私有）。
接续分支：`codex/UX-DESIGNEER-20261110-review`；不要使用旧main作为本次改造源码。

下一步必须先读：[下一步参考与实施清单](docs/ux-designeer-20261110/下一步参考与实施清单.md)。逐项列明指定网站/作品、借鉴点、应用位置、实现顺序与验收标准。

本地改造源码：`/Volumes/IOS开发/解密网页游戏/暗潮-Mac开发包-2026-10-13-78787aba/_worktrees/UX-DESIGNEER-20261110-review`。对应源码压缩包位于外层`01_最新交付/`，名称含“电脑端改造-云端接续”，包含压缩图片和交接说明，不含Git历史或依赖安装目录。

## 用户要求与当前状态

- 电脑端优先，手机端暂不专项处理。
- 虚拟桌面禁止修改：壁纸、图标、任务卡、Dock与窗口外框已经恢复原样，并用同尺寸截图对照。
- 已实施第一轮：开场照片/片名错峰入场；六应用内部视觉；调查页墨蓝工具栏、主次按钮与暖纸特写；章节/进度面板的分隔；A2/A4阅读层。
- 最后收口和验证结果见 `docs/ux-designeer-20261110/implementation.md`、`validation.md`。不得把基线测试或局部测试写成最终全量验收。
- **新增但尚未实施**：鼠标聚光调查遮罩、互动拍立得特写、图书馆边框/间距专项。后续从这里继续，不要误认为已完成。
- 原剧情、Flag、schema13、资源ID、素材、小说文本与主线推进保持原样。

## 新增三项的具体接续方向

1. 调查照片上显示半透明黑色提示遮罩，提示“移动鼠标调查”；鼠标扫过局部亮起。保留既有高亮热点及键盘操作，不强迫擦开照片，不自动发现线索。连续指针值用ref/CSS变量等处理，不逐帧重渲染整棵React树。
2. 重点整理图书馆目录、书架、正文、翻页工具之间的边框与间距。减少层层卡片，统一内容内距、区块间距与工具分组，保证普通电脑窗口内可用。
3. 点高亮热点后，在现有细节界面展示拍立得式照片：暖白纸边、较厚底边、保留原标题和线索说明，轻微指针倾斜、离开复位；保持关闭/Esc/回焦，减少动态偏好关闭跟随与倾斜。

参考：

- <https://designeer.xyz/finds/burakaslan-2118755268502896747>
- <https://designeer.xyz/finds/heydamir-2115063463063998736>
- <https://designeer.xyz/finds/adityasur11-2111313755112137098>

借鉴交互与版式，不复制参考站的图片、标识、人物或代码。

## 云端启动

先选择上述分支，再阅读 `AGENTS.md`、`维护导航.md` 和 `docs/work_orders/工单/UX-DESIGNEER-20261110.md`。后续实现遵守独立分支/工作树和文件所有权，不直接改main。

运行环境以 `.node-version` 为准：Node **24.15.0**，npm 11.x。

```sh
npm ci --engine-strict
npm run dev -- --host 0.0.0.0
```

```sh
npm test -- --testTimeout=20000
npm run build
npm run build:offline
npm run test:offline
```

完整门禁 `npm run quality:gate` 还需要可用Chrome；Linux可设置 `ANCHAO_BROWSER=/usr/bin/google-chrome`。仓库已有工作流，分支推送本身不等于CI已经运行。

## 图片与关键路径

压缩图片是普通Git文件，已随分支包含，**无需从本机额外拷贝，也不是LFS占位文件**。

- `src/assets/compressed/`：既有压缩图片/图集及 `asset-map.json`，约41 MiB。
- `src/assets/` 下其他正式WebP目录：后续调查与场景图片；总计272份受Git跟踪的WebP。
- `src/assets/audio/`：既有背景音乐。
- `src/core/assetLoader.ts`、`src/assets/compressed/asset-map.json`：保持现有资源解析，不另写远端图片地址。
- `src/design/theme.css`：仅应用内部与场景的主题、开场、通用按钮/面板；不要把token放回`:root`影响虚拟桌面。
- `src/design/applications.css`：六应用内容。
- `src/design/evidence.css`：调查/阅读/高优先级样式覆盖。
- `src/components/PhotoViewport.tsx`、`src/components/investigation/InvestigationDetail.tsx`：调查遮罩与拍立得的候选接入点。
- `src/scenes/act4/Act4NarrativeReader.tsx`：第四幕阅读呈现；不能改原文、分页预算和高水位规则。
- `docs/ux-designeer-20261110/fixture.html` 与 `viewport.html`：开发用隔离内存存档预览，不读写玩家正式存档，不进入正式构建入口。

`node_modules/`、`dist/`、离线生成包和本机日志不上传。云端通过源码重建。
