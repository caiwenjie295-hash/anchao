# UX-NARR-A34 返修交付记录

## Role

A34 执行代理；在原分支、原 worktree 完成集成返修，没有合并 review 分支或修改公共 InvestigationShell。

## Delivered

- T05 首屏现在显示“晚自习”、2014 日期和当前亲历场景图。回顾从生日白天、家庭晚餐到门外来人逐页提供；首屏 DOM 不含未来场景标题、动作或回顾语句。回顾默认折叠，出处、视角边界和亲历衔接保留为按需内容。
- T05–T07 亲历内容使用大幅场景图、单一时间/视角标识和受限正文宽度。图像失败按资源分别处理，翻页后可切换到后续插图；全屏查看仍复用既有 modal 与焦点管理。
- A34 fixture 引入正式 `src/styles.css`，在动态加载应用状态和场景模块前换成独立内存 `Storage`，并用实测工具栏高度避开固定场景壳层。启动入口与隔离单测见 [README.md](README.md)。
- 将 T06_008 断言改为验证原文现有的不确定性，保留 `requiresClueIds` 条件；没有改动叙事数据。
- 更新离线验收脚本，覆盖当前第二幕目录/卷册/材料展开路径、第三幕单一出口，以及第四幕逐页后出现的旧邮件、档案、藏笔记/广播和结尾回顾路径；既有存档、图片、本地请求、刷新与重置断言保留。按统一验收约定，本地只做了脚本语法检查，未运行离线整套脚本。

## Commit SHA

在本次交付消息中报告。

## Changed paths

- `src/scenes/act3/Act3Investigation.test.tsx`
- `src/scenes/act4/Act4NarrativeReader.tsx`
- `src/scenes/act4/Act4LaterExperience.test.tsx`
- `src/act4/act4.css`
- `src/data/narrative/act4Presentation.ts`、`src/data/narrative/act4Presentation.test.ts`
- `src/data/act3Data.test.ts`
- `scripts/verify-offline.mjs`
- `docs/ux-narr-20261002/a34/fixture.html`、`fixture.tsx`、`fixtureStorage.ts`、`fixtureStorage.test.ts`、`README.md`、`delivery.md`

## Validation run

- `npm test -- src/data/narrative/act4Presentation.test.ts src/scenes/act3/Act3Investigation.test.tsx src/scenes/act4/Act4LaterExperience.test.tsx src/data/act3Data.test.ts docs/ux-narr-20261002/a34/fixtureStorage.test.ts` — 5 files、26 tests passed.
- `npx tsc -b --pretty false` — passed.
- `node --check scripts/verify-offline.mjs` — passed; the offline acceptance script itself was not run.
- Vite JS API built `docs/ux-narr-20261002/a34/fixture.html` as the sole HTML input with the React plugin and formal stylesheet — 211 modules transformed; temporary output under `node_modules/.tmp/a34-fixture-check` was removed after the successful build.
- `git diff --check` — passed after final edits.

## Deferred or blocked

父代理将统一执行主项目完整/离线门禁和真实浏览器宽窄屏抽查。本次没有从第一幕全程试玩；fixture 只提供 A3 T07、A4 T05/T09/T10 定向路径。

## Cross-boundary requests

只使用返修单明确授权的两个路径：`src/data/act3Data.test.ts`（修正语义断言）和 `scripts/verify-offline.mjs`（适配真实 UI 驱动路径）。没有请求或修改其他跨边界文件；A2 公共壳层保持只读。
