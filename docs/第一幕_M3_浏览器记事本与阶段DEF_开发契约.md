# 《暗潮》第一幕 M3 浏览器、记事本与阶段 D–F 开发契约

> 状态：权威执行契约  
> 基线：M0、M1、M2 验收后的工作区，2026-09-17  
> 实现角色：`T04 · 浏览器调查与记事本`  
> 规则：T04 可读但不得修改本契约、其他 docs、维护导航和 game 基准文档

## 1. 目标

完成第一幕桌面调查的后半段：补足人物关系背景，让玩家通过一个有真实噪音的内部伪互联网自行确认小A在鸡头岭附近失踪、搜救未发现人或尸体、路线全长约七公里且并非极端困难，并由记事本自然形成疑问，进入阶段 F 的“准备前往鸡头岭”状态。

本节点结束时只完成出发动机与状态，不制作鸡头岭山路、山洞、破庙或任何正式美术。

## 2. 必须交付

- 数据驱动的浏览器：搜索栏、搜索建议、结果页、内部页面、标签页、前进/后退、历史记录。
- 至少 7 组规范搜索方向，至少 20 个可打开页面；每组结果同时含强相关、弱相关和无关内容。
- 页面类型至少覆盖地方新闻、百科、徒步攻略、天气、地图、论坛、自媒体、同名地点、其他事故与商业内容。
- 所有网页都在应用内渲染；外观可显示虚构 URL，但不得访问真实互联网或跳出游戏。
- 阶段 E 三个正式 Flag、搜索/访问持久化、刷新恢复和剧情顺序容错。
- 记事本支持玩家自由输入、自动线索条目、刷新恢复；自动弱提示必须逐字为：`七公里的路线，为什么连人或尸体都找不到？`
- 阶段 F 满足条件后，以自然的记事本文字表达“去鸡头岭看看”，不得出现 YES/NO 任务弹窗。
- 在现有微信数据中补入阶段 D 所需的人物关系与生活内容；沿用现有消息渲染与占位资源，不重写微信 UI。
- Schema、引用完整性、搜索排序、状态存档、剧情 Flag 与阶段收敛自动测试。

## 3. 冻结的剧情规则

### 阶段 D：人物关系补完

- 在母亲、小月、高中同学群等既有联系人中增加生活化历史记录，覆盖：三人旧关系、小A高中时期变化、主角长期未联系小A、旧学校或三人合照。
- 内容仍以日常对话为主，不能将聊天改造成线索清单。
- 图片继续使用带现有资源 ID 规则的占位，不生成或下载正式图片。
- 阶段 D 是内容层，不设置新的强制 Flag，也不阻挡玩家直接使用浏览器。

### 阶段 E：浏览器调查

规范搜索方向：

```text
XX县失踪
2020 XX县失踪
徒步失踪
鸡头岭
鸡头岭徒步
鸡头岭事故
XX县 鸡头岭
```

玩家必须通过打开不同页面分别得到：

- 小A确实在鸡头岭附近失踪；
- 搜救没有找到人或尸体；
- 徒步线路约七公里，难度不算极端；
- 路线尺度与“彻底消失”存在矛盾。

不得用唯一正确结果、任务箭头、闪烁、高亮“关键线索”标签或自动 AI 摘要替玩家完成判断。

### 阶段 F：决定前往鸡头岭

进入 F 至少要求以下条件全部满足：

```text
FLAG_A1_XIAOA_MISSING_KNOWN
FLAG_A1_MAIL_XIAOA_OPENED
FLAG_A1_NEWS_FOUND
FLAG_A1_ROUTE_INFO_FOUND
```

本节点只把 `game.phase` 设为 `F` 并添加自然记事本条目，不创建场景页、不自动跳转、不增加“开始任务”按钮。

## 4. 视觉与交互规范

用户提供的深色搜索结果截图只作为信息架构、密度与暗色表面参考，不复制 Google 商标、图标、AI 概览、帐号信息或具体搜索结果。

- 美学方向：Windows 私人电脑里的中性暗色浏览器，灰黑表面、低饱和蓝色链接、紧凑信息层级。
- 记忆点：结果看起来足够普通，只有跨页面对照后的“七公里”与“无人/尸体未发现”产生不协调感。
- 浏览器顶部保留标签、地址/搜索输入、后退/前进与历史入口；控件不做纯装饰。
- 搜索结果展示来源、虚构域名、标题、摘要和可选日期；相关度不通过颜色强弱直接泄露。
- 内部页面有可读标题、来源、日期和正文，不允许只有一段“你发现了线索”。
- 宽/中/窄窗口均可用；窄窗口结果不横向溢出，标签栏和历史入口可收纳。
- 记事本保持朴素文本工具质感，自动条目与玩家文本有轻微结构区分，但不使用任务清单视觉。
- 所有交互使用语义化按钮、表单、可见焦点与可读标签，并尊重 `prefers-reduced-motion`。

## 5. 数据 Schema

### `data/browser_pages.json`

每项包含通用可追溯字段，并包含：

```text
pageType, url, domain, publishedAt,
headline, snippet, body, keywords,
resultTier, triggerFlags
```

- `pageType` 只允许 `news | encyclopedia | trail-guide | weather | map | forum | self-media | same-name | incident | commercial`。
- `body` 为非空字符串数组；关键事实必须写在页面正文中，不能只藏在组件条件里。
- `resultTier` 只允许 `strong | weak | noise`，仅用于排序校验，不直接显示给玩家。
- `triggerFlags` 只能引用 `data/flags.json` 中已登记的 Flag。

### `data/search_queries.json`

每项包含通用可追溯字段，并包含：

```text
query, aliases, suggestionTerms, resultPageIds
```

- 搜索需做首尾空格、连续空格与大小写归一；规范查询及合理别名必须映射到同一结果集。
- 每组 `resultPageIds` 不少于 6 个，且至少包含一个 `strong`、两个 `weak/noise` 页面。
- 结果顺序由数据决定，组件不得把关键页硬插到第一位。

### `data/notes.json`

每项包含通用可追溯字段，并包含：

```text
content, entryType, triggerFlags
```

- `entryType` 只允许 `clue | decision`。
- `NOTE_A1_E_001` 的内容固定为 `七公里的路线，为什么连人或尸体都找不到？`。
- 自动条目按 ID 去重，刷新后不得重复插入。

### `data/clues.json`

登记本节点正式线索，至少包括失踪新闻、鸡头岭路线和矛盾判断；只存元数据与关联 ID，不重复整页正文。

## 6. 状态、事件与剧情

### 持久化模块状态

在现有存档中向后兼容增加：

```text
modules.browser.queryHistory: string[]
modules.browser.visitedPageIds: string[]
modules.notepad.userText: string
modules.notepad.autoEntryIds: string[]
```

- 旧存档缺少 `browser` 或 `notepad` 时补默认值，不改变 `schemaVersion: 1`，不白屏。
- 查询历史去重并限制为最近 20 条；访问页 ID 去重。
- 写入只通过 `StateManager` 的公开方法，不允许组件直接改状态或 Flag。

### 新增公开事件

```text
browser:searched       { query }
browser:page-opened    { pageId }
notepad:auto-entry-added { entryId }
```

### 正式 Flag

```text
FLAG_A1_NEWS_FOUND
FLAG_A1_ROUTE_INFO_FOUND
FLAG_A1_MISSING_CASE_SUSPICIOUS
```

- 打开指定地方新闻页时写入 `FLAG_A1_NEWS_FOUND`。
- 打开指定徒步路线页时写入 `FLAG_A1_ROUTE_INFO_FOUND`。
- 两者都成立时写入 `FLAG_A1_MISSING_CASE_SUSPICIOUS`，添加 `NOTE_A1_E_001`，并把阶段推进到 `E`（若尚未到 E）。
- 四项阶段 F 前置条件满足时设置 `game.phase = F`，添加一个自然的 decision 条目。
- 两个关键页面无论先后顺序都必须收敛；相关 Flag 已存在时重复打开页面不得重复添加自动笔记。

## 7. T04 独占写入区

```text
src/App.tsx
src/components/AppShell.tsx
src/core/types.ts
src/core/defaultState.ts
src/core/saveManager.ts
src/core/saveManager.test.ts
src/core/stateManager.ts
src/core/stateManager.test.ts
src/data/browserData.ts
src/data/browserData.test.ts
src/data/noteData.ts
src/data/noteData.test.ts
src/data/wechatData.test.ts
src/modules/browser/**
src/modules/notepad/**
src/story/act1PhaseEFController.ts
src/story/act1PhaseEFController.test.ts
src/styles.css
data/browser_pages.json
data/search_queries.json
data/notes.json
data/clues.json
data/flags.json
data/events.json
data/chats.json
data/images.json
```

其他所有路径只读。T04 必须保留 T01–T03 的桌面、微信、邮箱、状态与测试行为，不得删除、移动、重命名、覆盖或全局格式化边界外文件。

## 8. 非目标与延后项

- 不接真实搜索引擎、网络请求、外部链接、地图 SDK 或天气 API。
- 不复制 Google、百度、Bing 或用户截图中的商标与帐号信息，不实现 AI 概览。
- 不制作鸡头岭山路、山洞、破庙、A.W、“补”、照片编辑或双 S。
- 不生成、下载或嵌入正式图片；所有图像继续使用可追溯占位。
- 不新增依赖、路由框架、UI 组件库或动画库。
- 不把阶段 F 设计成任务弹窗或确认对话框。

## 9. 执行与验证

1. T03 经主任务验收后，T04 才开始写入。
2. T04 先建立数据校验与状态 API，再实现浏览器、记事本和剧情控制器。
3. 运行 `npm test` 和 `npm run build`。
4. 验证所有页面、查询、笔记、线索、事件与 Flag ID 唯一且引用可解析。
5. 自动测试规范查询/别名、噪音混排、关键页两种访问顺序、旧存档迁移、自动笔记去重与阶段 F 四条件。
6. 本地验证宽/中/窄窗口、键盘搜索、建议、结果、页面、标签、历史、返回/前进、记事本输入与刷新恢复。
7. 主任务复核变更路径，重跑组合测试与构建，并更新进度、变更记录和维护导航。

## 10. 冲突与最终报告

- 命名冲突：本契约优先，不在局部创造近义 ID、Flag 或第二套数据源。
- 需要跨边界修改：停止该写入并报告主任务。
- 已有文件：视为用户或其他任务工作，不还原、不删除。
- 正式剧情文本只写入 `data/*.json`，UI 只读校验后的数据。
- 最终报告必须包含：`Role`、`Delivered`、`Changed paths`、`New IDs`、`New flags`、`Validation run`、`Responsive/interaction QA`、`Deferred or blocked`、`Cross-boundary requests`。
