# Fold round 3 notes — ⑨ P05 + ⑩ P09 + ⑦ P17

对照：现网 `AnChao/assets/anchao-polish.css` + `anchao-patch.js`（`installT07WrongFrameTeaching` / `installLibraryPolish`）；计划 `polish-fold-plan.md` P05/P09/P17。
源码根：`/workspace/anchao/source/暗潮-精简源码-fc11b3bc-20261020/`
时间：2026-10-20（Asia/Shanghai）

**未碰：** P20、P18、P19、P22、P03/P04 大换图；解锁 / 验证 / `matchFeatureId` / 存档 / flag / stage / `saveMigration` / `submitT07Comparison` 判定；第一刀 P08/P01/P16、第二刀 P07/P13–15/P10–12 未回滚。

---

## 改动文件

| 文件 | 项 |
|------|----|
| `data/act2_t07.json` | P05：`frameKind` / `muteLabel` / `mismatchNotesByKind`（`matchFeatureId` 仍 `square-opening`） |
| `src/data/act2T07Data.ts` | P05：类型 + `resolveT07MismatchNote` + 校验 |
| `src/data/act2T07Data.test.ts` | P05：分型断言 + 新单测 |
| `src/scenes/act2/T07Investigation.tsx` | P05：胶片/候选静音标签 + 分叉反馈 + 失败壳 class |
| `src/scenes/act2/T07Investigation.test.tsx` | P05：弱帧期望 trail 文案 + mismatch 壳 |
| `src/act2/t07Finale.css` | P05：静音帧 / 标签 / 失败底条暖灰 |
| `src/scenes/act2/LibraryResearch.tsx` | P09：页缘翻页按钮 + 短动效；底部分页器仍可用 |
| `src/act2/t03Library.css` | P09：页角热区 + 翻页动画；底部分页器降权（P10–12 保留） |
| `src/styles.css` | P17：任务卡计数静音 + 任务栏纸茶玻璃 |

未改：`src/core/domain/act2.ts`、`saveMigration.ts`、`flags.json`、`assetLoader.ts`（TRAIL 已走 ux 路径）、书架假可点（P10 已落地）。

---

## ⑨ P05 — 错帧教学

### 数据（正式源码，非 DOM 外挂）

- `keyFrames[]`：
  - `FRAME_A2_T07_001` → `frameKind: "temple"`（可外景；无 mute）
  - `FRAME_A2_T07_002` → `frameKind: "trail"` + `muteLabel: "树林·暂不可外景核对"`
  - `FRAME_A2_T07_003` → `frameKind: "interview"` + `muteLabel: "受访·暂不可外景核对"`
- `comparison.mismatchNotesByKind`：trail / interview / templeRoad / templeOther（对齐 patch 文案）
- 保留 `mismatchNote` 通用回退句；**`matchFeatureId: "square-opening"` 未改**

### UI / CSS

- 胶片 item / 对照候选：非外景加 `t07-finale__frame--muted` + `t07-finale__frame-tag`
- 提交失败：`resolveT07MismatchNote(frame, featureId)` 写 status（不再一律泛用句）
- 失败时壳加 `t07-shell--mismatch-status` → 底条暖灰 `#e6e1d6`（非成功绿左边）
- **域逻辑仍**：`supportsExteriorMatch && featureId === matchFeatureId` 才 recorded

### TRAIL（P06 最小必要）

- `IMG_A2_T07_TRAIL_WALK_001` 已在 `images.json` + `assetLoader` ux-investigation 路径（`src/assets/ux-investigation-20261014/…webp`）
- **未**拷入 `compressed/第二幕/`、未改 asset-map / 资源管道（与「不要大改」一致）

---

## ⑩ P09 — 图书馆页角翻页

- `LibraryResearch.tsx`：页内 `act2-library__page-turn--prev/next` 热区；`goPrevPage` / `goNextPage` 共用短动效（~300ms）
- 底部分页器仍可点，但 CSS 降为次要（opacity / 小号茶纸钮）
- `act2-library__leaves` 仍纯展示、**无可点回退**（测试「leaves 内无 button」仍成立）
- 保留 P11 摘录确认条 / P12 目录茶边

---

## ⑦ P17 — 任务卡 / 任务栏静音

- `.desktop-task-card__count`：弱墨、`font-weight:400`、tabular-nums（对照 polish Act1）
- `.taskbar`：纸茶半透明底 + 茶边顶线 + 轻阴影；app hover 暖白；指示条茶 `#8a6a3b`
- **未动**已读 / flag / 任务完成判定

---

## 本地怎么验

1. **P05**：截树林帧 → 胶片/候选见「树林·暂不可外景核对」且偏灰；对照选错特征或错帧 → 底条暖灰 + 分型句（非成功绿）；正解仍 `square-opening` + 外景可对帧。
2. **P09**：卷内正文左右页缘可翻；角标短动效；底栏「上一页/下一页」仍可用但更淡；页序 leaves 不可点。
3. **P17**：桌面任务卡计数偏静音；底栏纸茶玻璃感。
4. 回归：P08 石砌空隙、P01 缺口三态、P16 微信「新」、P07 暖纸桌、桥头茶壳、图书馆摘录条仍在。
5. 可选（未跑，本环境无 `node_modules`）：
   `npm test -- --run src/data/act2T07Data.test.ts src/scenes/act2/T07Investigation.test.tsx src/scenes/act2/LibraryResearch.test.tsx`

---

## 风险 / 未改项

1. **P20 全局 token** 明确后置；主按钮/启动页等仍可能依赖现网外挂。
2. **TRAIL** 正式位仍在 ux 目录而非 `compressed/第二幕`；产品行为已可用，若发布清单强制 compressed 路径再开 P06 拷贝工单。
3. **失败壳 class** 靠 `compareFeedback !== structureNote` 推断；若将来成功文案改写，需同步。
4. **页角动效** 在 `prefers-reduced-motion` 下 CSS 关闭；状态仍会短暂挂 class（无害）。
5. **外挂 polish/patch 仍在部署目录**（P22 未做）；源码树未链外挂。
6. **本刀未 `npm install` / 未跑 vitest / 未 build**。
