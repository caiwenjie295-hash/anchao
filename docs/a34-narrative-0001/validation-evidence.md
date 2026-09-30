# A34 N5 验收记录

验证日期：2026-10-01。阅读原文、存档迁移与离线主流程均按定向范围验收。

## 文本和代码检查

| 检查 | 结果 |
| --- | --- |
| `node --experimental-strip-types scripts/verify-act4-source.mjs ../../_work_order_audit/A34-NARRATIVE-0001/novel-pdf.txt` | PASS，严格去空白后 304/304 原文段落匹配 39 页提取文本 |
| `npm exec vitest -- run src/core/act4.test.ts src/core/saveManager.test.ts src/core/saveManager.legacySchool.test.ts src/scenes/act4/Act4LaterExperience.test.tsx src/data/narrative/act4Narrative.test.ts src/story/act2T01T03.acceptance.test.ts src/story/act2T01T05.acceptance.test.ts src/story/act2T01T06.acceptance.test.ts src/story/act2T01T07.acceptance.test.ts` | PASS，9 个文件、60 项 |
| `npm run build` | PASS；Vite 提示主 JS chunk 大于 500 kB |
| `npm run build:offline` | PASS，生成 143 个离线文件（197.34 MiB） |
| `npm run test:offline` | PASS，离线包走完第三幕 T00–T07、第四幕 T01–T10、阶段中途重载及资源检查；无网络资源请求和运行时错误 |
| 主审独立定向：PhotoViewport observer、legacySchool、T07Investigation | PASS，18/18 |

`src/story/act4/laterFlow.ts` 仅保留为弃用兼容逻辑，`src` 非测试运行时代码没有导入它。新第四幕入口使用共享阅读器和 `narrativePolicy`。完整 schema 迁移边界见 [`save-compatibility.md`](save-compatibility.md)。

## 真实浏览器

在本机启动 Vite：

```powershell
npm run dev -- --host 127.0.0.1
node scripts/a34-browser-qa.mjs
```

脚本默认使用本机 Chrome 与 Playwright；可用 `A34_CHROME_PATH`、`A34_PLAYWRIGHT_ENTRY` 覆盖可执行文件及 Playwright 模块路径，用 `A34_BASE_URL` 改地址，用 `A34_EVIDENCE_DIR` 改截图目录。脚本从已验证的第三幕 T07 出口状态进入第四幕，实际点击完成全篇。

验收结果：

- 入口后从 T01 用继续按钮读到 T10；T02 邮件日期登录、T04 邮件、T08 档案、T09 藏笔记/门外、T10 最终邮件均按对应动作后显示内容。
- 在 T02、T08、T09、T10 重载后，当前章节和已完成动作保留。
- T06 继续按钮原生双击只推进一章到 T07；同一保护适用于共用阅读器的全部章节。
- 人为使 T07 可选图加载失败后，原文仍可读并继续；放大图弹层限制焦点、让背景 inert，关闭后把焦点还给触发按钮。
- 回看 T07 再返回 T08 后，滚动位置和目录解释触发按钮焦点恢复。
- 1920×1080：配图实测 235.5 px 高；390×844：文档宽度 390 px、配图 189.1 px 高，未发生横向溢出；灰底导航标题计算色为 `rgb(65, 70, 75)`。浏览器 pageerror 为 0；唯一被排除的资源控制台错误来自脚本明确注入的缺图 URL。

截图：[`T01 桌面入口`](evidence/browser/a34-desktop-1920x1080-t01.png)、[`T08 桌面阅读`](evidence/browser/a34-desktop-1920x1080-t08.png)、[`T10 窄屏结尾`](evidence/browser/a34-mobile-390x844-t10.png)。

## 未运行

- 完整 `npm test`：按用户要求不运行。
- 除 Chrome 1920×1080 与 390×844 外的完整视口矩阵、其他浏览器引擎：NOT RUN。
