# T07 树林参考修复实施记录

本分支为 T07 的局部实现候选，未合并或部署。

## 素材来源

- 保留原生图：开发包 `assets/ui-hierarchy-20261019/native/IMG_A2_T07_TRAIL_REFERENCE_001-v01.png`，1536×1024，SHA-256 `6bf817499f9af896382780a6ecb880e8fb2710d3b976335341703fee25e204eb`。
- 复用已编码 WebP：来自 `回退与源码打包-20261020/未提交新增文件/src/assets/ui-hierarchy-20261019/IMG_A2_T07_TRAIL_REFERENCE_001.webp`，675,764 字节，SHA-256 `a81a0fdf3bfd143d0ac3f28eeafdd170b94bbff171f57348030068e98f178b07`。
- 产品文件为 `src/assets/t07-ref-20261020/IMG_A2_T07_TRAIL_REFERENCE_001.webp`，逐字节复用上述 WebP。本次没有生图或重编码，也没有恢复停止的美术 WIP。

## 行为

`comparisonReferenceForFrame` 仅在树林 `frameKind` 选择树林照片；石庙和受访者画面继续使用原 `IMG_A1_I_001`。来源行、图注、替代文本、参考说明及观察提示和标记位置随参照切换。树林对照区提供正向环境相似反馈、三步引导与下一步按钮：已有庙截图时切到该截图，没有时跳转视频并定位到庙画面时间窗。该按钮不自动截图或写入证据。

树林状态只通过组件即时状态展示；不显示石砌开口特征选项，也不调用对照提交。只有原正确庙帧配合 `square-opening` 才能按现有 `StateManager` 成功记录。帧 ID、时间窗、flag、stage、存档 schema 和匹配逻辑均未改变。错误图片维持不可观察、不可提交状态。

## 变更路径

- `data/act2_t07.json`、`data/images.json`
- `src/data/act2T07Data.ts`、`src/data/act2T07Data.test.ts`
- `src/scenes/act2/T07Investigation.tsx`、`src/scenes/act2/T07Investigation.test.tsx`
- `src/core/assetLoader.ts`、`src/core/assetLoader.test.ts`
- `scripts/startup/manifestPlugin.mjs`、`scripts/startup/manifestPlugin.test.mjs`
- `src/assets/t07-ref-20261020/IMG_A2_T07_TRAIL_REFERENCE_001.webp`
- `docs/t07-ref-20261020/implementation.md`

## 验证

- 定向 Vitest：4 个文件、30 项通过。
- `npm run build -- --base=/AnChao/`：TypeScript 与 Vite 构建成功，508 modules；启动 manifest 中树林 WebP 归组为 `act2`，文件 675,764 字节。Vite 有既有的 500 kB chunk 大小提示，不影响构建结果。
- `npm run build:offline`：成功生成 `暗潮离线/index.html` 与 277 个文件（80.30 MiB）。
- 浏览器宽窄屏实测、完整质量门禁和离线运行验收由主审独立执行；此记录不代表这些检查已通过。
