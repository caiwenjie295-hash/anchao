# UX-NARR-20261002 · A2 本地交付记录

## 实现

- T03 与 T04 共享县图书馆阅读空间。书架照片上三处虚线矩形以完整 4:3 图片平面归一化定位，并对应现有卷册/故事 ID；T04 明确三篇属于同一卷末旧录，照片入口与文字索引打开同一份原文。
- T03 保留目录缩小、卷册开放、逐页阅读、现有来源登记、书签和关键词；未满足目录条件时，照片热点和文字入口均不展示具体卷名。照片载入失败时，文字入口继续可用。
- T04 默认显示原文；现代说明、支持片段、跨篇对照和暂定判断按需展开。原有 StateManager 门槛、阅读登记和跨来源推论保持。
- T05 在高中地点调查前显示既有小月消息与高中照片，再呈现地点、异常材料和时间线。T02/T03/T04/T05/T07 接入阅读、探索、回忆三类调查壳层语义；T06 样式仅作用于获准的启明复核工作区。
- 本地浏览器片段：`docs/ux-narr-20261002/a2/browser-check.html`。可选“地方志·未缩小目录”“书架入口已开放”“同一阅读空间·卷末旧录”并模拟书架图片失败。它直接渲染正式场景组件和正式资源，只通过测试用 StateManager 初始状态跳至代表片段。

剧情正文、Flag、门槛、StateManager 公共接口、存档 schema 和数据 ID 未改。

## 本地验证

- `npm ci --offline`：成功。Node v24.13.1 对锁定依赖报告引擎范围提示，安装完成。
- `npx vitest run src/data/act2Presentation.test.ts src/scenes/act2/Act2ShelfMap.test.tsx src/scenes/act2/LibraryResearch.test.tsx src/scenes/act2/TalesInvestigation.test.tsx src/scenes/act2/BridgeInvestigation.test.tsx src/scenes/act2/SchoolInvestigation.test.tsx src/scenes/act2/T07Investigation.test.tsx src/modules/browser/BrowserApp.test.tsx`：8 个文件、47 项通过。
- `npm run build`：TypeScript 检查和 Vite 生产构建通过。Vite 给出单个压缩 JS chunk 超过 500 kB 的提醒。
- 单独以 `browser-check.html` 为 HTML 入口调用 Vite build：204 个模块编译通过；临时产物已删除，不进入提交。

## 尚待父代理验收

本分支没有启动浏览器，也没有执行整合后的 offline 门禁。fixture 的宽屏/窄屏真实浏览器抽查、整合构建和 offline 验收由父代理统一完成；当前测试/build 结果仅代表 A2 分支定向范围。
