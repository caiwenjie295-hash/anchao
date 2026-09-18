# 《暗潮》第一幕 M4 鸡头岭实景与阶段 G–I 开发契约

> 状态：权威执行契约  
> 基线：M0–M3 验收后的工作区，2026-09-17  
> 实现角色：`T05 · 鸡头岭实景探索`  
> 规则：T05 可读但不得修改本契约、其他 docs、维护导航和 game 基准文档

## 1. 目标

把第一幕从桌面调查自然带入鸡头岭实景，完成阶段 G–I：玩家经过普通山路探索，在山洞留言墙中自行发现不显眼的 `A.W` 并拍照，随后在破庙中发现“补”字并保存照片，最后回到桌面，为 T06 的照片处理留下可持久化输入。

正式场景图、美术和音频暂不制作。本节点使用可追溯、可替换的 CSS 场景占位，但交互、状态、数据和剧情顺序必须完整。

## 2. 必须交付

- 阶段 F 后出现黑屏式自然转场；只使用“继续”进入行程，不出现 YES/NO、任务确认框或高亮任务按钮。
- 独立于桌面窗口系统的第一幕场景容器；进入场景时保留桌面窗口与应用状态。
- 至少三段山路场景、一个山洞场景和一个破庙场景。
- 每段山路包含多种普通可调查对象，不能让所有热点都推进剧情。
- 山洞留言墙至少包含 12 条普通年份、姓名、情侣留言、到此一游与涂鸦；`A.W` 与普通留言使用同一视觉层级。
- 玩家必须主动检查 `A.W`，再主动拍摄山洞照片，才能继续前往破庙。
- 破庙包含外景/内部空间感、残缺塑像、空石座、普通环境物和“补”字；“补”不得被系统高亮或解释。
- 玩家必须主动检查“补”并拍照，才能选择下山回到桌面。
- 山洞与破庙照片 ID、场景进度和调查记录可存档，刷新后恢复。
- Schema、引用完整性、旧存档迁移、顺序门槛、Flag 和场景恢复自动测试。

## 3. 冻结的体验规则

### 阶段 F → G 转场

- 仅当 `game.phase === 'F'` 且行程尚未开始时显示全屏黑色叙事层。
- 文案简短，只表达主角收拾东西并前往鸡头岭；不得提前解释异常。
- 玩家点击“继续”后进入第一段山路，写入行程状态并把阶段推进到 `G`。
- 刷新时若已在场景中，直接恢复当前场景，不重复播放开场转场。

### 阶段 G：山路探索

- 依次经过三个数据化场景：入口/旧林道/溪谷近洞口；名称和正文从 JSON 读取。
- 热点至少覆盖路标、植物、脚印、垃圾、溪流、旧护栏、石堆等普通对象。
- 普通热点只展示短观察文本并记录已调查，不写剧情 Flag。
- 场景推进使用中性的“继续前行”，不得标注“正确路线”或“关键地点”。

### 阶段 H：山洞与 A.W

- 留言墙是主要观察面；所有留言都可检查，`A.W` 不使用不同颜色、发光、闪烁、尺寸或“线索”标签。
- 点击 `A.W` 写入 `FLAG_A1_AW_FOUND`，但不自动拍照。
- 发现后由玩家点击相机控件拍摄，保存指定照片 ID 并写入 `FLAG_A1_AW_PHOTO_TAKEN`。
- 未拍摄山洞照片时，前往破庙的出口保持不可用，并用自然文案说明“还有想确认的东西”。

### 阶段 I：破庙与“补”

- 进入破庙写入 `FLAG_A1_TEMPLE_FOUND`。
- 点击“补”字热点写入 `FLAG_A1_BU_FOUND`，不解释“黑补母”。
- 玩家主动拍摄后保存指定照片 ID，并写入 `FLAG_A1_TEMPLE_PHOTO_TAKEN`。
- 三项阶段 I Flag 完成后允许“下山”；下山只回到原桌面并保持 `game.phase === 'I'`，不启动照片谜题。

## 4. 视觉与交互规范

- 美学方向：阴雨后潮湿的写实徒步记录感；灰绿山林、冷灰洞穴、褪色土红破庙，只用 1 个低饱和暖色作为人造物提示。
- 记忆点：场景越深入，构图从开阔横向路径逐步压缩为山洞墙与庙内局部，但不使用恐怖滤镜、血迹、鬼影或跳吓。
- CSS 占位场景必须带 `data-asset-id`，使用稳定的渐变、轮廓与纹理层；不能把随机生成结果当正式素材。
- 热点边界默认不可见；悬停/键盘聚焦仅提供轻微轮廓和缩放反馈。所有热点必须能通过键盘访问并有可读标签。
- 桌面任务栏和窗口在场景模式下不显示；回桌面后原状态完整恢复。
- 提供场景标题、简短环境文本、观察详情抽屉、当前位置进度和相机控件；不显示 Flag、ID、任务列表或完成百分比。
- 宽屏、平板和窄屏均须可用；窄屏热点仍有足够触控面积，详情面板不得遮住全部场景。
- 所有运动尊重 `prefers-reduced-motion`。

## 5. 数据 Schema

### `data/scene_act1.json`

每项包含通用可追溯字段，并包含：

```text
sceneKind, backgroundAssetId, description, ambience,
visualVariant, nextSceneId, requiredFlagIds,
capturePhotoId
```

- `sceneKind` 只允许 `trail | cave | temple`。
- `visualVariant` 只允许 `trailhead | forest-road | creek | cave-wall | ruined-temple`。
- `nextSceneId` 可为 `null`；非空时必须指向同文件场景。
- `capturePhotoId` 可为 `null`；山洞与破庙必须引用 `data/images.json` 中的照片占位。
- `requiredFlagIds` 决定离开当前场景的最小条件，UI 不得自行硬编码另一套门槛。

### `data/scene_hotspots.json`

每项包含通用可追溯字段，并包含：

```text
sceneId, hotspotKind, label, observation,
position: { x, y, width, height }, triggerFlags
```

- `hotspotKind` 只允许 `environment | graffiti | aw-mark | temple-object | bu-mark`。
- `position` 使用 0–100 的百分比坐标并保证宽高为正；UI 仅负责定位与渲染。
- `triggerFlags` 只能引用已登记 Flag；普通热点必须为空数组。
- 每个场景至少 3 个热点；山洞至少 12 个 `graffiti/aw-mark` 热点且只能有一个 `aw-mark`；破庙只能有一个 `bu-mark`。

### `data/images.json`

新增场景背景、局部特写和拍摄结果的占位条目，至少登记：

```text
IMG_A1_G_001–IMG_A1_G_003
IMG_A1_H_001–IMG_A1_H_003
IMG_A1_I_001–IMG_A1_I_004
```

- 全部保持 `assetType: placeholder`；不得生成或写入正式位图。
- `IMG_A1_H_003` 为后续 T06 使用的山洞照片；`IMG_A1_I_004` 为破庙照片。

### `data/clues.json`

新增 `A.W` 与“补”两条正式线索，只登记关联场景、热点、照片和 Flag，不重复观察正文。

## 6. 状态、事件与剧情

### 持久化场景状态

向现有存档向后兼容增加：

```text
modules.scene.journeyStarted: boolean
modules.scene.currentSceneId: string | null
modules.scene.visitedSceneIds: string[]
modules.scene.inspectedHotspotIds: string[]
modules.scene.capturedPhotoIds: string[]
```

- 旧存档缺少 `scene` 时补默认值，不改变 `schemaVersion: 1`。
- ID 数组去重；未知或损坏的当前场景回退到桌面，不白屏。
- 所有写入只经过 `StateManager` 公开方法。

### 新增公开事件

```text
journey:started          { sceneId }
scene:entered            { sceneId }
scene:hotspot-inspected  { hotspotId }
scene:photo-captured     { sceneId, photoId }
journey:finished         { lastSceneId }
```

### 正式 Flag

```text
FLAG_A1_AW_FOUND
FLAG_A1_AW_PHOTO_TAKEN
FLAG_A1_TEMPLE_FOUND
FLAG_A1_BU_FOUND
FLAG_A1_TEMPLE_PHOTO_TAKEN
```

- UI 只发场景事件；`Act1PhaseGHIController` 是上述 Flag 和 G/H/I 阶段的唯一写入者。
- 重复点击、返回或刷新不得重复照片、事件副作用或回退剧情阶段。
- T04 的阶段 F 条件仍是开始行程的前置，T05 不得绕过。

## 7. T05 独占写入区

```text
src/App.tsx
src/core/types.ts
src/core/defaultState.ts
src/core/saveManager.ts
src/core/saveManager.test.ts
src/core/stateManager.ts
src/core/stateManager.test.ts
src/data/sceneData.ts
src/data/sceneData.test.ts
src/scenes/act1/**
src/story/act1PhaseGHIController.ts
src/story/act1PhaseGHIController.test.ts
src/styles.css
data/scene_act1.json
data/scene_hotspots.json
data/images.json
data/clues.json
data/flags.json
data/events.json
```

其他所有路径只读。T05 必须保留 T01–T04 的桌面、微信、邮箱、浏览器、记事本、状态和测试行为，不得删除、移动、重命名、覆盖或全局格式化边界外文件。

## 8. 非目标与延后项

- 不开发 T06：资源管理器照片目录、照片查看器、曝光/阴影/对比度、双 S、阶段 J–K 与第一幕结尾全部延后。
- 不生成、下载或嵌入正式图片、视频、音频、地图或 3D 资源。
- 不解释“补”、双 S、黑补母、启明或小A失踪真相。
- 不新增第三方依赖、路由框架、Canvas/WebGL 引擎或 UI 组件库。
- 不改写桌面应用外观，不把场景塞进普通窗口。

## 9. 执行与验证

1. 以验收后的 T04/M3 为唯一基线，先建立数据校验、场景状态和控制器。
2. 再实现转场、场景容器、热点、详情、相机和回桌面流程。
3. 运行 `npm test` 和 `npm run build`。
4. 自动验证场景/热点/图片/Flag 引用、百分比坐标、普通热点无 Flag、留言数量与唯一关键标记。
5. 自动验证旧存档迁移、F→G、A.W 发现/拍照门槛、破庙进入、“补”发现/拍照门槛、刷新恢复和下山回桌面。
6. 实际走查宽/中/窄窗口、鼠标与键盘热点、非线索观察、留言墙、不显眼的 A.W/“补”、相机与回桌面状态。
7. 主任务复核后重跑组合测试与构建，并创建 `docs/T05_鸡头岭实景探索_交接文档.md`。

## 10. 冲突与最终报告

- 命名或状态冲突：本契约优先，不创造近义 Flag、第二套场景状态或组件内剧情变量。
- 需要跨边界修改：停止该写入并报告主任务。
- 正式剧情文本只写入 `data/*.json`；组件只读校验后的数据。
- 最终报告必须包含：`Role`、`Delivered`、`Changed paths`、`New IDs`、`New flags`、`Validation run`、`Scene/interaction QA`、`Deferred or blocked`、`Cross-boundary requests`。
