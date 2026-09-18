# 《暗潮》Git 与多软件协作工作流

> 状态：长期有效的仓库协作规范
> 适用：Codex、WorkBuddy、Terra、Luna 及其他本地开发软件或 Agent
> 集成负责人：Codex 主审

## 1. 核心模型

`main` 始终代表已通过审查、可构建、可回退的稳定版本。执行软件不直接修改 `main`，而是在独立分支与独立 worktree 中工作。Codex 负责需求冻结、边界审计、代码审查、组合验证和合并。

```text
用户需求
   ↓
Codex 创建工单／并行契约并冻结接口
   ↓
WorkBuddy／Agent 在独立 branch + worktree 实现并提交
   ↓
Codex 审查 diff + 运行质量门禁 + 浏览器验收
   ↓
APPROVED 才能 --no-ff 合并到 main，并按需打 tag
```

## 2. 分支命名

| 用途 | 格式 | 示例 |
| --- | --- | --- |
| WorkBuddy 实现 | `workbuddy/<TASK-ID>-<slug>` | `workbuddy/WB-0001-act2-shell` |
| 其他 Agent 实现 | `agent/<TASK-ID>-<slug>` | `agent/AG-0002-audio-index` |
| 主审修订基础设施 | `codex/<TASK-ID>-<slug>` | `codex/REV-0003-review-gate` |
| 多分支临时集成 | `integration/<TASK-ID>-<slug>` | `integration/T09-act2` |
| 紧急修复 | `hotfix/<TASK-ID>-<slug>` | `hotfix/HF-0001-save-load` |

`slug` 只使用小写英文字母、数字和短横线。一个分支只对应一个工单。

## 3. 工单与文件所有权

每次实现前由 Codex 从 `docs/work_orders/TEMPLATE.md` 创建工单。工单是该任务的权威合同，至少冻结：

- 目标、非目标和验收标准；
- 精确的允许写入路径、只读依赖与禁止路径；
- 共享类型、资源 ID、事件、文件名和回退行为；
- 执行角色、测试命令和最终报告格式。

同一路径只能有一个写入者。若两个角色都需要修改同一文件，必须重新划分；无法划分时由一个角色写，另一个只提交变更请求。

## 4. 独立 worktree

在稳定的 `main` 上执行：

```bash
./scripts/new-worktree.sh workbuddy WB-0001 act2-shell
```

脚本会创建：

- 分支：`workbuddy/WB-0001-act2-shell`
- 目录：仓库同级的 `暗潮-worktrees/WB-0001-act2-shell-workbuddy`

将这个新目录交给 WorkBuddy。其他软件必须创建自己的 worktree，不得同时写主工作区。

若需要从已审查的集成分支开始，可追加第四个参数：

```bash
./scripts/new-worktree.sh agent AG-0002 audio-index integration/T09-act2
```

## 5. 执行 Agent 交付

执行 Agent 在自己的 worktree 中：

```bash
git status --short
npm install
# 实现和测试
git add <工单允许的路径>
git commit -m "feat(WB-0001): implement act two shell"
```

交付报告必须包含：角色、完成内容、提交 SHA、变更路径、实际运行的验证、遗留/阻塞和跨边界请求。不得只回复“完成”。

## 6. 主审检查与合并

主审收到分支后先进行只读审查：

```bash
git log --oneline main..<branch>
git diff --stat main...<branch>
git diff --check main...<branch>
git diff main...<branch>
```

然后在该分支运行：

```bash
./scripts/quality-gate.sh main
```

涉及界面时必须进行真实浏览器宽屏/窄屏检查。通过后从模板创建 `docs/reviews/<TASK-ID>.md`，结论写为 `APPROVED`，随后：

```bash
git switch main
git merge --no-ff <branch> -m "merge(<TASK-ID>): <summary>"
./scripts/quality-gate.sh HEAD^1
```

如果未通过，评审结论写为 `CHANGES_REQUESTED`，由原执行 Agent 在原分支修正；主审不代写功能代码。

## 7. 回退与恢复

共享历史永远优先使用可追踪回退：

```bash
# 回退一个已合并提交
git revert <commit-sha>

# 回退一个 merge commit，保留主线父节点
git revert -m 1 <merge-commit-sha>

# 查看历史与恢复点
git log --oneline --decorate --graph --all
git reflog
```

禁止在共享分支使用 `git reset --hard` 或强制推送。个人未共享任务分支可以在执行者明确确认后整理提交，但不得影响他人分支。

## 8. 清理已完成 worktree

确认分支已合并且无需继续后：

```bash
git worktree list
git worktree remove <worktree-path>
git branch -d <branch>
```

删除 worktree 与分支属于收尾动作，只由主审执行。尚未合并或含未提交内容时不得强制删除。

## 9. 远程仓库

当前先建立本地 Git 仓库。用户选定 GitHub、GitLab、Gitee 或自建 Git 服务后，再由主审添加远程：

```bash
git remote add origin <remote-url>
git push -u origin main --tags
```

远程平台应保护 `main`：禁止直接推送、禁止强制推送、要求审查和质量门禁通过。未确定托管服务前不上传任何文件。

## 10. Token 节省约定

- WorkBuddy 首先读取 `AGENTS.md`、`维护导航.md` 和当前工单，不全量重读项目。
- 工单只引用必要的剧情规范与文件锚点，不复制大段背景材料。
- 执行 Agent 负责实现和局部测试；Codex 只读取 diff、关键文件和测试摘要。
- 评审失败时给出具体文件、行号、复现步骤和验收条件，再交回原 Agent 修复。
- 每个完成节点更新 `维护导航.md`、工单交接和评审记录，减少后续上下文恢复成本。
