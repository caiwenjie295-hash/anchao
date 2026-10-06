# UX 身份图形交付

工单：`UX-IDENTITY-20261006`。状态：实现与本地定向验证已完成，等待父任务执行统一门禁和宽/窄视口验收。

本次将邮箱账户/发件人、浏览器论坛作者/页面来源/搜索结果，以及私人博客头像、品牌和收藏状态切换到稳定图形身份。原有名称、按钮文本、ARIA 名称、交互和页面内容保留。图像加载失败时显示 SVG 图形回退。桌面与微信视觉资产保持原样。

资产清单见 [`asset-ledger.md`](asset-ledger.md)。新增 46 个本地 SVG 图形；发布光栅 1 张 WebP、12,530 B，源稿 PNG 2,074,163 B；生成提示见 [`prompts/profile-avatars.md`](prompts/profile-avatars.md)。未入选的面部肖像候选不在仓库。

父任务可直接用现有内存隔离入口验收：

- `a1-start`：进入邮箱并检查林予账户头像及发件人图形。
- `qiming`：进入浏览器论坛及搜索结果，检查昵称头像、页面来源与结果标识。
- `a4-blog`：进入私人博客，检查小A/王澳同图、站点图形及收藏状态图形。

本地验证：`npx tsc --noEmit`；`npx vitest run src/data/visualIdentityData.test.ts src/components/VisualAvatar.test.tsx`（2 个文件、5 个用例）；`git diff --check`。父任务负责统一 4 项门禁与宽/窄视口浏览器验收。
