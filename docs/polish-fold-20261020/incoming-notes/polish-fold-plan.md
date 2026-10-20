# 把现网 polish 折进精简源码 —— 编号变更清单（群讨论用）

> 对照日期：2026-10-20（Asia/Shanghai）  
> **本清单只做对照与建议，未改任何源码文件。**  
> 解锁 / 验证 / 存档 schema 默认冻结；凡碰 flag / stage / 存档归一化的项已标「触解锁边界，需群点」。

---

## 1. 源码快照

| 项 | 值 |
|----|-----|
| 包类型 | 精简源码开发包（`SOURCE_VERSION.json`） |
| 来源 commit | `fc11b3bc25394fa96add6479c9ab4ccec5e983ad`（`main`，当时干净） |
| 客户端日期 | 2026-10-20 |
| package.json | `anchao-act1-m0` **0.9.0** |
| 技术栈 | React 19 + TypeScript + Vite 8（Vitest/jsdom）；Node 24.15 / npm 11.x |
| base path | 开发默认 `/`；**网页部署** `npm run build -- --base=/AnChao/`（见 `开发说明.md`）→ 现网 `https://emberscrolls.top/AnChao/` |
| `vite.config.ts` | 未写死 base；发布靠 CLI `--base=/AnChao/` |
| 打包验证 | `打包验证.json`：`webBuild: PASS /AnChao/`，`implementationChanged: false` |
| 说明注意 | 开发说明写明：本包**不含本轮未完成的图书馆/视频层级修改与山路新图**——与现网 polish 叠加层存在预期落差 |

源码根：`/workspace/anchao/source/暗潮-精简源码-fc11b3bc-20261020/`  
现网 polish：`/workspace/anchao/AnChao/`（`index.html` cache `?v=1792455200`）

---

## 2. 现网 polish 叠加层清单

### 2.1 `assets/anchao-polish.css`（~2375 行，纯展示）

| 功能块 | 职责摘要 |
|--------|----------|
| 全局控件 | 主按钮对比度、disabled 灰化、热区光晕、启动/标题换行、details 展开标记、XP 桌面悬停 |
| Act2 T07 终章 | 暖纸档案桌（茶 `#8a6a3b` / 纸 `#ebe6dc`）；杀绿；对照窗「外观对照」；**缺口框三态**（默认暖灰 1px → hover 略深 → `:active` 闪一下 → active 落定）；胶片条静音非外景帧 |
| Act2 图书馆 T03 | 暖纸；大图翻页为主舞台；页角茶边热区；「待查阅」去按钮壳；摘录确认暖灰条；关键词闪边；目录选中≠成功绿 |
| Act2 桥头 T02 | 杀探索壳青绿；茶虚线老人热区；hover≠选中；三字辨识反馈暖茶、resolution 页内非模态 |
| Act1 桌面噪声 | 邮箱未读弱墨点；微信未读「新」茶墨提示（藏数字）；任务卡计数静音；任务栏偏纸茶 |
| blocked CTA | `[data-action-state=blocked]` 视觉不可点、藏粘连「查看原因」小字 |

### 2.2 `assets/anchao-patch.js`（~1600 行，运行时叠加）

| 函数 / 块 | 职责摘要 | 是否碰存档 |
|-----------|----------|------------|
| `repairAct34SaveObject` / `installAct34ColdStartRepair` | 读 localStorage 前补全 T07 对照证据链 + `FLAG_A2_COMPLETE` 等，防 Act3/4 被 normalize 打回 `inactive` 后锁死在 T07 壳 | **是** |
| `installSingleClickOpen` | 桌面图标/照片缩略单击打开 | 否 |
| `installWeChatScroll` | 微信消息区滚到底 | 否 |
| `installHotspotPulse` | 首次访问热区轻脉冲 | 否 |
| `enrichStartup` | 启动句补充前提/耗时提示 | 否 |
| `installCompareMarkerStyle(Sheet)` | 强制缺口框透明底+细金/暖灰边（压过 bundle 霜罩） | 否 |
| `installT07WrongFrameTeaching` | 错帧分型文案（树林/受访/庙门口）+ 胶片静音标签 | 否（只改 status DOM） |
| `installT07StepSync` | 步骤条标题与当前面板同步 | 否 |
| `installLibraryPolish` | 注入页角翻页、假可点降权、摘录确认条、空态提示 | 否 |
| `installSquareOpeningCopySoften` | DOM 双保险替换「方形开口/缺口」展示句 | 否（id 不动） |
| `installBlockedCtaFeel` | blocked CTA 视觉锁 | 否（不改 state 机，但改可发现性） |
| `installQaCaptureHints` | `?qa=` 自动进场景（**不应折进产品源码**） | QA only |

### 2.3 其它被改文件

| 文件 | 职责 |
|------|------|
| `index.html` | 链入 polish.css / patch.js（`?v=1792455200`）；patch **同步**挂在 module 前；启动文案加前提；`/AnChao/` 资源路径 |
| `assets/index-B5fim0g2.js` | 展示字符串手术（任务指引软化、方形开口 label/note、BGM 指 compact ogg、部分 observe 文案）；**对照侧曾改用 `zoomImageId ?? imageId`** |
| `assets/IMG_A2_T07_006-QZGva8SE.webp` | 石庙开口中心裁切（对照用）；registry 从误指 005 纠正 |
| `assets/IMG_A2_T07_TRAIL_WALK_001-*.webp` | 山路树林镜头（错帧教学用） |
| `anchao-preload-manifest.json` | 新图+主包 hash/bytes |
| `PATCH_NOTES.md` / `REPORT.md` | 变更与跳过说明 |
| 若干 `qa-*.html` | 截图/跳转夹具（产品外） |

---

## 3. 编号折进清单

约定：风险=改坏面/测试/玩家误读概率；「触解锁边界」= 存档 / flag / stage / 验证答案 / normalize。

| 编号 | 一句话改什么 | 建议改源码位置 | 风险 | 解锁边界 |
|------|--------------|----------------|------|----------|
| **P01** | T07 对照缺口框：去霜罩白罩，改为暖灰 1px 轮廓三态（默认 / hover 略深 / `:active` 闪 / active 落定），无 glow | `src/act2/t07Finale.css`（`.t07-finale__compare-side .photo-viewport__marker*`）；必要时收敛 `src/components/photoViewport.css` 的 focus-box 默认 | 低 | 否 |
| **P02** | 对照观察热区改为 `presentation: 'focus-box'`，文案收成「标记 / 视频区 / 外景区 / 已标记」；坐标按裁切图重校（现网约视频区 `x:.48,y:.42`） | `src/scenes/act2/T07Investigation.tsx`（`videoObservationMarkers` / `exteriorObservationMarkers`） | 低 | 否 |
| **P03** | 对照左图用 `zoomImageId ?? imageId`（石庙裁切），视频时间轴仍用宽幅 `IMG_A2_T07_005` | `src/scenes/act2/T07Investigation.tsx` 对照 `PhotoViewport` 的 `imageUrl`；数据已有 `zoomImageId`：`data/act2_t07.json` | 中 | 否（展示资源） |
| **P04** | 修正 `IMG_A2_T07_006` 资源映射：现源码 `data/images.json` **仍指向 `IMG_A2_T07_005.jpg`**；纳入现网裁切 webp（或等价裁切）并进 compressed/manifest | `data/images.json` items `IMG_A2_T07_006`；`src/assets/compressed/第二幕/`；构建清单脚本 | 中 | 否 |
| **P05** | 错帧教学：胶片非外景帧静音+标签「树林·暂不可外景核对」等；`mismatchNote` 按帧型分叉（树林 / 受访 / 庙+错特征），底条暖灰非成功绿 | 展示层优先：`src/scenes/act2/T07Investigation.tsx` + `src/act2/t07Finale.css`；文案数据可扩 `data/act2_t07.json`（现仅单条 `mismatchNote`）+ `src/data/act2T07Data.ts` | 中 | 否（勿改 `matchFeatureId` / 提交校验） |
| **P06** | 确保山路 TRAIL webp 正式进第二幕压缩链（源码有 `ux-investigation-20261014/IMG_A2_T07_TRAIL_WALK_001.webp` 与 registry，compressed/第二幕缺正式位） | `src/assets/compressed/第二幕/` + 资源映射；`data/act2_t07.json` 已引用 `IMG_A2_T07_TRAIL_WALK_001` | 低 | 否 |
| **P07** | T07 终章整体暖纸茶边视觉（去 `#315b45` 成功绿、对照 XP 窗、胶片/运输条/主 CTA 墨纸） | `src/act2/t07Finale.css`（可从 `anchao-polish.css` T07 段移植定稿规则） | 低 | 否 |
| **P08** | 「方形开口」展示软化：feature label →「…石砌空隙」；`FRAME_A2_T07_001.placeholderNote`「方形缺口」→「空隙」；**id 仍 `square-opening`** | `data/act2_t07.json`（`comparison.featureOptions` / keyFrames note）；跑过 `src/data/act2T07Data.ts` 文案收集 | 低 | 否（**勿改** `matchFeatureId`）※见 §5 文案基线差 |
| **P09** | 图书馆：页角/页缘翻页热区 + 短翻页动效；底部分页器降为次要 | `src/scenes/act2/LibraryResearch.tsx` + `src/act2/t03Library.css`（现网靠 patch 注入 `.anchao-lib-page-turn*`） | 中 | 否 |
| **P10** | 「待查阅」假可点：disabled 热区改为纯图注（无按钮板/边框），文字入口 disabled 像图注 | `src/scenes/act2/Act2ShelfMap.tsx` + 书架相关 CSS（`act2ReadingRoom.css` / shelf css）；测试 `Act2ShelfMap.test.tsx` 期望「待查阅」文案可保留 | 低 | 否 |
| **P11** | 摘录成功：侧栏暖灰确认条「摘录已收入…」，非模态成功绿；正文舞台优先于静态纸样插图 | `src/scenes/act2/LibraryResearch.tsx` + `src/act2/t03Library.css`（`.act2-library__excerpt-button` 现仍 accent 绿边） | 低 | 否 |
| **P12** | 图书馆目录/关键词：选中=暖纸茶边，hover≠selected；杀 sage focus ring | `src/act2/t03Library.css` | 低 | 否 |
| **P13** | 桥头壳：杀探索青绿壳，强制暖纸/茶 token；底栏「去县图书馆」茶主色 | `src/act2/t02Bridge.css` + `src/components/investigation/investigation.css`（`--act2-field-notes` / `--exploration` 叠用）；壳已在 `BridgeInvestigation.tsx` 挂 `investigation-shell--act2-field-notes` | 低 | 否 |
| **P14** | 老人热区：白粗虚线+重阴影 → 浅茶虚线 focus-box；hover ≠ `--active` / `is-active` | `src/act2/t02Bridge.css`（`.act2-bridge__elder`） | 低 | 否 |
| **P15** | 三字辨识：错提示暖茶强调；选项选中暖纸茶边非过关绿；confirm 可用=茶主色；resolution 保持页内 section | `src/act2/t02Bridge.css`；逻辑在 `BridgeInvestigation.tsx`（勿改正确字 `黑/补/母`） | 低 | 否（答案冻结） |
| **P16** | Act1 噪声：`.mail-row__indicator` 弱墨点；强化「置顶」组头；微信 `.wechat-unread` 改茶墨「新」、藏数字（aria 保留） | `src/styles.css` + 可选 `MailApp.tsx` / `WechatApp.tsx` 结构微调 | 低 | 否（勿动 `initiallyRead` / `readIds` / qp） |
| **P17** | 任务卡计数与任务栏玻璃偏静音纸茶 | `src/styles.css`（`.desktop-task-card__count` / `.taskbar`） | 低 | 否 |
| **P18** | blocked CTA：视觉像 disabled、不粘「查看原因」——**与源码现行「可点展开原因」验收冲突** | `src/components/investigation/InvestigationNavigation.tsx` + `investigation.css`；相关 `*.test.tsx` 需群先定产品口径 | 高 | 否逻辑 flag，但**改无障碍披露行为**，需群点 |
| **P19** | Act3/4 冷启动：读档时若 `game.act≥3`（或 act3/act4 已非 inactive）而 T07 证据链过薄导致 `FLAG_A2_COMPLETE` 被剥、`act3` 打回 `inactive`，则**在 normalize 内**保留幕进度 / 或放宽完整性剥离条件，避免残 `act2Research.stage=finale` 锁死 T07 壳 | `src/core/compatibility/saveMigration.ts`（约 450–471 行：`FLAG_A2_COMPLETE` 删除链 + `createDefaultAct3State()`）；入口常量 `src/core/domain/act3.ts`；**不要**长期依赖 Storage.prototype 外挂 | 高 | **触解锁边界，需群点** |
| **P20** | 全局暖纸/茶边 token（主按钮、disabled、调查导航层级）与启动页对比度/换行——从 polish 定稿段迁入正式 CSS，避免永久外挂 | `src/styles.css` / `investigation.css`；源码 `index.html` 启动 inline 样式；部署 base 仍 `/AnChao/` | 低 | 否 |
| **P21** | 体验层小补丁：桌面单击打开、微信会话滚底、首访热区脉冲（可选，非 polish 主叙事） | `src/components/` 桌面图标 / `WechatApp.tsx` / PhotoViewport | 中 | 否 |
| **P22** | 外挂退役：产品构建不再注入 `anchao-polish.css` / `anchao-patch.js`；QA `?qa=` 与 qa-html **不进**正式包 | 构建产物 / 部署脚本；现网 `AnChao/index.html` 仅作对照 | 中 | 否（删外挂前须 P01–P19 相关项已落地或明确放弃） |

---

## 4. 建议落地顺序

1. **展示层文案 / CSS（可并行、不碰锁）**  
   P08（石砌空隙文案）→ P01/P07（缺口三态+暖纸）→ P16/P17（Act1 噪声）→ P13–P15（桥头）→ P10–P12（图书馆皮）→ P20（全局 token）
2. **行为补丁（仍尽量不碰存档）**  
   P03/P04/P06（裁切图+TRAIL 资源）→ P02（focus-box）→ P05（错帧教学）→ P09/P11（页角翻页/摘录条）→ P21（可选单击/滚底）
3. **需群点口径**  
   P18（blocked CTA 与「查看原因」无障碍是否保留）  
   P19（Act3/4 读档补全 —— **触解锁边界**）
4. **最后再议**  
   P22 是否删除现网外挂 polish/patch（建议：主路径折完 + 冒烟 Act1→T07→桥→馆→Act3/4 后再摘）

---

## 5. 冲突 / 缺口

| 主题 | 源码落点 | 与 polish 关系 |
|------|----------|----------------|
| 缺口三态 | `t07Finale.css` 现为半透明白罩+绿 active | polish 已定稿暖灰线；**源码未折入** |
| 错帧教学 | 单条 `mismatchNote`；无帧型 DOM 标签 | polish 在 patch 运行时改写；**源码无分型 API** |
| TRAIL webp | registry + ux 目录有图；**compressed/第二幕缺** | 现网 assets 有 hashed webp |
| 对照 zoom | 数据有 `zoomImageId`，**UI 对照仍用 `imageId`** | polish 改过 bundle；源码未跟 |
| `IMG_A2_T07_006` | **file 仍=005.jpg** | polish 已纠正裁切资源 |
| 石砌空隙文案 | 源码 label 已是「石堆中间留有方形缺口」；note「…方形缺口。」 | polish 是从**另一中途文案**「入口处有规整的方形开口」改到「石砌空隙」——**折进时应对齐目标句「空隙」，勿假设源码仍是「入口处有规整…」** |
| focus-box | `PhotoViewport` 支持 `presentation:'focus-box'`，T07 观察热区**未用**（仍 `kind:'memory'`） | polish 曾改 presentation |
| 图书馆页角 | **源码未找到**页角按钮实现 | 仅 patch 注入 |
| 待查阅假可点 | `Act2ShelfMap.tsx` 有「待查阅」disabled 按钮壳 | polish CSS/JS 去壳；源码仍按钮形态 |
| 桥头茶壳 | `t02Bridge.css` 已有部分纸感；壳 class 已挂 field-notes | polish 再杀 `--exploration` 青绿叠层 |
| Act1 噪声 | `styles.css` 仍蓝点 `#2676b7`、微信红胶囊 `#e24a4a` | polish 已降警报 |
| Act3/4 读档 | `saveMigration.ts` 明确：T07 证据不全则剥 `FLAG_A2_COMPLETE` 并可 `createDefaultAct3State()` | polish **外挂补档**绕过；正式折进须改 migration 策略 |
| blocked CTA | 源码测试要求 blocked **可点**并展开「查看原因」 | polish 做成不可点观感——**产品冲突** |
| QA 外挂 | 无 | `installQaCaptureHints` / `qa-*.html` **不要折进产品** |
| 任务指引软化 / BGM compact | 部分在打包 JS 字符串层 | 本清单未逐条展开；若群要防剧透再开子工单 |

---

## 6. 推荐：最小第一刀（供群点收）

建议只收 **展示层、零解锁** 的 3 项：

1. **P08** — `data/act2_t07.json`：正解 label / `FRAME_A2_T07_001` note 收到「石砌空隙 / 空隙」（id 不动）  
2. **P01** — `src/act2/t07Finale.css`：缺口框暖灰三态（悬停/成功闪）定稿  
3. **P16** — `src/styles.css`：邮箱弱蓝点 + 微信未读降警报（不动已读状态）

**不进第一刀：** P19（触解锁）、P18（与无障碍测试冲突）、P03/P04（资源换图，需验对照）、P22（删外挂过早）。

---

## 附录：必读 polish 主题 → 源码落点速查

| 主题 | 源码落点（路径 + 名） | 状态 |
|------|----------------------|------|
| Act2 对照缺口三态 | `src/act2/t07Finale.css` `.photo-viewport__marker*`；`PhotoViewport.tsx` | 有落点，未达 polish |
| 树林错帧 / 无人山路 / 暖灰失败底 / TRAIL | `data/act2_t07.json` `mismatchNote`+`IMG_A2_T07_TRAIL_WALK_001`；`T07Investigation.tsx`；`t07Finale.css` | 有部分落点；分型教学与 compressed TRAIL **缺口** |
| 图书馆假可点/翻页/摘录/待查阅/页角茶边 | `LibraryResearch.tsx`、`Act2ShelfMap.tsx`、`t03Library.css` | 有落点；**页角翻页源码未找到**（仅 patch） |
| elders 桥头 | `BridgeInvestigation.tsx`、`t02Bridge.css`、`act2_bridge` 数据 | 有落点，视觉未完全对齐 polish |
| Act1 噪声 | `styles.css` `.mail-row__indicator` / `.wechat-unread`；`MailApp.tsx` / `WechatApp.tsx` / `DesktopTaskCard.tsx` | 有落点，未降警报 |
| 方形开口→石砌空隙 | `data/act2_t07.json` `square-opening` label + `FRAME_A2_T07_001.placeholderNote` | 有落点；文案基线与现网中途句不同，目标「空隙」仍待折 |
| Act3/4 入口补档 / 防 T07 壳锁 | `saveMigration.ts`、`domain/act3.ts` `ACT3_ENTRY_FLAG`、`stateManager.ts` | 有落点；正式修复=改 migration（触解锁） |
| blocked CTA 不可点 | `InvestigationNavigation.tsx`（`查看原因`）、`investigation.css` | 有落点；与 polish **口径冲突** |
| 暖纸/茶边整体 | `t07Finale.css` / `t02Bridge.css` / `t03Library.css` / `styles.css` / `investigation.css` | 有落点，未统一茶 token |

