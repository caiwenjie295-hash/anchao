# 《暗潮》多软件协作规则

本文件对 Codex、WorkBuddy 及其他进入仓库的开发 Agent 生效。

## 角色边界

- 用户：决定产品方向、剧情和最终取舍。
- Codex 主审：拆分任务、冻结接口与文件所有权、审查 diff、运行质量门禁、决定是否允许合并。
- WorkBuddy / 执行 Agent：只在分配的分支和 worktree 中实现、测试、提交并报告；不得自行合并到 `main`。
- 只有主审通过后，改动才能进入 `main`。

## 开工前必须读取

1. `维护导航.md`
2. `docs/协作开发与Git工作流.md`
3. 当前工单 `docs/work_orders/<TASK-ID>.md`
4. 工单引用的剧情规范、并行契约和交接文档

## 强制规则

- 禁止在 `main` 上直接开发。
- 每个执行角色使用独立分支和独立 Git worktree；不同软件不得共享同一个可写工作目录。
- 工单必须写清唯一写入者、允许路径、只读依赖、禁止路径和验收命令。
- 不得修改未分配的文件，不得回退、格式化、移动或删除他人的进行中改动。
- 不得改变剧情阶段、Flag、存档 schema、公共接口或资源 ID，除非工单明确授权。
- 不提交 `node_modules/`、`dist/`、`暗潮.html`、日志、缓存、密钥或本机配置。
- 不得使用 `git reset --hard`、强制推送或改写共享历史。
- 执行 Agent 只能提交到自己的任务分支；不得合并、打版本标签或删除他人分支。
- 完成实现后必须运行工单要求的检查，并按工单格式报告变更路径、测试结果和遗留事项。

## 合并门禁

主审至少完成以下检查后才能合并：

1. 实际变更路径与工单所有权一致。
2. `git diff --check` 无错误，diff 中无调试代码、秘密或生成物。
3. 代码和数据符合 01–04、现有架构、可访问性和回退约束。
4. `npm test`、`npm run build`、`npm run build:offline`、`npm run test:offline` 全部通过。
5. 涉及界面的改动完成真实浏览器宽屏/窄屏检查。
6. 主审在 `docs/reviews/<TASK-ID>.md` 记录结论为 `APPROVED`。

任何一项失败，任务分支退回执行 Agent 修正；不得以“先合并再修”为替代。

## 提交与回退

- 提交格式：`<type>(<task-id>): <summary>`，例如 `feat(WB-0001): add act-two prologue`。
- 推荐类型：`feat`、`fix`、`test`、`docs`、`refactor`、`chore`。
- 已共享的提交使用 `git revert <commit>` 回退；只在个人未共享分支上允许整理提交。
- 版本节点由主审在 `main` 上创建 annotated tag。
