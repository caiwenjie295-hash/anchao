# Fold round 2 notes — P07 + P13–P15 + P10–P12

对照：现网 `AnChao/assets/anchao-polish.css`；计划 `polish-fold-plan.md`（④⑤⑥）。
源码根：`/workspace/anchao/source/暗潮-精简源码-fc11b3bc-20261020/`
时间：2026-10-20（Asia/Shanghai）

**未碰：** P09 页角翻页、P18/P19/P22、P03/P04 资源换图；解锁 / 验证 / `matchFeatureId` / 存档 / flag / stage；正确答案（桥头 黑/补/母）；第一刀 P08/P01/P16 未回滚。

---

## 改动文件

| 文件 | 项 |
|------|----|
| `src/act2/t07Finale.css` | P07（P01 缺口三态块保留） |
| `src/components/investigation/investigation.css` | P13 |
| `src/act2/t02Bridge.css` | P13 token + P14 + P15 |
| `src/act2/act2ShelfMap.css` | P10 |
| `src/scenes/act2/Act2ShelfMap.tsx` | P10 class 微调 |
| `src/act2/t03Library.css` | P11 + P12 |
| `src/scenes/act2/LibraryResearch.tsx` | P11 暖灰确认条 markup |

未改：`BridgeInvestigation.tsx` 逻辑/答案、`saveMigration.ts`、`act2_bridge.json` correct、`matchFeatureId`、`data/act2_t07.json`（P08 仍在）、`styles.css`（P16 仍在）。

---

## ④ P07 — T07 终章暖纸茶边

路径：`t07Finale.css` **约 L211+**（注释 `P07 — T07 warm paper / tea desk`）。

- Desk token：纸 `#ebe6dc` / 茶 `#8a6a3b` / 墨线 `#2a2926`；整体去成功绿为主色。
- 对照区 XP 窗：`.t07-finale__compare-grid::before`「外观对照」标题条 + 暖纸双侧。
- 胶片 / 时间轴 / seek / filmstrip pressed → 茶边暖纸，非 `#4d6b63`/`#315b45`。
- 主 CTA（对照提交、进 Act3、ending continue、capture-followup 按钮）→ 墨纸反白，非过关绿。
- **保留** P01（约 L82–153）：暖灰缺口三态未改写。

---

## ⑤ P13–P15 — 桥头 elders

### P13
- `investigation.css`：`--act2-field-notes` token 改为暖纸/茶；底栏 ready 主色 `#8a6a3b`。
- 与 `--exploration` 叠用时，用更高特异度选择器压过探索青绿（含「去县图书馆」）。
- `t02Bridge.css`：`--bridge-accent` 等改为茶系硬值。

### P14
- 老人热区：白粗虚线+重阴影 → 浅茶虚线 focus-box；`:hover` 与 `--active` / `is-active` 分离。
- 角标数字改为茶底。

### P15
- 错提示：暖茶左边+纸底（非绿灰）。
- 选项选中：暖纸茶边（`:has(input:checked)`），非过关绿。
- `confirm:not(:disabled)`：茶主色。
- `resolution`：页内 section（茶顶条+纸底），非模态。
- **未改** `correct` 黑/补/母、验证逻辑、TS 答案。

---

## ⑥ P10–P12 — 图书馆皮（不含 P09）

### P10
- `act2ShelfMap.css`：disabled 热区去边框/底板 → 纯图注；文字入口 disabled 同理。
- `Act2ShelfMap.tsx`：disabled 时加 `act2-shelf-map__hotspot--caption`；文案仍「待查阅」（测试可保留）。
- 可选中态：暖选中 ≠ hover；去 `#315b45` 选中板。

### P11
- `.act2-library__excerpt-button`：去 accent 绿边 → 墨纸 CTA；disabled/已摘录暖纸。
- `LibraryResearch.tsx`：摘录后 `data-excerpt-state="saved"` + `.act2-library__excerpt-confirm`「摘录已收入调查笔记。」暖灰条（非成功绿模态）。

### P12
- 目录 section / 关键词：选中=暖纸茶边，hover≠selected；`:focus-visible` 茶环；杀 sage `#315b45` focus/选中绿。

---

## 本地怎么验

1. **P07**：T07 终章纸茶桌面；对照窗有「外观对照」条；主按钮墨纸；缺口框仍暖灰三态（P01）。
2. **P13–15**：桥头壳无青绿；老人热区浅茶虚线，hover≠选中；错字提示暖茶；确认钮茶；resolution 页内展开。辨识仍交 黑/补/母。
3. **P10–12**：书架未开锁时「待查阅」像图注非按钮；摘录成功暖灰条；目录/关键词选中茶边非绿。
4. 可选：`npm test -- --run src/scenes/act2/Act2ShelfMap.test.tsx src/scenes/act2/LibraryResearch.test.tsx src/scenes/act2/BridgeInvestigation.test.tsx`（本刀未 `npm install` / 未跑全量）。

---

## 风险 / 未改项

1. **P09 页角翻页**未做（本刀明确排除）；polish 的 `.anchao-lib-page-turn*` 未移植。
2. **P05 错帧教学 / 胶片静音标签**未做；T07 非外景帧静音靠后续刀。
3. **t07Finale.css** 前半仍留有旧绿默认值，靠文末 P07 后写覆盖；若某选择器特异度不够，个别绿点可能露头——以 capture-followup / CTA 已用 `!important` 压死。
4. **`--exploration` 单独使用**（无 field-notes）仍是青绿；仅桥头叠 class 时被茶压过。`--memory` 主题未动。
5. **`:has(input:checked)`**（P15 选项）需较新 Chromium/Safari；与现网 polish 一致。
6. **外挂 polish/patch 仍在部署目录**（P22 未做）；源码树未链外挂。
7. **第一刀** P08 石砌空隙 / P01 缺口三态 / P16 Act1 噪声仍在。
