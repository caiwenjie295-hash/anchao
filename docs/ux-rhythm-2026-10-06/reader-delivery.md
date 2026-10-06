# 第四幕阅读器交付记录

READER 将第四幕长段正文按完整段落和对话回合分页，同时沿用既有场景边界、封面入口、原文来源标记、阅读位置、已读目录、回顾内容与剧情门槛。旧版 T08 阅读位置会映射到包含原起始段落的新页。

T03 的私人动态视图按原顺序呈现 14 组日期和正文；“微博：”与读完后的调查者反应保持在动态列表之外。日期索引、返回阅读起点、继续进入 T04 和仅存 UI 偏好的动态收藏均有具体行为。博客视图使用独立三栏布局；窄屏将日期索引放在动态前，并保持日期与收藏操作的 44px 触控目标。

阅读场景切换只在 READER 自己的事务标记下命名 View Transition 图层。遇到 App 场景事务、`file://`、不支持 API、同步异常或减少动态偏好时，阅读操作即时提交，不重复推进。完成 T10 后由 App 展示唯一的落幕层；driver 按跳过演出、核对署名、进入回顾的可见顺序验收。

fixture README 现列出 `a4-blog` 和 `a4-ending`。前者使用合法的 T01–T02 和登录完成状态进入未读 T03；后者以合法的 T01–T09 完成事实进入最终邮件尚未打开的 T10。夹具继续使用隔离内存存档，不接触正式存档。

本次定向验证：

- `npm exec tsc -- -b` 通过。
- `npm exec vitest -- run src/scenes/act4/Act4ReaderBehavior.test.tsx src/scenes/act4/Act4Ending.test.tsx --configLoader native --pool=threads --maxWorkers=1`：2 个测试文件、4 项测试通过。
- `node --check scripts/verify-offline.mjs` 和 `git diff --check` 通过。

完整离线流程、生产构建以及 1280×720 / 390×844 浏览器验收仍待集成分支统一运行；此记录不将它们标为通过。Vitest 默认配置在当前受限环境下因 `spawn EPERM` 无法启动，改用原生配置加载器后上述定向测试通过。
