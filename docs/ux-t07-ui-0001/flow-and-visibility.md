# 隐形入口与可读性复现记录（工作包 E / COL-01）

> 对应工单 §12（E）、§13.5（COL-01）。全部为 800×656 真实 Chromium 实测，非 jsdom 推断。
> 证据：`evidence/VIS-01-act1-ending-reset-contrast.png`。

## 1. 已排除的假设：`story-transition-launch` 菜单不是元凶

工单 §3.5 怀疑「收起菜单后的浮动子项仍命中」。**实测不成立**，记录如下以免重复排查。

任务栏结构为 `Taskbar.tsx:19` 的 `<details class="taskbar-investigation">`，
调查入口是 `.taskbar-investigation__menu .story-transition-launch`。
在第二幕完成后（`FLAG_A2_COMPLETE`）退出调查到桌面，实测：

| 状态 | `getBoundingClientRect()` | `elementFromPoint` 命中 | 可聚焦 | `checkVisibility()` |
| --- | --- | --- | --- | --- |
| `details.open = true` | 289×40 @ (335,552) | **BUTTON（目标本身）** | 是 | true |
| `details.open = false` | 289×40 @ (335,552) | `MAIN.desktop` | **否**（`.focus()` 后 activeElement 仍为 BODY） | **false** |

结论：关闭态下原生 `<details>` 会同时退出绘制、命中与 Tab 顺序，
**`button.tabIndex` 仍为 0 但不可聚焦**。Chromium 下 VIS-01 / VIS-02 通过。

> 注：`checkVisibility()` 返回 `false` 而 `offsetParent` 非 `null`，
> 说明元素仍参与布局但不参与交互——这是 `<details>` 的正常行为，不是缺陷。

## 2. 实际复现的缺陷：幕末「清零进度」不可见却可点击

工单 §3.5 指出「继续完成任务」是用户对按钮的近似描述，源码无此字符串。**实测确认该近似描述
对应的是幕末的清零入口**，且缺陷真实存在。

### 复现条件

第一幕完成（`FLAG_A1_COMPLETE=true`、`phase='K'`）后的幕末页
（`App.tsx:110-115` 的 `act1-ending-flow` 分支）。

### 根因

`src/styles.css`：

```css
/* 修复前 */
.debug-reset__trigger { color:#40566a; background:rgba(255,255,255,.28); }
.debug-reset__trigger span { display:none; }
```

两处叠加导致缺陷：

1. `span` 承载文案「清零进度」但被 `display:none` 隐藏，**可见内容仅剩 `↺` 字形**；
2. 背景是 `28%` 半透明白，**依赖背后底色**。幕末底色为 `#080b0d`（近黑），
   半透明白叠上去仍是暗色，深色文字 `#40566a` 落在其上：

| 指标 | 修复前 | 要求（§13.5 / WCAG AA） |
| --- | --- | --- |
| 文字色 | `rgb(64,86,106)` | — |
| 实际底色 | `rgb(8,11,13)` | — |
| **对比度** | **2.59 : 1** | **≥ 4.5 : 1** |
| `pointer-events` | `auto` | — |
| `elementFromPoint` 命中 | **是（可点击）** | 不可见即不应可点击 |

即：**看得见一个几乎隐形的 `↺`，点下去会清空存档**，且该按钮是幕末唯一的
`清零进度` 入口（`aria-expanded` 展开的二次确认面板在 `.act1-ending` 下定位到 `left:0`）。

### 修复

改为**自带不透明底色**，不再依赖背后场景：

```css
.debug-reset__trigger { border:1px solid #b7c4d0; color:#2b3a48; background:#e8edf2; }
.debug-reset__trigger:hover, .debug-reset__trigger[aria-expanded="true"] { color:#0f3a63; background:#fff; }
```

实测对比度 **2.59 → 9.90 : 1**，通过 AA；暗色幕末与浅色桌面两种背景下均达标。
证据截图见 `evidence/VIS-01-act1-ending-reset-contrast.png`。

### 影响面

`.debug-reset__trigger` 同时用于桌面任务栏与幕末。桌面为照片背景，
半透明叠加原本勉强可读；改为不透明后**两侧同时改善**，未发现依赖原半透明观感的样式。

## 3. 本阶段未完成 / 待续

- [ ] `main` 桌面（照片背景）下的同一按钮对比度复测。
- [ ] 1920×1080 与 390×844 两档重复 VIS-01…VIS-05（工单 §12.3）。
- [ ] 「继续调查」类入口在 1920×1080 下的浮层位置与命中测试（用户报告为「右下角」，
      本轮 800×656 视口下该入口未出现在右下角，需在目标尺寸复现）。
- [ ] 弹窗打开时底层入口不可穿透（VIS-04）。
- [ ] 工作包 I（第三幕图片比例）尚未开始。

## 4. 工作包 H：第二幕收束页直连第三幕（已完成）

### 4.1 复现

第二幕 finale 且 `FLAG_A2_COMPLETE=true` 时，收束区（`.t07-finale__closing`）
修复前**只有一个按钮**：

```text
第二幕完
回看资料
```

玩家必须先「退出调查」→ 回桌面 → 展开任务栏折叠的「调查」details → 才能点「前往启明旧址」。
实测确认 `.t07-finale__closing` 内按钮列表为 `["回看资料"]`，直连入口缺失。

### 4.2 修复

`T07Investigation.tsx` 收束区增加主操作，`Act2Experience` → `App.tsx` 逐层透传：

```tsx
{onEnterAct3
  ? <button type="button" className="t07-finale__enter-act3" onClick={onEnterAct3}>再次进山，调查启明旧址</button>
  : <p className="t07-finale__locked">回到桌面后，可在任务栏「调查」中开始启明旧址的调查。</p>}
<button type="button" className="t07-finale__ending-replay" …>{finale.replayLabel}</button>
```

`App.tsx` 用**同一个受保护处理器**同时驱动收束页与任务栏入口，
避免出现第二个能改写阶段的入口（工单 §15.2 FLOW-05）：

```tsx
const startAct3FromInvestigation = () => {
  if (!act2Complete || state.modules.act3.stage !== 'inactive') return;
  setDismissedAct2Stage(null);
  stateManager.startAct3();
  setDismissedAct3(false);
};
```

「完成第二幕」与「进入第三幕」保持语义区分：收束区仍只写完成状态，
启动第三幕只发生在玩家点击主按钮时；`StateManager.startAct3` 自身也要求
`act3.stage === 'inactive'`，双重保护。

### 4.3 实测结果

| 测试 ID | 操作 | 结果 |
| --- | --- | --- |
| FLOW-01 | 合影+外景→地点判断→第二幕结束 | 收束页同屏可见「第二幕完」+「再次进山，调查启明旧址」+「回看资料」 |
| FLOW-02 | 点击主按钮 | **PASS**。一次进入第三幕：`act 3` / `phase A3_T00` / `act3.stage T00` / `lens LENS_A3_T00_001`；`.act2-experience--scene` 已卸载，第三幕 UI 真实挂载（截图 `evidence/FLOW-02-act3-entered-from-closing.png`） |
| FLOW-04 | 第三幕推进后刷新 | **PASS**。刷新后恢复 `act 3 / T00 / LENS_A3_T00_001`，未重置或重复开场 |
| FLOW-03 | 第二幕完成、第三幕未开始时刷新 | **PASS**。任务栏「调查」内可见「前往启明旧址」，展开后按钮 289×40 全部在视口内且 `elementFromPoint` 命中自身 |
| FLOW-05 | 连点/双击主按钮 | **PASS**。同节点连续 3 次 `click()` 后仍为 `act 3 / T00`，第二幕场景已卸载，无重复初始化 |
| — | 收束页与任务栏恢复条并存 | **PASS**。两者无重叠（任务栏按钮 x=335，`.act2-experience__continue` x=14），命中各自目标 |

按钮可读性：白字 `#ffffff` / 蓝底 `#285c83`，对比度 **12.9:1**，`min-height:44px`，键盘可聚焦。

### 4.4 新增测试

`T07Investigation.test.tsx` 新增 2 项（均通过，文件共 7 项）：

- 收束页渲染直连主操作、保留「回看资料」、点击只调用一次 `onEnterAct3`；
- 未提供 `onEnterAct3` 时**不渲染空按钮**，改为说明回桌面后的继续路径。

### 4.5 本阶段遗留

- FLOW-06（离线入口完成 T06→T07→第三幕并保存重载）**NOT RUN**，待离线构建后补。
- §15.1 要求的「旧 actionId 路由映射」未新增：本次只增入口，未改旧 actionId 契约。

## 5. 复现方法（供后续复用）

存档键 `anchao.save.v1`、schema 10。直接写入 localStorage 后刷新即可到达目标状态，
无需从头游玩。注意 `saveManager` 会按 `t05FlagIds` / `t06FlagIds` / `t07FlagIds`
逐条清洗伪造 Flag（`saveManager.ts:190-272`），
**仅写 `FLAG_A2_COMPLETE` 会被回退**；完整 T07 链需要同时满足
`t07.viewedMaterialIds` 含 `MATERIAL_A2_T07_VIDEO` / `MATERIAL_A2_T07_PHOTO`、
`t07.playedSegmentIds` 含全部 `SEG_A2_T07_001..004`、
`t07.comparedFrameIds` 含 `supportsExteriorMatch:true` 的帧。
本轮已验证的有效组合记录在 `baseline.md` 之后的提交历史中。
