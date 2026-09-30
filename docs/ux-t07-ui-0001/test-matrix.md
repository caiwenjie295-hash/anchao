# UX-T07-UI-0001 验证矩阵

所有结果截至 2026-10-01。全量 `npm test` 按用户指示未运行。

## 自动化检查

| 检查 | 结果 | 范围与说明 |
|---|---|---|
| 14 个受影响 Vitest 文件 | PASS，14/14 文件、121/121 测试 | 包括存档/状态、Act4、PhotoViewport、学校、T06/T07、BrowserApp、任务卡和导航 |
| `npm run build` | PASS | Vite 报告单个大 chunk 提示；构建完成 |
| `npm run build:offline` | PASS | 生成 143 个离线文件，197.36 MiB |
| `npm run test:offline` | PASS | 完整离线流程与存档恢复；没有将图片生命周期模拟当作几何实测 |
| `npm run test:browser` | PASS | Chrome 打开离线首页并挂载本地图片的 smoke 检查 |
| `node scripts/ux-t07-ui-qa.mjs` | PASS | 真实 Chrome；合成状态夹具，不含玩家存档；报告为 `evidence/browser/ux-t07-ui-qa-report.json` |
| `npx vitest run` 定向子集 | PASS，5 个文件、59 项 | 主审独立运行，独立计数，未与上方测试数合并 |

定向 Vitest 命令：

```text
npx vitest run src/core/saveManager.test.ts src/core/stateManager.test.ts src/core/act4.test.ts src/core/saveManager.legacySchool.test.ts src/components/PhotoViewport.observer.test.tsx src/components/PhotoViewport.aspect.test.tsx src/scenes/act4/Act4LaterExperience.test.tsx src/data/taskGuideData.test.ts src/modules/browser/BrowserApp.test.tsx src/story/act2T01T06.acceptance.test.ts src/story/act2T01T07.acceptance.test.ts src/scenes/act2/T07Investigation.test.tsx src/scenes/act3/Act3Investigation.test.tsx src/components/investigation/InvestigationNavigation.test.tsx
```

## 真实 Chrome 检查

| 范围 | 实测 | 结果 |
|---|---|---|
| 学校调查 | 1920×1080、1440×900、1024×768、768×1024、390×844、1920×920 CSS 视口；每档实际点击 8 个地点并选择证据/解释 | PASS；1920×920 是工具栏可用高度的视口模拟，不是物理显示器测试 |
| 第三幕图片与热点 | 59 个镜头 × 1920×1080、1440×900、1024×768、768×1024、390×844，共 295 组 DOM 测量 | PASS；最大比例误差 0.00232%，最大热点中心偏移 0.016 px |
| 图片加载生命周期 | T00_001→T00_002 延迟加载，T00_002→T00_003 精确注入失败，T00_003→T00_004 恢复并 resize | PASS；失败时文本操作可用且没有图片热点；恢复后重新测量 |
| 放大与布局 | T07 宣传照片、Act3 T07 照片均到 300% 最大应用倍率；DPR 2、960×540 CSS 视口 | PASS；该视口模拟 1920×1080 在 200% 布局缩放下的可用 CSS 区域，不是浏览器菜单原生缩放 |
| 第四幕阅读配图 | T01 插图原图 1672×941，放大对话框 `contain`；Escape 关闭并返回触发按钮 | PASS |
| T06/T07/第三幕及第四幕回归 | 主审以合法合成前缀实际走来源复核、视频播放/暂停/键盘 seek、帧截取、比较、位置与行程、第三幕及恢复流程 | PASS；1920 与 390 CSS 宽；证据摘要见主审独立检查及截图索引 |

## 主题对比度抽样

主审对实际 UI 的来源页、T06 个案状态和邮件状态做了 computed-style 检查：来源页面最小 4.624:1，T06 按钮状态最小 6.146:1，邮件控件最小 5.443:1；抽样中没有低对比度项目或 pageerror。该结果只覆盖选定页面和交互状态，不代表对全部像素、渐变图标或每个应用状态的穷举，详见 [theme-coverage.md](theme-coverage.md)。

## 未运行

- 全量 `npm test` 和全站完整 UI 自动化矩阵。
- 屏幕阅读器、实体触屏设备、非 Chrome 浏览器及操作系统矩阵。
- 浏览器菜单的原生 200% 缩放；本轮只做 DPR2/960×540 的 CSS 视口等效布局验证。
- 全部图片倍率与所有输入设备组合；全 59 镜头完成的是默认倍率五档 DOM 几何，加载/错误/恢复生命周期另用代表镜头验证。
