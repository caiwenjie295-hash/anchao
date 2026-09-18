# <TASK-ID> <任务名称>

> 状态：权威执行工单
> 基线：`<commit-or-tag>`
> 执行角色：`<WorkBuddy/Agent>`
> 分支：`<actor>/<TASK-ID>-<slug>`
> 规则：执行角色可以读取但不得修改本工单

## 目标

<用户可见结果>

## 必须交付

- <具体交付物>

## 非目标

- <明确不做的内容>

## 冻结接口

| 接口 | 精确约定 |
| --- | --- |
| <文件/API/资源/状态> | <名称、类型、行为、回退> |

## 文件所有权

### 允许写入

- `<path-or-glob>`

### 只读依赖

- `<path-or-symbol>`

### 禁止修改

- `<path-or-subsystem>`

任何不在允许写入区的文件都视为用户或其他角色的进行中工作，不得编辑、删除、移动、格式化或回退。

## 验收标准

- [ ] <功能行为>
- [ ] <回归约束>
- [ ] <可访问性/视觉/数据要求>

## 必须验证

```bash
npm test
npm run build
npm run build:offline
npm run test:offline
```

## 最终报告格式

```text
Role:
Delivered:
Commit SHA:
Changed paths:
Validation run:
Deferred or blocked:
Cross-boundary requests:
```
