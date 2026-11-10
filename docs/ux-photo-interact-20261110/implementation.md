# UX-PHOTO-INTERACT-20261110 实施记录

状态：进行中；第一、第二节点的产品接入已完成，等待主审最终浏览器/离线质量验收。

## 第一节点

- 为第二幕图书馆建立局部 8/12/16/24/32px 间距刻度；目录、书架、书页与阅读工具采用分栏、内距和细线分组，减少盒中盒。
- 新增 `src/design/photoInteractions/InvestigationSpotlight.tsx` 纯展示叶子组件。组件以稳定的照片 frame 为坐标，用 CSS 自定义属性和 `requestAnimationFrame` 更新指针；支持 reduced-motion、触控/粗指针与缺失 `matchMedia`/`requestAnimationFrame` 的静态或定时回退。当前尚未接入 PhotoViewport。
- 新增聚光指针节流、清理、媒体偏好、静态回退和提示淡出测试。
- 未改变书架热点坐标、照片比例、目录/卷册/翻页/书签状态或虚拟桌面。

## 第二节点

- `PhotoViewport` 增加默认关闭的 `investigationSpotlight` 可选 prop；只在第三幕显式启用，聚光层按资源 key 重建并使用照片 frame 坐标。热点、工具与手势仍由原处理器管理；键盘可见焦点减弱遮罩，鼠标继续移动后恢复局部亮起。
- `PolaroidPhoto` 用于第三幕有独立细节图的热点特写及第一幕独立线索照片。卡片有暖白纸边、厚底边与柔和投影，指针倾斜限制在 ±3°，移出复位；照片比例、alt、标题/说明保留，长转录保持静止在卡片之外。
- 第一幕普通背景裁切分支未包装；第三幕原蓝色热点、缩放、拖动、观察时机和弹层关闭/Esc/焦点约束均未修改。
- A2 页缘热区强制保持透明无边框，仅 hover/focus 显示折角线索；A4 活跃阅读段与封面添加 scroll margin，为 sticky 翻页条留出自动焦点空间。

## 后续节点

- 主审进行 1280/1440 宽屏实看与完整网页/离线质量门禁；本记录不代表最终视觉验收。

## 验证

- 第一节点 `git diff --check`、`InvestigationSpotlight.test.tsx` 与 `LibraryResearch.test.tsx`：通过；17 项。
- 第二节点 `PhotoViewportSpotlight.test.tsx`、`PolaroidPhoto.test.tsx`、`InvestigationSpotlight.test.tsx`、`SceneClueFocus.test.tsx`、`LibraryResearch.test.tsx`、`Act3Investigation.test.tsx`：53 项通过。
- Node `v24.15.0` 下 `npm run build`：通过（520 modules）；保留既有主 JS chunk 大于 500 kB 的 Vite 提示。第二节点 `git diff --check`：通过。
