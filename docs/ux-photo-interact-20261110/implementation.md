# UX-PHOTO-INTERACT-20261110 实施记录

状态：进行中；首节点完成图书馆间距与聚光叶子组件，等待主审桌面复核；照片画面接入和拍立得展示仍在第二节点。

## 第一节点

- 为第二幕图书馆建立局部 8/12/16/24/32px 间距刻度；目录、书架、书页与阅读工具采用分栏、内距和细线分组，减少盒中盒。
- 新增 `src/design/photoInteractions/InvestigationSpotlight.tsx` 纯展示叶子组件。组件以稳定的照片 frame 为坐标，用 CSS 自定义属性和 `requestAnimationFrame` 更新指针；支持 reduced-motion、触控/粗指针与缺失 `matchMedia`/`requestAnimationFrame` 的静态或定时回退。当前尚未接入 PhotoViewport。
- 新增聚光指针节流、清理、媒体偏好、静态回退和提示淡出测试。
- 未改变书架热点坐标、照片比例、目录/卷册/翻页/书签状态或虚拟桌面。

## 后续节点

- 将聚光可选 prop 接入 PhotoViewport，默认关闭，仅 A3 显式启用；确保换镜头重新绑定 frame，工具、键盘焦点和蓝色热点保持清晰。
- 以纸卡交互包装 A3 独立细节照片，保留长转录静止、原 alt/标题/说明、关闭/Esc/回焦和图片失败回退；第一幕只复用可确认的独立细节图片分支。
- 修正 A4 sticky 翻页工具与自动焦点正文段首的遮挡，保持原 focus effect 和分页状态。
- 主审进行 1280/1440 宽屏实看与完整网页/离线质量门禁；本记录不代表最终视觉验收。

## 验证

- 第一节点 `git diff --check`：通过。
- `InvestigationSpotlight.test.tsx` 与 `LibraryResearch.test.tsx`：17 项通过。
- Node `v24.15.0` 下 `npm run build`：通过（517 modules）；保留既有主 JS chunk 大于 500 kB 的 Vite 提示。
