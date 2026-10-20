# Fold round 1 notes — P08 / P01 / P16

对照：现网 `AnChao/assets/anchao-polish.css` + `anchao-patch.js`；计划 `polish-fold-plan.md` §6 最小第一刀。  
源码根：`/workspace/anchao/source/暗潮-精简源码-fc11b3bc-20261020/`  
时间：2026-10-20（Asia/Shanghai）

**未碰：** P19 / P18 / P22；解锁 / 验证 / `matchFeatureId` / 存档；`anchao-polish` 外挂未删。

---

## 改动文件

| 文件 | 项 |
|------|----|
| `data/act2_t07.json` | P08 |
| `src/act2/t07Finale.css` | P01 |
| `src/styles.css` | P16 |

未改：`src/data/act2T07Data.ts`（文案从 JSON 收集，无硬编码旧句）、`photoViewport.css`（全局默认保留；T07 用 scoped `!important` 压过）、`MailApp.tsx` / `WechatApp.tsx`（结构/`initiallyRead`/`readIds`/qp/flag 未动；微信 aria 已在 TSX）。

---

## P08 — 方形开口展示软化（data only）

| 字段 | 前 | 后 |
|------|----|----|
| `comparison.featureOptions[id=square-opening].label` | `石堆中间留有方形缺口` | `入口处可见规整的石砌空隙` |
| `video.keyFrames[FRAME_A2_T07_001].placeholderNote` | `用石头简易搭成的小石堆，中间留出一个方形缺口。` | `用石头简易搭成的小石堆，中间留出一块空隙。` |

不变：`id: "square-opening"`、`matchFeatureId: "square-opening"`。

定稿依据：patch `installSquareOpeningCopySoften`（note →「一块空隙」）+ 现网 label 定稿「入口处可见规整的石砌空隙」。

---

## P01 — T07 缺口框暖灰三态

路径：`src/act2/t07Finale.css` **约 L82–L153**（注释 `P01 — T07 compare gap markers`）。

- 去掉半透明白罩 / 绿 active / 外层 glow（原 `rgb(255 255 255 / 8%)`、`#a4e8b3`、多环 `box-shadow`）。
- 移植 polish FINAL LOCK：默认 `#b8b0a0` 1px → hover `#b8afa0` → `:active` `#cfc6b6` 闪 → `--active` / `aria-pressed=true` `#8a8270`；全程 `background:transparent`、`box-shadow:none`、无 glow。
- 选择器对齐源码 class：`.t07-finale … .photo-viewport__marker*` / `.t07-finale__compare-side …`。
- 图上 label/首 span `display:none`（与 polish 一致，避免胶囊盖图）。

未改 TS 校验逻辑。

---

## P16 — Act1 噪声降警报

路径：`src/styles.css`

| 块 | 行号约 | 要点 |
|----|--------|------|
| `.wechat-unread` + `::after` + selected | **L130–L133** | 茶墨「新」、`font-size:0` 藏数字；TSX `aria-label={\`${unreadCount} 条未读消息\`}` 保留 |
| 置顶组头 / 其它组静音 / 未读 from 色 | **L179–L184** | 首组纸底+茶底边；其它组偏静 |
| `.mail-row__indicator` | **L190–L191** | 弱墨点 `rgba(90,86,78,.42)` 5px（原 `#2676b7` 7px） |

未改：`initiallyRead` / `readIds` / qp / flag。

---

## 本地怎么验

1. **P08**：进 T07 对照特征选项，正解文案应为「入口处可见规整的石砌空隙」；外景/关键帧 placeholder 含「空隙」不含「方形缺口」。提交仍用 `square-opening`。
2. **P01**：对照两侧 marker 为透明底暖灰细线；hover 略深、按下短暂更亮、选中落定更深；无白霜罩、无绿晕、无 glow。
3. **P16**：邮箱未读为淡墨点；「置顶」组头纸茶底边更醒目；微信未读显示「新」不显示数字，读屏仍报 N 条未读。
4. 可选：`npm test -- --run src/scenes/act2/T07Investigation.test.tsx src/modules/wechat/WechatApp.test.tsx`（本刀以 CSS/JSON 为主，未跑全量 build / 未 `npm install`）。

---

## 发现但未改（风险 / 后续）

1. **`comparison.structureNote`** 仍写「石砌**开口**」（非本刀范围；与「空隙」口径略不一致，可另开文案工单）。
2. **`photoViewport.css` 全局 marker** 仍霜罩/圆钮；非 T07 场景不受本刀影响。若其它幕也要暖灰框，需单独折。
3. **P16 置顶** 用 `:first-child` / `:first-of-type` 假设首组即置顶——与现网 polish 相同；若分组顺序变，需改选择器或加 class。
4. **外挂仍在部署目录**：本源码树未链 polish/patch；产品包要退役外挂见 P22（未做）。
5. **P07 暖纸整桌 / P05 错帧教学** 等未进本刀；T07 其它绿 CTA（如 capture-followup）仍可能偏绿，属 P07 范围。
