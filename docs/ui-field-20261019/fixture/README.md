# 独立 MemoryStorage QA 存档

`memory-storage-seeds.json` 为隔离的 `localStorage` 键值表。每个场景均用 schema 13 `StateManager` 状态和内存存储构造；A3/A4 快照经现有 `startAct3()` / `startAct4()` 入口创建。文件只供测试注入，游戏运行时不会识别这些 fixture，也不读写玩家存档。

| Scenario | 状态 | 用途 |
| --- | --- | --- |
| `act1-phase-f-waiting` | 第一幕 phase F，徒步尚未开始 | 确认徒步资料仍可读、出发由玩家决定 |
| `act1-phase-f-resume` | 第一幕 phase F，当前场景已开始 | 确认刷新续玩不会自动显示待出发引言 |
| `act2-t02-bridge` | 第二幕 T02 桥头 | 核查桥头资料与继续调查入口 |
| `act2-t05-school` | 第二幕 T05 学校资料 | 核查渐进证据与两张新增纸本图片 |
| `act3-resume-t00` | 第三幕合法 T00 入口 | 验证续玩优先请求 `shared + act3` |
| `act4-resume-t01` | 第四幕合法 T01 入口 | 验证续玩优先请求 `shared + act4` |

## 注入方法

在启动产品模块、导入 `stateManager` 单例之前，QA harness 应新建独立 `MemoryStorage`。选定一个 `scenarios[scenario]`，逐项对其键值调用 `memoryStorage.setItem(key, value)`，再让浏览器启动产品 bundle。保存键为 `anchao.save.v1`；章节入口记录（若存在）为 `anchao.chapter-history.v1`。只把该内存端口交给 QA harness；不要调用真实浏览器的 `localStorage`，不要连接玩家端口。

A3/A4 seed 保存的是当前章节合法入口，`chapter-history` 同时含入口快照，可继续覆盖选章历史。T02 与 T05 使用第一、二幕状态，F 两种状态分别代表待出发与已开始徒步。
