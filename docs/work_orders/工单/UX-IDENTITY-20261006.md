# UX-IDENTITY-20261006 头像与图标视觉身份补全

> 状态：冻结执行工单；仅主审可更新
> 基线：main `ff96c5034388e32be292f39397c459f7aafe1475`
> 唯一执行者：一个 gpt-6-luna / max 子代理 `/root/ux_identity`
> 分支：`agent/UX-IDENTITY-20261006-icons`
> worktree：`D:/暗潮开发/暗潮-跨电脑开发包-2026-09-24/暗潮-worktrees/UX-IDENTITY-20261006-icons`

## 目标与设计约束

替换玩家可见的“圆形＋首字”占位头像和站点标识，补齐一套清晰、有真实产品质感的视觉身份与功能图标。只改变呈现，不改变剧情、内容、身份事实或推进方式。先读 AGENTS.md、维护导航.md、协作工作流、game/01–04 的相关资产与UI规定。

- 邮箱：发件人头像与账户头像完整替换；林予账户可以复用现有“我”的 IMG_A1_B_010 图集头像。机构邮件采用符合类别的独立品牌图形，普通个人采用日常自然照片/插画，不制造人物容貌证据。不统一用一个匿名人形糊弄所有来源。
- 浏览器：搜索结果和来源页同一站点使用同一标识；论坛同一昵称稳定使用同一头像。映射只能基于已有站点/来源类别/作者，不得读取 resultTier、线索Flag、正确答案来决定视觉显眼程度。
- 第四幕博客：王澳资料和14条动态用同一自然日常头像，替换“澳”；潮汐簿用统一的波纹/书页图形替换“潮”；收藏等用真正功能图标，保留可读按钮文字。不能增加点赞、粉丝、回复、虚构社交信息。
- 图标使用同一24px网格、统一线宽/圆角，16/20/24px均清楚；站点品牌可各有图形和色彩，但不用汉字/英文字母装作绘制完成。名称和来源仍在邻近文本呈现。已读/选中/收藏不能只靠颜色区分。
- 保留现有专业桌面图集及全部微信界面、人物图集、应用图标、壁纸和纵向排列。没有必要重新生成现有清晰资产。
- 光栅头像应使用内置 image_gen，遵守 imagegen SKILL.md，保存原稿、prompt与来源记录；不调用付费CLI或要求API key。建议少量日常照片头像/一张可复用头像图集；禁止新增叙事证据、可读密码/符号、真名身份线索。功能图标/品牌图形优先项目内SVG，禁止Unicode字符当图标。格式压缩仅作用于新资产。
- 图像错误有无字形图形回退，尺寸稳定；纯装饰 aria-hidden，邻近名称保留。按钮名称、点击处理、焦点和 disabled/aria-pressed 行为不变。不要扩展为布局重构或控制逻辑修改。
- 新发布光栅资产总增量≤400 KiB，SVG/代码图形增量≤80 KiB。只增加必要依赖为0，禁止外部头像/CDN/远程字体/请求。

## 文件所有权

执行者唯一允许写入：

- 新 `src/components/VisualIcon.tsx`、`VisualAvatar.tsx`、`visualIdentity.css` 及有意义的同名行为测试。
- 新 `src/data/visualIdentityData.ts` / `.test.ts`，承载稳定身份映射和新资源可追溯元数据。
- `src/modules/mail/MailApp.tsx`、新 `src/modules/mail/mailIdentity.css`：限头像/图标呈现与导入。
- `src/modules/browser/BrowserPageView.tsx`、`BrowserSearchResults.tsx`、`BrowserApp.tsx`、`browserApp.css`：限头像/图标呈现与对应样式，处理程序及正文不动。
- `src/scenes/act4/Act4PrivateBlog.tsx`、`privateBlog.css`：限头像、标识、收藏图标。
- 新 `src/assets/ui-identity/`；原稿仅在新 `docs/ux-identity-20261006/source/`。新增资源可直接显式导入，但须在 visualIdentityData 与交付账本登记ID、用途、唯一写入者。
- 如采用核心加载：`data/images.json` 与 `src/assets/compressed/asset-map.json` 仅追加本轮新ID/新路径；所有旧行/键原样保留，不改schema。
- 新 `docs/ux-identity-20261006/`（source、prompt、替换清单、检查结果、交付报告、剩余目标）；可添加本轮隔离浏览器fixture，仿照既有合法状态夹具，仅development条件启用且完全隔离玩家存档，不改src/main.tsx/App.tsx。
- 四进度文档 `维护导航.md`、`docs/progress_log.md`、`docs/todo.md`、`docs/changelog.md`：仅父下发实际统一结果后收尾更新；旧批次历史不动，不提前报告合并或测试通过。

主审独占：本工单、`docs/reviews/UX-IDENTITY-20261006.md`、开发包根目录 `UX-IDENTITY-20261006-validation/`。主审只负责工单、审查、验证、合并；不代写产品代码。

所有其他路径只读。特别禁止 core/stateManager/saveManager/types、全部剧情JSON（含主工作区已dirty的story_transitions.json）、小说原文/act4Presentation、微信模块/数据、SpriteIcon/spriteData/AppIcon/DesktopIcon/AppWindow、旧图片和旧WebP、assetLoader、全局styles.css、package*.json、旧测试以及旧交付/审查记录。若具体路径确有必要，先向父说明需要和最小范围，不能自行越界。

## 验证、审查与交付

执行者先做实现和必要定向验证：稳定映射、同站一致、不读取线索正确性、未知身份/图片失败回退、图标可访问性与现有交互事件不变；不为纯可逆美术更换机械地堆测试。不改测试去迁就代码。TypeScript与diff-check通过后显式stage允许路径，提交并给父SHA、路径、资产数量/字节与prompt记录。

父统一跑一次 `npm test`、`npm run build`、`npm run build:offline`、默认 `npm run test:offline`；真实浏览器1280×720和390×844检查邮箱/搜索结果/论坛/博客及一处桌面微信回归。检查离线资源、不泄露提示、图像完整和大小稳定。失败仅原执行者窄修，按影响复验。

父检查保护基线、旧资源/注册/映射、原30项dirty与review，APPROVED后合入本地main并构建最终包核对manifest SHA。文档阶段沿用该执行者，不另开代理。不推送、部署或删除worktree。

同时做只读改进审查：指出仍然粗糙/操作不明/节奏重复的具体界面和触发方式，按P0/P1/P2列原因及最小改法；把额外改进建议写进交付报告，未经本工单授权不顺手改剧情或扩大功能范围。

若父通知五小时剩余≤10%，立即停止本轮开发并保留文件、分支、待办；仅按实际额度恢复及父指令继续。不要修改上轮已停用的额度自动化，也不要购买或重置额度。

最终报告：Role / Delivered / Commit SHA / Changed paths / Asset budget + prompts / Validation run / Remaining review targets / Cross-boundary requests。
