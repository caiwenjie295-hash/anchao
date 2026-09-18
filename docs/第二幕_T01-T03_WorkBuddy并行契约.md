# 《暗潮》第二幕 T01–T03 WorkBuddy 并行契约

> 状态：权威执行契约
> 基线：`v0.8.0` / `f12b226`
> 执行模型：WorkBuddy `DeepSeek-V4.1-flash`
> 角色：Codex 主审；WorkBuddy 基础、T01、T02、T03 与集成任务
> 规则：执行任务可以读取但不得修改本契约

## 1. 目标与范围

### 目标

在完整保留第一幕 A–K 的前提下，实现可连续试玩的第二幕 T01–T03：互联网搜索失效、桥头老人“黑捕木→黑补母”口述辨识、县图书馆《补母志》检索与阅读。

### 必须交付

- 从“第一幕完”自然返回桌面并进入第二幕 T01，不清空第一幕证据、历史或窗口数据。
- T01 支持规范列出的模糊搜索词，结果只提供真实互联网噪音，不直接解释黑补母。
- T02 支持多老人生活对话、向指定老人展示三类既有证据、方言口述和三段同音字辨识。
- T03 支持地方志目录筛选、卷册选择、翻页、放大、书签、关键词标记和摘录。
- 精确写入本契约列出的 12 个 Flag，存档重载与清零正确。
- 桌面任务卡在 T01–T03 提供不泄露答案的下一步提示。
- 在线构建、离线单文件、自动测试及真实浏览器宽窄屏验收。

### 非目标

- 不实现 T04 三篇志异正文或卡片整理谜题。
- 不实现 T05–T07、高中、启明、论坛或宣传视频。
- 不生成正式图片或音频；本轮使用克制的 CSS 场景和 `data-asset-id` 资源空位。
- 不改变第一幕剧情、Flag、照片阈值、热点坐标或通关条件。
- 不连接真实搜索引擎、外部网页、地图或第三方服务。

### 延后

- 第二幕正式美术与音频：延后—不得实现。
- T04 开始方式：T03 结束后停留在完成态，不显示不可用的 T04 页面。

## 2. 冻结产品规则

- 运行文本统一使用“鸡公岭”；`game/05`、`game/06` 中的“鸡头岭”只视为历史旧称。
- 第二幕状态使用 `game.act = 2`，阶段 ID 依次为 `A2_T01`、`A2_T02`、`A2_T03`。
- 第一幕完成页新增中性按钮“回到桌面，继续调查”；只有 `FLAG_A1_COMPLETE === true` 才能调用 `StateManager.startSecondAct()`。
- 启动第二幕后保留全部第一幕 Flag、照片、搜索历史、邮件、微信、笔记与证据；不得重置或复制存档。
- T01 只能得出“互联网无有效解释，应线下调查”；任何网页不得出现“黑补母”正确名称、定义或县志内容。
- T02 指定线索老人只有在看过 `IMG_A1_I_001`、`IMG_A1_I_002`、`IMG_A1_I_003` 中至少一项后才说“黑捕木”；系统不自动纠正。
- T02 正确答案固定为 `黑` / `补` / `母`。中间字多次错误后可锁定“补”，但不能替玩家自动完成整题。
- T03 目录噪音必须包含地理沿革、山川河流、风俗、祠庙、乡贤、农业、灾害、方言、地方传说。
- T03 必须由玩家依次完成目录收窄、卷册打开、到达《补母志》正文、标记至少 3 个核心关键词并主动摘录，才设置完成 Flag。
- 《补母志》本轮只揭示：补缺、以有余补不足、食用来源可获得对应能力、民间供奉；不得提前揭示 T04 的记忆/身份转移结论。
- 所有场景对话、地方志条目、搜索页面和任务提示必须来自数据文件，UI 不硬编码剧情正文。
- 场景提供键盘操作、可见焦点、返回/关闭方式和 `prefers-reduced-motion`。

## 3. 冻结状态与事件接口

### Flag

```text
FLAG_A2_SEARCH_BU_ATTEMPTED
FLAG_A2_SEARCH_SS_ATTEMPTED
FLAG_A2_WEB_SEARCH_FAILED
FLAG_A2_OFFLINE_RESEARCH_NEEDED
FLAG_A2_ELDER_PHOTO_SHOWN
FLAG_A2_HEIBUMU_AUDIO_HEARD
FLAG_A2_HEIBUMU_NAME_SOLVED
FLAG_A2_COUNTY_RECORD_HINT_KNOWN
FLAG_A2_LIBRARY_ENTERED
FLAG_A2_LOCAL_GAZETTE_FOUND
FLAG_A2_BUMUZHI_FOUND
FLAG_A2_BUMU_RULE_BASIC_KNOWN
```

### 第二幕模块状态

基础任务必须在 `AppState.modules` 新增 `act2Research`，冻结结构：

```ts
type Act2Stage = 'inactive' | 'search' | 'bridge' | 'library';

interface Act2ResearchState {
  stage: Act2Stage;
  bridge: {
    talkedElderIds: string[];
    shownEvidenceAssetIds: string[];
    heardPhrase: boolean;
    nameChoices: { first: string | null; middle: string | null; last: string | null };
  };
  library: {
    visitedSectionIds: string[];
    openedVolumeIds: string[];
    currentPageId: string | null;
    bookmarkedPageIds: string[];
    markedKeywordIds: string[];
    excerptedEntryIds: string[];
  };
}
```

存档 `schemaVersion` 升为 `2`；必须向后迁移 schema 1，保留所有第一幕状态并为 `act2Research` 补默认值。存档键保持 `anchao.save.v1`，避免把玩家旧存档变成另一套存档。

### StateManager 公共方法

基础任务冻结并实现：

```ts
startSecondAct(): void
setAct2Stage(stage: 'search' | 'bridge' | 'library'): void
talkToAct2Elder(elderId: string): void
showAct2Evidence(assetId: string): void
setHeibumuNameChoice(part: 'first' | 'middle' | 'last', value: string): void
confirmHeibumuName(): void
visitGazetteSection(sectionId: string): void
openGazetteVolume(volumeId: string): void
openGazettePage(pageId: string): void
toggleGazetteBookmark(pageId: string): void
markGazetteKeyword(keywordId: string): void
excerptGazetteEntry(entryId: string): void
```

非法阶段、空 ID、缺少前置条件或重复操作必须无副作用；具体未知内容 ID 由对应内容模块的数据校验器阻止进入交互层。内容任务可以消费这些方法，但不得修改其签名。

### 新事件

```text
act2:started
act2:stage-changed
act2:elder-talked
act2:evidence-shown
act2:name-solved
act2:gazette-section-visited
act2:gazette-volume-opened
act2:gazette-page-opened
act2:gazette-keyword-marked
act2:gazette-entry-excerpted
```

## 4. 冻结数据与资源 ID

| 内容 | 数据入口 | ID 范围 |
| --- | --- | --- |
| T01 页面/查询 | 既有 `data/browser_pages.json`、`data/search_queries.json` | `PAGE_A2_T01_001+`、`QUERY_A2_T01_001+` |
| T01–T03 笔记 | `data/notes.json`（由 WB-0002 统一登记） | `NOTE_A2_T01_001`、`NOTE_A2_T01_002`、`NOTE_A2_T02_001`、`NOTE_A2_T02_002`、`NOTE_A2_T03_001` |
| T02 老人与对话 | 新建 `data/act2_bridge.json` | `ELDER_A2_T02_001+`、`DIALOG_A2_T02_001+` |
| T03 目录/卷册/页面 | 新建 `data/act2_library.json` | `SECTION_A2_T03_001+`、`VOLUME_A2_T03_001+`、`PAGE_A2_T03_001+` |
| 第二幕资源空位 | `data/images.json` 由最终集成任务登记 | `IMG_A2_T02_001+`、`IMG_A2_T03_001+`，`file: null` |

T02 展示证据只复用：`IMG_A1_I_001` 破庙外景、`IMG_A1_I_002` “补”字、`IMG_A1_I_003` 残缺塑像。

## 5. 执行波次与文件所有权

### Wave 1：WB-0001 第二幕基础

独占写入：

- `src/core/types.ts`
- `src/core/defaultState.ts`
- `src/core/stateManager.ts`
- `src/core/stateManager.test.ts`
- `src/core/saveManager.ts`
- `src/core/saveManager.test.ts`
- `src/core/eventBus.ts`
- `src/scenes/act1/Act1Ending.tsx`
- `src/App.tsx`

只实现共享状态、迁移、第一幕到第二幕入口，不实现 T01–T03 内容 UI。

### Wave 2A：WB-0002 T01 搜索失效

独占写入：

- `data/browser_pages.json`
- `data/search_queries.json`
- `data/flags.json`
- `data/notes.json`
- `data/task_guides.json`
- `src/data/browserData.ts`
- `src/data/browserData.test.ts`
- `src/data/noteData.ts`
- `src/data/noteData.test.ts`
- `src/data/taskGuideData.ts`
- `src/data/taskGuideData.test.ts`
- `src/story/act2T01Controller.ts`
- `src/story/act2T01Controller.test.ts`
- `src/act2/t01Search.css`

不得修改浏览器组件；必须在既有数据驱动搜索中完成。

### Wave 2B：WB-0003 T02 桥头老人

独占写入：

- `data/act2_bridge.json`
- `src/data/act2BridgeData.ts`
- `src/data/act2BridgeData.test.ts`
- `src/scenes/act2/BridgeInvestigation.tsx`
- `src/scenes/act2/BridgeInvestigation.test.tsx`
- `src/act2/t02Bridge.css`

不得修改核心状态、App、共享样式或资源清单。

### Wave 2C：WB-0004 T03 县图书馆

独占写入：

- `data/act2_library.json`
- `src/data/act2LibraryData.ts`
- `src/data/act2LibraryData.test.ts`
- `src/scenes/act2/LibraryResearch.tsx`
- `src/scenes/act2/LibraryResearch.test.tsx`
- `src/act2/t03Library.css`

不得修改核心状态、App、共享样式或资源清单。

### Wave 3：WB-0005 最终集成

独占写入：

- `src/App.tsx`
- `src/scenes/act2/Act2Experience.tsx`
- `src/story/act2T01T03.acceptance.test.ts`
- `data/images.json`
- `scripts/verify-offline.mjs`
- `src/styles.css`（只允许第二幕入口与通用外层）
- `src/imageAssets.css`（只允许第二幕资源空位）

Codex 主审独占：

- 本契约与全部 `docs/work_orders/**`
- `维护导航.md`
- `docs/progress_log.md`
- `docs/todo.md`
- `docs/changelog.md`
- `docs/reviews/**`
- 合并、标签与 worktree 清理

任何不在当前任务写入区的文件均视为其他角色或用户的进行中工作，不得编辑、删除、移动、格式化或回退。

## 6. 执行顺序

1. WB-0001 从 `main` 建立基础分支，实现状态、事件、迁移和第二幕入口。
2. Codex 审查 WB-0001；质量门禁通过后合并 `main`。
3. WB-0002、WB-0003、WB-0004 从同一个已审查基础提交并行建立 worktree，均使用 `DeepSeek-V4.1-flash`。
4. Codex 分别审查三条分支；不合格的分支退回原 WorkBuddy 任务修正。
5. 三条内容分支通过后按 T01→T02→T03 顺序合并到临时 `integration/WB-0005-act2-t01-t03`。
6. WB-0005 只完成接线、资源空位、综合测试和离线验收。
7. Codex 做最终所有权审计、完整测试、宽窄屏试玩、文档更新；`APPROVED` 后合并 `main`。

## 7. 冲突协议

- 名称、Flag、阶段、公共方法或资源 ID 冲突：本契约优先，不得本地改名。
- 发现必须修改他人路径：停止该写入并报告 Codex，不得绕过。
- 内容组件需要核心能力：使用冻结 `StateManager` 方法；不得直接写状态或 localStorage。
- 正式图片缺失：保留 CSS 空位与 `data-asset-id`，不得生成或伪造图片文件。
- 第一幕回归失败：视为阻断缺陷，禁止合并。
- 既有脏文件：保留并报告，禁止 reset、覆盖或全局格式化。
- 契约缺陷：只有 Codex 主审可修改。

## 8. 验收矩阵

| 验证 | 负责人 | 通过条件 |
| --- | --- | --- |
| schema 1→2 迁移 | WB-0001 + Codex | 第一幕旧存档全部保留，新增模块使用默认值 |
| 第一幕回归 | 每个任务 + Codex | 现有 59 项测试和 A–K 离线流程不退化 |
| T01 内容 | WB-0002 + Codex | 指定模糊查询、噪音混排、无答案结论与笔记生效 |
| T02 内容 | WB-0003 + Codex | 多老人、证据展示、方言和同音字解谜门槛正确 |
| T03 内容 | WB-0004 + Codex | 目录、卷册、翻页、书签、标记、摘录与表层规则正确 |
| 所有权 | Codex | 每条分支只修改工单授权路径 |
| 综合自动测试 | WB-0005 + Codex | `npm run quality:gate` 通过 |
| 真实浏览器 | Codex | 宽屏与 390px 窄屏从幕末连续试玩到 T03 完成 |

## 9. WorkBuddy 最终报告

```text
Role:
Model: DeepSeek-V4.1-flash
Delivered:
Commit SHA:
Changed paths:
Validation run:
Deferred or blocked:
Cross-boundary requests:
```
