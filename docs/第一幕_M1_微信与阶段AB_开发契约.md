# 《暗潮》第一幕 M1 微信与阶段 A–B 开发契约

> 状态：权威执行契约  
> 基线：M0 v0.1.0，2026-09-17  
> 实现角色：`T02 · 第一幕剧情数据与微信`  
> 规则：T02 可读但不得修改本契约、其他 docs、维护导航和 game 基准文档

## 1. 目标与范围

把微信从空壳变成第一个数据驱动的可玩应用，完成阶段 A–B：玩家自由接管电脑，打开微信后在生活内容中收到母亲的自然消息，并得知小A已失踪多年。

### 必须交付

- 数据驱动的微信联系人列表、会话页、未读红点和文本/图片/文件/语音占位气泡。
- 不少于 8 个生活化联系人：母亲、小月、大学室友、高中同学群、HR、老师、文件传输助手和至少一个纯生活联系人。
- 多组非主线历史消息，内容不超出阶段 B 可知范围。
- 首次打开微信后延迟 1200ms 触发母亲新消息；刷新或重复打开不重复触发。
- 阅读母亲会话后正确写入已读与认知 Flag。
- 消息触发前后均能通过存档正确恢复。
- 数据 Schema、触发逻辑和 UI 的自动测试。

### 非目标

- 不实现阶段 C 邮箱调查、阶段 D 完整人物补完或阶段 E 后内容。
- 不修改邮箱、浏览器、资源管理器、记事本和照片空壳。
- 不制作正式头像、照片、语音或附件；只用带资源 ID 的占位。
- 不解释小A失踪原因、鸡头岭、双S、“补”或启明。

## 2. 冻结剧情与状态规则

- 母亲对话从回家/吃饭/近况等生活话题自然开始，之后提到小A失踪已有多年。
- 不显示任务文案、高亮母亲或显示“调查小A”。
- `FLAG_A1_MOM_MSG_TRIGGERED`：1200ms 触发完成时设为 `true`，游戏阶段从 `A` 进入 `B`。
- `FLAG_A1_MOM_MSG_READ`：触发后玩家打开母亲会话时设为 `true`。
- `FLAG_A1_XIAOA_MISSING_KNOWN`：与已读同步设为 `true`，阶段保持 `B`；阶段 C 由后续邮箱里程碑解锁。
- 所有剧情 Flag 必须通过 `StateManager` 写入，组件不得维护隐性剧情状态。
- 用户可自由选择其他联系人，不因未读红点强制跳转。

## 3. 数据接口

### `data/contacts.json`

每项必须包含通用可追溯字段，并包含 `name`、`kind`、`avatarAssetId`、`pinned`、`sortOrder`。`kind` 只允许 `person | group | system`。

### `data/chats.json`

每项必须包含通用可追溯字段，并包含 `conversationId`、`senderId`、`timestamp`、`kind`、`content`、`assetId`、`durationSeconds`。`kind` 只允许 `text | image | file | voice | system`；不适用字段用 `null`，不省略。

通用可追溯字段：

```text
id, title, act, phase, source, purpose, unlockCondition, relatedFlags, notes
```

- 联系人 ID：`CONTACT_A1_A_001` 起。
- 历史消息 ID：`CHAT_A1_A_001` 起。
- 母亲新消息 ID：`CHAT_A1_B_001` 起，`unlockCondition` 包含 `FLAG_A1_MOM_MSG_TRIGGERED`。
- 占位头像：`IMG_A1_B_001` 起；图片/文件占位同样必须具有独立资源 ID。

## 4. 公开技术接口

- 在 `StateManager` 增加有类型的 `setPhase(phase)`；外部不直接改 `state.game.phase`。
- 事件总线新增 `phase:changed { phase }` 和 `chat:opened { contactId }`。
- 触发逻辑由 `src/story/act1PhaseBController.ts` 唯一拥有。
- 微信数据只由 `src/data/wechatData.ts` 导入、校验并输出，UI 不直接导入 JSON。
- 微信 UI 使用 `src/modules/wechat/**`，不把细节塞回 `AppShell.tsx`。
- 会话选中可使用 React 局部 UI 状态；未读、剧情触发和已读结果由全局状态/Flag 推导。

## 5. T02 独占写入区

```text
package.json
package-lock.json
tsconfig.app.json
src/App.tsx
src/components/AppShell.tsx
src/core/types.ts
src/core/stateManager.ts
src/core/stateManager.test.ts
src/data/wechatData.ts
src/modules/wechat/**
src/story/act1PhaseBController.ts
src/story/*.test.ts
src/styles.css
data/contacts.json
data/chats.json
data/events.json
data/flags.json
```

其他所有路径只读。必须保留 M0 行为与测试；不得覆盖、删除、移动或全局格式化边界外文件。

## 6. 必须验证

```text
npm test
npm run build
```

额外检查：

- `contacts.json` 和 `chats.json` 的所有 ID 唯一，引用的 contact/asset/flag ID 可解析。
- 时间推进测试证明 1199ms 前未触发，1200ms 后只触发一次。
- 刷新恢复时不重复触发已完成事件。
- 阅读母亲会话前后的三个 Flag 和未读标记符合冻结规则。
- 本地 UI 视觉检查联系人列表、多类气泡、窗口缩放与键盘焦点。

## 7. 冲突与报告

- 契约命名优先；不在局部创造近义 Flag 或隐形状态。
- 需跨边界修改时停止并向主任务报告。
- 现有文件都是用户或其他任务工作，不还原、不删除。
- 最终报告必须包含：`Role`、`Delivered`、`Changed paths`、`New IDs`、`New flags`、`Validation run`、`Deferred or blocked`、`Cross-boundary requests`。
