# 第二幕宽松布局定向验收

此本地 fixture 通过正式 `Act2Experience` 挂载 School 和 Bridge 场景，使用正式数据、图片与 `src/styles.css`，不接生产 App。入口可在验证分支根目录执行：

```powershell
npm run dev -- --host 127.0.0.1
```

常规模式入口是 `http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html`，用一行下拉框/重置切换状态。顶部工具条通过 `ResizeObserver` 测量实际高度，再把该高度应用到固定调查壳层的顶部 inset；路径说明按需展开。

父审的 clean viewport 使用以下地址。它们不渲染验收工具条、不增加顶部 inset，按正式视口加载对应场景；刷新页面即可重新开始该模式。

- 高中未读：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=school-unread&clean=1`
- 高中已读材料：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=school-sources&clean=1`
- 桥头完整路线：`http://127.0.0.1:5173/docs/ux-layout-20261003/validation/fixture.html?mode=bridge&clean=1`

Fixture 在动态导入 StateManager、存档、场景和数据模块之前，用已自检的内存 `Storage` 替换当前标签页的 `localStorage`。自检失败会显示错误并停止挂载。它不调用原存档对象、不清空正式存档；页面只将 StateManager 的写入保存在独立内存里。

工具条包含三个模式：

- **高中 · 未读开始**：从上一阶段完成、刚进入 T05 的合法状态开始。可沿地点导航进入老师办公室点击“听听老师回忆”，再记下老师回忆；沿走廊前往光荣榜，查看并记录历次名次；回到小 A 旧教室翻看笔记并完成双 S 比对。
- **高中 · 已读材料**：通过 StateManager 的正式阶段/阅读方法构建 checkpoint，老师、成绩材料已读，双 S 已确认，支持来源仍未选择。展开“整理已读材料”，比较一项支持和两项支持的确认门槛。
- **桥头 · 完整路线**：从 T01 已完成搜索、合法进入 T02 的状态开始。选择线索老人，先追问鸡公岭，再出示正式照片；之后按“黑 / 补 / 母”记录称呼并进入地方志阶段。Fixture 订阅 StateManager 当前阶段；进入此范围外的阶段时，会显示“当前定向片段已完成”和真实阶段名，不会显示空白。重置当前路线可以回到初始状态。

夹具适用于父审查人在桌面和窄屏尺寸检查照片、导航、正文与操作条。`jsdom` 回归仅验证状态和交互，不证明任何实际几何尺寸；最终布局以真实浏览器抽查为准。夹具不代表从第一幕开始的全流程试玩。
