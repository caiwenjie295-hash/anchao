# UX-NARR-20261002 · A2 本地交付记录

## 实现

- T03 与 T04 共享县图书馆阅读空间。书架照片上三处虚线矩形以完整 4:3 图片平面归一化定位，并对应现有卷册/故事 ID；T04 明确三篇属于同一卷末旧录，照片入口与文字索引打开同一份原文。
- T03 保留目录缩小、卷册开放、逐页阅读、现有来源登记、书签和关键词；未满足目录条件时，照片热点和文字入口均不展示具体卷名。照片载入失败时，文字入口继续可用。
- T04 默认显示原文；现代说明、支持片段、跨篇对照和暂定判断按需展开。原有 StateManager 门槛、阅读登记和跨来源推论保持。
- T05 在高中地点调查前显示既有小月消息与高中照片，再呈现地点、异常材料和时间线。T02/T03/T04/T05/T07 接入阅读、探索、回忆三类调查壳层语义；T06 样式仅作用于获准的启明复核工作区。
- 虚线热点追加高于共用 button reset 的局部 specificity，保持照片上的透明底、白色虚线和 44px 触控范围。语义型调查壳层把目标与提示收在可键盘展开的原生 disclosure 中，每屏只突出首个 ready story；无 story 时依次回退到首个 memory、首个 move，其余行动为次要按钮。旧无语义 class 的目标/帮助与按钮样式保持。
- T04 导语改为阅览室中的卷末旧录叙述，不再描述实现方式。原文、索引、图片、StateManager 状态与门槛继续使用正式内容。
- 本地浏览器片段：`docs/ux-narr-20261002/a2/browser-check.html`。可选“地方志·未缩小目录”“书架入口已开放”“同一阅读空间·卷末旧录”并模拟书架图片失败。片段在加载游戏模块前把 localStorage 替换为独立内存实现并显示隔离状态；控件固定置顶，ResizeObserver/resize 按工具条实测高度更新 shell 顶部；场景按 StateManager 实际 stage 渲染，因此可由 T03 动作连续进入 T04。它直接渲染正式场景组件和资源，只以测试 StateManager 初始化代表片段。

剧情正文、Flag、门槛、StateManager 公共接口、存档 schema 和数据 ID 未改。

## 本地验证

- `npm ci --offline`：成功。Node v24.13.1 对锁定依赖报告引擎范围提示，安装完成。
- `npx vitest run src/data/act2Presentation.test.ts src/scenes/act2/Act2ShelfMap.test.tsx src/scenes/act2/LibraryResearch.test.tsx src/scenes/act2/TalesInvestigation.test.tsx src/scenes/act2/BridgeInvestigation.test.tsx src/scenes/act2/SchoolInvestigation.test.tsx src/scenes/act2/T07Investigation.test.tsx src/modules/browser/BrowserApp.test.tsx`：8 个文件、47 项通过。
- 集成返修定向 `npx vitest run src/components/investigation/InvestigationShell.test.tsx src/components/investigation/InvestigationNavigation.test.tsx src/scenes/act2/Act2ShelfMap.test.tsx src/scenes/act2/LibraryResearch.test.tsx src/scenes/act2/TalesInvestigation.test.tsx src/scenes/act3/Act3Investigation.test.tsx src/scenes/act4/Act4LaterExperience.test.tsx src/story/act2T01T03.acceptance.test.ts src/story/act2T01T05.acceptance.test.ts`：9 个文件、41 项通过，覆盖 legacy 默认、目标键盘 disclosure、唯一主动作优先级、受阻原因/材料、A2 现行入口/接续以及 Act3/Act4 壳层消费者。
- `npm run build`：TypeScript 检查和 Vite 生产构建通过。Vite 给出单个压缩 JS chunk 超过 500 kB 的提醒。
- `npx tsc --ignoreConfig --noEmit --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --jsx react-jsx --strict --skipLibCheck --allowSyntheticDefaultImports --esModuleInterop --resolveJsonModule --types vite/client docs/ux-narr-20261002/a2/browser-check.tsx`：standalone fixture 类型检查通过。
- 单独以 `browser-check.html` 为 HTML 入口调用 Vite build：206 个模块编译通过；临时产物已删除，不进入提交。

## 父级集成验收与审查

A2 本地定向验证见上节；该分支未启动浏览器，也未执行集成 offline 门禁。父级最终验收已完成：`npm test` 58 文件 / 317 项通过，`npm run build` 通过，`npm run build:offline` 产出 143 文件 / 197.40 MiB，`npm run test:offline` 默认两轮全通过（T07 Finale、A3 T00–T07、A4 T01–T10、本地资源和零运行时错误）。1440×900 与 390×844 真实浏览器抽查覆盖书架键盘/点击/缺图回退、A3 回忆门槛、A4 当前页与回看焦点、T09 连续广播、T10 完成回顾，结果通过。

主审最终结论为 `APPROVED`。所有权、返修、离线与浏览器验收细节见 `docs/reviews/UX-NARR-20261002.md`。该记录说明文档收尾后执行本地 main 合并；截至本次交付，main 尚未合并，后续合并状态和 SHA 由主审更新到该记录。本分支交付不推定合并 SHA。

fixture 路径为 `docs/ux-narr-20261002/a2/browser-check.html`。父级已用正式组件/资产及隔离状态 fixture 完成宽窄屏代表路径验收；可选“地方志·未缩小目录”“书架入口已开放”或“同一阅读空间”检查相应状态。
