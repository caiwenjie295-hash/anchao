# UX-DESKTOP-20261005 实现记录

实现已由父审查并合入本地 `main`，功能合并节点为 `e539d50d4ce63354378384c9ab7f660cb5bb6e8c`。本批只调整桌面提示卡、桌面图标布局和现有壁纸的引用方式。

`App.tsx` 现在按“调查”窗口的状态决定是否保留 `DesktopTaskCard`：窗口处于 normal 或 maximized 时，即使焦点切到其他窗口，提示卡仍保持挂载，卡片的展开和暗示状态不会因重新挂载而清空。宽屏提示避开调查窗口标题栏，并在窗口靠近屏幕底部时转到标题栏上方；最大高度与实际位置一起受视口和任务栏边界限制。窄屏提示停靠在任务栏上方，图标区域相应预留空间，调查页面顶部的三个内容入口保持可用。

桌面图标使用 CSS Grid 列优先流向，正常高度从左列顶部向下排列；高度不足时填满当前列再创建下一列。图标容器独立滚动并受限于桌面宽度，避免文档横向溢出或与右侧提示重叠。

壁纸由 `App.tsx` 显式导入 `desktop-wallpaper.webp?no-inline`，并以行内 `backgroundImage` 设置。Vite 生成的 URL 随 `app.js` 解析，因此离线包内的图片与脚本同处 `assets/` 时会解析到正确文件；`imageAssets.css` 不再保留原先多退一层的图片路径。壁纸仍使用居中、cover 显示。原始 JPEG `src/assets/desktop-wallpaper.jpg` 为 1,601,144 bytes，SHA-256 `86316098369820B22CE0265E8D0149EBB321FF5F1D33B4ACA004F6F7D74D3642`；发布 WebP `src/assets/compressed/assets/desktop-wallpaper.webp` 为 776,594 bytes，SHA-256 `4B90611727FDB8D63875DAE7353E47054266AC2A663E81CF99014949183A72EF`，与基线 Git blob `04e0388d4f5b1a936987fd5d7c86b3aba0828db2` 一致。

## 验证

- `git diff --check`：通过。
- `npm run build`：通过，TypeScript 检查完成，Vite 转换 289 modules。
- `npm run build:offline`：通过，生成 `暗潮离线/index.html` 与 assets，共 144 个文件、42,911,482 bytes（40.92 MiB）。
- 静态资源核对：离线 `assets/desktop-wallpaper.webp` 存在；`assets/app.js` 包含相对脚本 URL 的 `desktop-wallpaper.webp` URL 构造；`assets/app.css` 不再包含错误的 `../desktop-wallpaper.webp` 引用。
- 按用户要求，未编写/运行游戏测试、Vitest、offline 游戏验收或浏览器试玩；构建结果不代表交互验收。
