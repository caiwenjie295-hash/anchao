# UX-READPROGRESS-20261021 冻结工单

状态：IMPLEMENTING。主审Codex；唯一产品执行者：原 Luna Max。基线4983de3d89e62f007374eeb7f399f67d438f78b1。用户授权按照采纳项修改，不再盲测。

## 采纳项与边界
1. F02反馈确实适用于旧Vite未合并精简快照。旧快照及旧工作树只读；从当前main落实修复并交付同一最终commit的新精简源码和静态部署包。当前main已有本图全部热点/阶段必需计数分离，先核验真实不变量，不盲目回退。测试确保未观察热点存在时不能宣称全部观察；同图0/1不会与已无热点结论共存。若当前实现仍有可复现缺陷，可在以下独占路径修复并说明。
2. F05目录表达：默认折叠摘要以当前阅读/已显示进度为主，末页立即承认已显示至末页；章节完成0/10仅在展开区作为清楚标注的章节推进，不把它用作读页进度。多block分段要表明当前材料范围，回翻/回看保持高水位，返回原进度。实际完成章节与Flag只按原成功动作推进，不能伪造10/10。
3. 回忆章封面已过、两封邮件时间不是bug：保持4983实现；08:17/23:41正文完全不改。其他旧报告项不扩大实施。

## 文件所有权
Luna唯一写入：src/scenes/act4/Act4NarrativeReader.tsx；src/scenes/act4/Act4NarrativeReader.test.tsx（若存在）；src/scenes/act4/Act4ReaderBehavior.test.tsx；src/scenes/act4/Act4LaterExperience.test.tsx；src/scenes/act4/Act4ReadingProgress.test.tsx（可新增）；src/scenes/act4/reader/Act4ReaderPager.tsx及其同名.test.tsx；src/scenes/act4/Act4ReaderFinaleBehavior.test.tsx（仅相关断言）；src/scenes/act4/Act4NarrativeReader.css；src/scenes/act3/Act3Investigation.tsx及Act3Investigation.test.tsx；docs/ux-readprogress-20261021/implementation.md。若实际测试/CSS路径不同，先向父报告申请精确替换；禁止自行扩写。
主审唯一写入：本工单、docs/ux-readprogress-20261021/validation.md、docs/reviews/UX-READPROGRESS-20261021.md、维护导航.md、docs/progress_log.md、todo.md、changelog.md；开发包外层QA、精简源码和部署交付。
只读：原剧情规范01–04（有需要再定向读）、readerProgress/layoutPreferences、core/stateManager、所有data/public/assets/参考原稿及其他worktree。禁止修改剧情、资源、依赖/锁文件、存档schema13/Flag/门槛、公开接口、路由和旧WIP；禁止格式化整仓及降低测试。

## 固定验证与交付
Node24.15.0，npm>=11.8<12；独立node_modules由主审从main复制。定向组件测试（计数、最后一页未推进、回翻、回看返回、跨block），npm test / npm run build / npm run build:offline / npm run test:offline；主审quality:gate及真实1280/390浏览器、新Vite与静态分别核对。原封面与邮件保持测试；不进行新盲测。不得合并main。
Luna提交自己分支后报告SHA、变更路径、实际命令结果及遗留；主审APPROVED后集成、合并后门禁、发布同源双包。
