# 工单目录

每项开发工作使用一个文件：`工单/<TASK-ID>.md`。由 Codex 主审从 `TEMPLATE.md` 创建并冻结，执行 Agent 只读工单，不在其中更新状态。`工单/` 是集中查看所有已冻结、完成和规划工单的目录。

并行任务必须额外引用对应的并行开发契约。工单完成状态记录在 `docs/reviews/<TASK-ID>.md`，而不是改写工单。新工单的完整路径为 `docs/work_orders/工单/<TASK-ID>.md`。
