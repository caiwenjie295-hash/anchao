# UX 身份图形交付记录

工单：`UX-IDENTITY-20261006`。主审结论 `APPROVED`。功能节点 `911acb515acf7623592f28905d17cb9d9535308e` 已以 `--no-ff` 合入本地 `main`，合并节点为 `cb833299bd90c0cc5785647eb58182d4de3c1381`。文档节点 `222c01b2778feaae9b951eabac7da5e5b74a4057` 的生产/离线构建与发布完整性校对通过；纯文档收尾变更尚待父合入。最终交付依据始终为当前 `main` HEAD、`manifest.gitSha` 与开发包根目录 `UX-IDENTITY-20261006-validation/release-main.json` 动态校对。未推送或部署。

本批把邮箱账户/发件人、浏览器论坛作者/页面来源/搜索结果及工具栏搜索/历史、私人博客头像/品牌/收藏图形接入统一稳定映射。保留名称、按钮文字、ARIA 名称、交互、内容与剧情状态。林予使用既有猫头像 `IMG_A1_B_010`；王澳/小A共用无脸窗边树影照片；站点与作者身份不依赖正确性、剧情 Flag 或结果等级。图像失败使用无字 SVG 回退。桌面及微信图片图集未作为本批资产修改。

## 资产与改动

新增 47 个本地 SVG glyph，图形相关代码 16,036 B；新增 1 张 WebP，发布文件 12,530 B，源 PNG 2,074,163 B。发布光栅低于 400 KiB；PNG 仅归档于 `docs/ux-identity-20261006/source/`。图形账本、用途与提示词分别见 [`asset-ledger.md`](asset-ledger.md) 和 [`prompts/profile-avatars.md`](prompts/profile-avatars.md)。

主要实现位于 `src/components/VisualAvatar.tsx`、`VisualIcon.tsx`、`src/data/visualIdentityData.ts`，以及邮箱、浏览器和私人博客对应模块。全部改动遵循冻结工单的文件范围。保存 schema、剧情 JSON、Flag、游戏原文、旧测试及构建脚本未修改。

## 主审集成验证

全部门禁针对功能节点 `911acb5`：

| 检查 | 结果 |
| --- | --- |
| `git diff --check main...HEAD` | PASS |
| `npm test` | PASS，77 文件 / 409 项 |
| `npm run build` | PASS，316 modules；保留 Vite 大 chunk 提醒，未调整阈值 |
| `npm run build:offline` | PASS，155 文件 / 44,042,834 B（约 42.00 MiB）；头像作为独立文件进入 manifest |
| 默认 `npm run test:offline` | PASS，两轮；涵盖 A–K、A2 T01–T07、A3 T00–T07、A4 T01–T10，本地资源、无网络资源和零运行错误 |
| 真实浏览器重点走查 | PASS，1280×720 与 390×844 邮箱、搜索/来源、论坛、博客的关键呈现和操作 |

该功能节点的离线包历史数字为155文件/44,042,834 B。文档合入 main 节点 `222c01b2778feaae9b951eabac7da5e5b74a4057` 的 production build 为316 modules，offline build 为314 modules，离线包155文件/44,042,840 B。根目录 `release-main.json` 校对 `manifest.gitSha` 匹配、全部文件尺寸一致、头像12,530 B且源/包SHA256相同、脚本零 `data:image`、868项保护工作文件无差异及原30项dirty状态一致，全部通过。该 main 节点默认两轮 `test:offline` 复验通过，见根目录 `main-offline-test.log`。

真实浏览器使用既有隔离内存存档 fixture，不读取或改写玩家存档。检查覆盖邮件账户与机构标识、28px 发件人头像及星标切换；搜索和来源站点图形一致且来源行在宽窄视口可读；32/24px 论坛头像；博客资料头像58/48px、动态头像39/36px、收藏切换和日期跳转。检查页无横向溢出，控制台无 warn/error。另完成一处微信/桌面回归检查，既有头像/图集显示正常，截图 `wechat-regression.png`。

首次离线验收曾因直接 WebP import 被 Vite 内联为 `data:image` 而失败。已将单图导入改为 `import.meta.glob` + `?url&no-inline`，原离线断言与脚本保持不变。父随后重跑的两轮离线检查通过。搜索结果站点图标最初采用块级布局导致站点/日期换行，之后修正为同行可换行布局并通过父宽窄屏复验。窄屏中邮箱与论坛头像旧背景覆盖身份色板的问题也已修复。

保护审计确认 845 条旧受保护路径无差异，原 148 条图片注册和 151 条压缩映射均保留；main 合并审计 868 项受保护工作文件无差异，原始 30 项 dirty 状态保持。新资产为 12,530 B 光栅与 16,036 B 图形代码。

## 验收边界与待办

自动 offline 流程覆盖四幕并两轮通过。图像解码在该 DOM 流程中使用其既有模拟，真实图片尺寸和显示另由上述浏览器抽查；浏览器工作是代表状态与关键操作抽查，不等同于全镜头人工通关、全部设备或辅助技术矩阵。

本批纯文档修改合入后，父只需刷新离线 manifest 对应 SHA。最终交付版本始终以当前 `main` HEAD 与 `暗潮离线/manifest.json` 的 `manifest.gitSha` 匹配，并由根目录 `UX-IDENTITY-20261006-validation/release-main.json` 动态校对；不在文档中循环填写未来的静态 SHA。

只读后续目标见 [`improvement-targets.md`](improvement-targets.md)；截图、日志及保护审计留在开发包根目录 `UX-IDENTITY-20261006-validation/`，不提交进仓库。父评审原件 `docs/reviews/UX-IDENTITY-20261006.md` 保持不改。
