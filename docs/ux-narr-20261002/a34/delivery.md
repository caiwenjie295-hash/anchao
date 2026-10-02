# UX-NARR-A34 交付记录

## 已交付

- 第三幕按阶段提供稳定的空间与观察层级；T04/T05 的词表及 T07 的藏物名称和位置均由现有发现/取物状态控制。满足阶段条件后，单一主动出口调用现有确认与推进逻辑；T07 保留“回忆 → 姿态 → 取物”的既有顺序。
- 第四幕按资料、亲历与结尾呈现原有材料，分页直接由权威原文段落组成并保持原顺序；保留出处、现有动作门槛与状态语义。T05–T09 明示王澳的 2014 亲历视角；T09 广播维持完整连续段落；结尾回顾仅在既有完成条件后展开。
- 增加第三幕和第四幕定向状态/信息揭示测试、原文分页重组测试，以及本地真实组件验收 fixture。fixture 入口、启动方式和四个定向路径见 [README.md](README.md)。

## 验证

- `npm test -- src/data/narrative/act4Presentation.test.ts src/scenes/act3/Act3Investigation.test.tsx src/scenes/act4/Act4LaterExperience.test.tsx` — 3 个测试文件、17 项测试通过。
- `npm run build` — TypeScript 与 Vite 构建通过；Vite 提示主 bundle 超过 500 KB。
- Vite fixture 单独构建（HTML 入口，208 个模块转换）通过；临时输出已删除。
- `git diff --check` — 通过。

## 尚未覆盖

本交付未做浏览器宽窄屏抽查或全流程试玩；由父代理按统一验收安排检查 fixture 中的 A3 T07、A4 T05/T09/T10 路径。fixture 仅用于定向验收，不代表完整流程验证。无跨边界文件请求。
