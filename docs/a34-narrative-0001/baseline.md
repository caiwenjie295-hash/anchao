# A34-NARRATIVE-0001 基线与审计（N0）

> 依据 `docs/work_orders/工单/A34-NARRATIVE-0001.md` §12 阶段 N0。

## 1. 分支与基线

| 项目 | 值 |
| --- | --- |
| 分支 | `Bunny_1`（沿用，不新建 `bunny_1`） |
| 工作目录 | `D:/暗潮开发/暗潮-跨电脑开发包-2026-09-24/暗潮-worktrees/Bunny_1-parallel` |
| **BASELINE_SHA** | **`63bf0885b878588d43e28b21f6472eebcf35f26d`** |
| 存档 schema | **10**（`supportedSchemaVersions = [1..10]`） |
| 前置工单 | `UX-T07-UI-0001`（图片几何/入口可见性/配色/T06 实名材料/二至三幕入口） |

### 前置任务交接状态

`UX-T07-UI-0001` 的 E/H/I 已实现并提交；`docs/reviews/Bunny_1-2026-09-30.md`
结论为 **CHANGES_REQUESTED**，其两个 P1 已在 `63bf088` 修复：

- P1 存档 schema 9→10 二次载入丢失学校完成事实 → 新增 `legacyCompletionMigrated` 持久记录。
- P1 PhotoViewport 切镜头后 ResizeObserver 仍绑定旧 frame → 观察器改为随 `sceneKey` 重新绑定。

`git diff main...Bunny_1 --check` 已通过（清理了 `docs/ux234` 两处 EOF 空行）。
**本工单不得撤销上述修复。**

## 2. 脏工作区保护

以下为本机既有修改，**不纳入本工单任何提交**：

```text
 M scripts/new-worktree.sh
 M scripts/quality-gate.sh
```

主仓库的 `data/story_transitions.json` 修改、小说 docx 删除状态与未跟踪图片**只读**。

## 3. 小说来源校验

| 文件 | SHA-256 | 与工单声明 |
| --- | --- | --- |
| `暗潮/暗潮_0916_校订稿.pdf`（39 页） | `467B309362B50E57A636918190B9801D45F0E651A3F6D3C5C624B9C05A497EDE` | **一致** |
| `暗潮/暗潮_第一轮文学精修.docx` | `760C9721636D8F12C914A599EF70985F6B6DC9FB4555B732ECD54017E9D9A6EA` | **一致** |

两文件均存在且未被修改。第一轮精修稿只覆盖到第十章，**第四幕原文一律取自完整 PDF**。

## 4. 已复核的实现问题（全部属实）

工单 §3 的判断经源码核对成立，位置如下：

| 编号 | 泄漏/问题 | 实测位置 | 玩家可见 |
| --- | --- | --- | --- |
| D-1 | 教室标语镜头直接写出模型指令 | `data/act3_t02.json:101` `LENS_A3_T02_005.description`：「标语留白由网页正文渲染，**不让模型生成**可读文字」 | **是**（镜头正文） |
| D-2 | 笔记扉页用系统指令替代人物动机 | `data/act3_t07.json:176`：「**其余页暂不阅读**」 | **是**（镜头正文） |
| D-3 | 同一段镜头说明复用于照片标题与所有热点详情 | `src/scenes/act3/Act3Investigation.tsx` 用 `lens.description` 同时驱动两者 | **是** |
| D-4 | 配图替代文本泄漏生成指令 | `src/data/act4/laterContent.ts` `shot()` 给每个 `imageDescription` 前缀拼入「**低饱和、手机拍摄、极度写实**」，而该字段被用作 alt/aria-label | **是**（无障碍名称） |
| D-5 | 档案段混入视角说明 | `laterContent.ts:33` `A4_T08_ARCHIVE.text`：「**档案只在我这一段经历中出现**」 | **是**（人物正文） |
| D-6 | 生日段正文以制作语气收尾 | `content.ts:89`：「家门就在眼前，**画面停在这里**」 | **是**（人物正文） |
| D-7 | 神龛对照素材选择有误 | `Act3Investigation.tsx:177` 用 `IMG_A1_I_001`（**破庙外景**）与 `IMG_A3_T06_007`（厨房空神龛）并置；原作的塑像/空石座联系不是由外景支持 | **是** |
| D-8 | 第四幕正文藏于 PhotoViewport 与弹窗 | `Act4Experience.tsx` 生日段、`Act4LaterExperience.tsx` 后半幕以 PhotoViewport 主导 | **是** |
| D-9 | 长叙述被 `photoCaptionLead` 截成首句（约 38 字） | `src/scenes/act4/photoCaption.ts` | **是** |
| D-10 | 24 道题仍是硬门槛 | `src/story/act4/actions.ts` A4_P01–P24；`laterFlow.ts` 与 StateManager 对 P13/P16/P18、包装三步、广播六步设门槛 | **是** |

另有两处**非玩家可见**的设计字段，确认不应自动透传 DOM：
`data/images.json:318` `IMG_A3_T02_005.purpose`「标语留白由网页正文渲染」、
`:378`/`:399` 的 `purpose` 含「留白以供文字层显示」等。这些是资源登记信息，
本轮不作为正文来源，但需确保不被渲染。

## 5. 现有流程复现（真实浏览器，800×656）

第二幕完成后直连第三幕 `T00`，正文实际呈现：

```text
第三幕 · 鸡头岭 / 再次出发
远处观察 · 两天后的清晨，鸡公岭还是那片湿冷的山。……
可前往地点与主要行动：前往县城补给 / 确认再次进山结论（查看原因）
```

对照图中可确认「确认再次进山结论」在初始镜头处于 **blocked**，
与 D-10「门槛由旧题/Flag 决定」一致。

## 6. 共享文件写入者确认

本工单与 Luna 的 `UX-234-REWORK` 共用 `stateManager`、存档、第三四幕组件与调查壳层。
用户已确认**串行执行**，本工单在 `Bunny_1` 上追加提交，不新建 worktree。
不得修改其他 worktree 与 main。

## 7. N0 阶段产出

- `baseline.md`（本文件）
- `player-text-audit.md`：逐条旧→新文案与渲染链（阶段 N1 完成）
- `source-map.md`：PDF 取材与来源登记（阶段 N2 完成）
