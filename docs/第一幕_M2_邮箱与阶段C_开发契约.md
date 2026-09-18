# 《暗潮》第一幕 M2 邮箱与阶段 C 开发契约

> 状态：权威执行契约  
> 基线：M0 与 M1 验收后的工作区，2026-09-17  
> 实现角色：`T03 · 邮箱与旧邮件调查`  
> 规则：T03 可读但不得修改本契约、其他 docs、维护导航和 game 基准文档

## 1. 目标

把邮箱从空壳变成高密度、可搜索、可阅读、可存档的真实私人邮箱，完成第一幕阶段 C：玩家从生活与求职噪音中打开小A于 2020-04-19 发来的旧邮件，得到日期与 XX 县定位。

## 2. 必须交付

- 数据驱动的邮件夹、邮件列表、搜索、已读/未读、星标、附件占位和详情阅读。
- 至少 36 封内容完整的邮件，包含春招推送、面试邀请、offer、拒信、学校通知、验证码、购物、订阅、广告和服务通知。
- 收件箱、星标、草稿箱、已发送、订阅邮件、垃圾箱与已归档入口。
- 小A关键邮件内容必须包含：发件人小A、`2020-04-19`、“我要出门一趟”、“不要担心”、`XX县`定位。
- “已发送”中存在主角当年的回复，之后无小A回信。
- 邮件阅读和星标状态可存档，刷新后恢复。
- 关键邮件打开后写入阶段 C 相关 Flag，且对先看邮件/先看母亲消息的不同顺序都容错。
- 数据 Schema、引用完整性、存档迁移、搜索、排序和剧情 Flag 自动测试。

## 3. 视觉与交互规范

用户提供的 163 邮箱截图只作为信息架构与密度参考，不复制其商标、配色、帐号、AI 广告、图标或品牌文案。

- 美学方向：私人电脑中长期使用的工具型邮箱，高信息密度、中性冷白表面、少量 Windows 蓝。
- 记忆点：当现代邮件列表中出现 `2020-04-19` 旧时间锚点时，仅通过日期与轻微时间分组线产生不协调感，不使用恐怖滤镜。
- 宽窗口（内容宽度 `>= 960px`）：左侧文件夹 + 中间列表 + 右侧阅读面板。
- 中等窗口：左侧文件夹 + 邮件列表；打开邮件后主区切换为详情，提供返回列表。
- 窄窗口：文件夹收纳为可操作的顶部入口，不只靠横向滚动。
- 列表顶部包含搜索、刷新、标记已读与星标等真实控件；不实现 AI 邮件功能。
- 邮件行保持紧凑，展示发件人、主题、预览、时间、星标和已读差异。
- 所有交互使用语义化按钮、键盘焦点与可读标签，并尊重 `prefers-reduced-motion`。

## 4. 核心邮件置顶规则

- `MAIL_A1_C_001` 小A关键邮件必须出现在收件箱顶部的“置顶”分组，不因日期降到 2020 分组。
- 关键邮件初始状态为“已读 + 置顶”，表示主角当年看过并保留过，不用未读粗体制造任务高亮。
- 置顶分组至少还包含 2 封普通邮件（如学校通知、求职材料备份），小A邮件不得成为唯一显眼项。
- 置顶仅使用与其他置顶邮件相同的图钉/分组样式，不闪烁、不放大、不使用“关键线索”标签。
- 玩家必须主动打开该邮件才设置剧情 Flag；只在列表看见不推进剧情。

## 5. 数据 Schema

### `data/mail_folders.json`

每项包含：`id`、`title`、`act`、`phase`、`source`、`purpose`、`unlockCondition`、`relatedFlags`、`notes`、`folderKey`、`label`、`sortOrder`。

### `data/mails.json`

每项包含通用可追溯字段，并包含：

```text
fromName, fromAddress, toAddresses, sentAt, folder,
subject, preview, body, initiallyRead, pinned,
initiallyStarred, labels, attachmentIds
```

- `folder` 只允许 `inbox | sent | subscriptions | spam | trash | archive | drafts`。
- 附件引用 `data/files.json` 中的 `FILE_*` 对象，正式文件素材暂缺时显示带 ID 的占位。
- 任何 UI 组件不直接导入 JSON；由 `src/data/mailData.ts` 统一校验和输出。

## 6. 状态、事件与剧情

### 持久化邮箱状态

在现有存档中向后兼容增加：

```text
modules.mail.readIds: string[]
modules.mail.starredIds: string[]
```

- 旧版存档无 `modules` 时自动补默认值，不白屏。
- 写入只通过 `StateManager.markMailRead(mailId)` 和 `StateManager.toggleMailStarred(mailId)`。
- 搜索词、当前文件夹和当前选中邮件可作为 UI 局部状态，不影响剧情。

### 新增公开事件

```text
mail:opened  { mailId }
```

### 正式 Flag

```text
FLAG_A1_MAIL_XIAOA_FOUND
FLAG_A1_MAIL_XIAOA_OPENED
FLAG_A1_DATE_20200419_KNOWN
FLAG_A1_LOCATION_KNOWN
```

- 打开 `MAIL_A1_C_001` 时一次性写入上述四个 Flag。
- `FLAG_A1_XIAOA_MISSING_KNOWN` 与 `FLAG_A1_MAIL_XIAOA_OPENED` 均为 `true` 时，游戏阶段设为 `C`。
- 若玩家先打开邮件，先保存邮件 Flag；后续得知小A失踪时再进入 C。
- 若玩家先得知失踪，打开关键邮件后立即进入 C。

## 7. T03 独占写入区

```text
src/App.tsx
src/components/AppShell.tsx
src/core/types.ts
src/core/defaultState.ts
src/core/saveManager.ts
src/core/saveManager.test.ts
src/core/stateManager.ts
src/core/stateManager.test.ts
src/data/mailData.ts
src/data/mailData.test.ts
src/modules/mail/**
src/story/act1PhaseCController.ts
src/story/act1PhaseCController.test.ts
src/styles.css
data/mail_folders.json
data/mails.json
data/files.json
data/events.json
data/flags.json
```

其他所有路径只读。T03 必须保留 T01/M0 和 T02/M1 的桌面、微信、状态与测试行为，不得删除、移动、重命名、覆盖或全局格式化边界外文件。

## 8. 非目标与延后项

- 不实现真实发信、删除、移动、垃圾箱恢复或邮件服务器。
- 不实现 AI 搜索、会员广告、网易/163 品牌或用户截图中的真实帐号信息。
- 不实现浏览器搜索、新闻、百科、地图或鸡头岭线下场景。
- 用户提供的深色搜索结果截图已登记为 T04 视觉参考，T03 只读，不实现。
- 正式邮件头图、头像、附件预览和图标延后——只保留有 ID 的占位。

## 9. 执行与验证

1. T02 修复并通过主任务验收后，T03 才开始写入。
2. T03 在独占路径内实现邮箱数据、UI、状态和阶段 C。
3. T03 运行 `npm test` 和 `npm run build`。
4. T03 检查所有邮件 ID 唯一，文件夹/附件/Flag 引用可解析，邮件总数不少于 36。
5. T03 本地验证宽/中/窄窗口、置顶分组、搜索、文件夹、邮件详情、键盘焦点和刷新恢复。
6. 主任务复核变更路径，重跑组合验证并更新文档。

## 10. 冲突与最终报告

- 命名冲突：本契约优先，不在局部创造近义 ID/Flag。
- 需要跨边界修改：停止写入并报告主任务。
- 已有文件：视为用户或其他任务工作，不还原、不删除。
- 最终报告必须包含：`Role`、`Delivered`、`Changed paths`、`New IDs`、`New flags`、`Validation run`、`Deferred or blocked`、`Cross-boundary requests`。
