# POLISH-FOLD-20261020 外部Agent增量集成

状态：冻结导入/审查范围。用户2026-10-20明确要求将本地anchao-polish-fold-delta-20261020.zip增补合入main。基线fc11b3bc25394fa96add6479c9ab4ccec5e983ad；主审分支codex/POLISH-FOLD-20261020-integration，复用干净integration worktree，外部Agent为源码生产者，主审仅精确导入/审查/验证/整合，不直接在main开发。

## 目标与范围

导入包内changed/的13个现有文件，沿用原目录结构。所含内容为暖纸/茶色T07和桥头/图书馆样式、Act1未读及任务栏视觉、T07按frameKind分型的错帧反馈/静音标记、图书馆页角翻页和摘录确认。README及4份notes仅保存为来源说明，所列未来计划不是本轮需求。不得扩展执行其P18/P19/P20/P22、资源替换或上线外挂退役。

本次获准数据变化仅data/act2_t07.json的展示文案、keyFrames frameKind/muteLabel与comparison.mismatchNotesByKind；frameKind authored metadata不写入存档。原帧ID、时间窗、supportsExteriorMatch、square-opening特征ID/matchFeatureId、Flag/stage/schema、原剧情证据门槛保持。页缘翻页复用原前后页操作，无越页；弱帧仍不可确认地点，正确帧/特征仍可通过。所有旧图/BGM/小说/压缩map保护，不含已停止UI-HIERARCHY的任何WIP或新图。

## 唯一导入路径

- `data/act2_t07.json`
- `src/act2/act2ShelfMap.css`
- `src/act2/t02Bridge.css`
- `src/act2/t03Library.css`
- `src/act2/t07Finale.css`
- `src/components/investigation/investigation.css`
- `src/data/act2T07Data.test.ts`
- `src/data/act2T07Data.ts`
- `src/scenes/act2/Act2ShelfMap.tsx`
- `src/scenes/act2/LibraryResearch.tsx`
- `src/scenes/act2/T07Investigation.test.tsx`
- `src/scenes/act2/T07Investigation.tsx`
- `src/styles.css`

主审另可写：本合同、docs/reviews/POLISH-FOLD-20261020.md、docs/polish-fold-20261020/{incoming-notes,validation}/**、维护导航.md；开发包PROGRESS.md、POLISH-FOLD-20261020-validation/**与release-main.json的源码版本元数据。只提交源文件和必要文档，不提交dist/node_modules/日志/缓存/图片编码。

禁止：domain/StateManager/save/schema/flag、其他剧情JSON、assets/旧图/原稿、package/lock、启动调度/BGM、已停止分支WIP、服务器/远程推送。源码生产者的原始增量保留，审查需修改实现时先记录缺陷，不能弱化原测试以强行合并。

## 审查/验收

- 逐文件差异与ZIP hash留档，检查旧片段没有被覆盖退回；范围外所有Git blob/mode一致；data新增展示字段以外语义不变，所有旧媒体hash不变。
- git diff --check；npm test -- --testTimeout=20000；npm run build -- --base=/AnChao/；npm run build:offline；默认npm run test:offline双轮；node scripts/release/verify-offline-package.mjs；原Chrome file。Node24.15.0/npm11.11.0，runtime /private/tmp/anchao-ui-field-20261019-runtime/bin。
- 实际1280×720/390×844/320×480检查T07三类截图/失败提示/正确对照及弹窗、图书馆页缘/底部分页/摘录、桥头选择与确认、Act1未读/任务栏，无遮挡或横溢；使用独立MemoryStorage，不碰玩家端口记录。
- 完成后主审记录APPROVED，才能--no-ff合入main。合并后按仓库工作流完整quality gate，保持main干净。不重新打包/远程部署，除非用户另行要求；当前旧部署包标明为原版本，避免把源码合并冒充公网已更新。

交付：合并SHA、实际导入范围、测试/浏览器结论、必要限制及来源记录路径。
