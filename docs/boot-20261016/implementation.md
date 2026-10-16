# BOOT-20261016 执行实现

基线 c4c8a294ecb7b7e54076196fca902b1a84e65dd9；执行分支 agent/BOOT-20261016-implementation。界面沿用现有字体，黑底、柔和白字和细进度条；只用一次轻扫动画，尊重减少动态偏好。未修改图片、剧情、Flag、schema或存档管理器。

## 启动与资源

- index.html 内联黑色加载壳先于外部 JS/CSS 可见；主入口先等 prepareStartup 完成再 mount App。动态模拟进度单调且下载未全成功时最多95%，真实全部成功才100%并进入。普通下载错误显示重试，复用已完成版本缓存。入口脚本/样式加载失败显示刷新，不把未应用样式的页面当成成功。
- scripts/startup/manifestPlugin.mjs 仅应用于网页构建，收集全部实际 bundle 输出及 public 文件，排除入口HTML、清单和worker自身；小说独立HTML在清单内。路径逐段URL编码，base随构建配置。资源清单包含字节数和SHA-256，内容及base生成版本；输出index.html注入本次版本meta。旧入口遇新清单时要求刷新，避免旧App配新清单。public非哈希文件也验证字节和内容，陈旧/混合上传不能假完成。
- 下载并发最多4，每次只缓存少量文件的字节，不创建Image也不批量解码；120秒单文件期限含响应体。HTTPS/localhost使用原生SHA-256，普通HTTP用已验证标准向量的SHA-256后备实现。读取同版本CacheStorage时只信任本预加载器写入的哈希标记。
- SW以base为scope，URL查询参数绑定资源版本。只从该base及该版本的CacheStorage回读预加载的静态文件；不缓存导航HTML、清单、worker、跨域或其他路径，不在fetch事件中写缓存。首次注册/控制等待有限；不支持SW/缓存、私密模式或配额失败时，退回校验后HTTP缓存预热。全部下载完成后只清理同一base的旧版本游戏缓存。localStorage和其他站点缓存均不访问。
- 降级环境的HTTP缓存由浏览器及服务器缓存策略管理，不能保证后续图片完全不重取；正常HTTPS+可用CacheStorage由SW实际供图。若服务器在上传过程中混包或持续返错，用户停留在可重试页面。全量资源约76.5MiB，首次仍需实际下载时间；该功能把等待集中到开场，不减少传输总量。
- 开发和无加载壳的file离线入口直接启动；清单插件对IIFE/library构建跳过，未改既有离线构建脚本。scripts/startup加入发布源码hash输入。

## 章节与清零

两层均portal到body，保持原触发按钮位置，章节选择改视口居中modal，另有关闭按钮。确认层高于章节菜单；确认时菜单inert且aria-hidden，只允许顶层操作。两层box-sizing、动态视口最大高度、内部滚动、44px按钮保障宽/窄/短屏。保留其他选项折叠和解锁逻辑、二次确认、默认取消、Esc与Tab圈定；取消待inert移除后的effect恢复到原按钮，关闭章节回触发按钮。保存失败保留当前状态及确认层，未修改resetProgress语义。

## 执行验证

- npm ci --offline --engine-strict（既有临时npm缓存，无新增依赖）。
- 局部5文件20项：失败阻断/重试、4路上限、非哈希旧字节拒绝、缓存降级、标准SHA-256向量、模拟进度上限、入口版本绑定/刷新、入口样式失败、生产真实bundle/public清单、SW作用域/版本回读、portal/顶层inert/Tab/Esc/取消焦点、保存失败保护。
- npm run build -- --base=/AnChao/ 通过。逐项清单bytes及SHA-256核对并与全部dist文件集合比对，273个待加载资源约76.54MiB；根路径/前缀配置进入清单版本，绝不硬编码/assets。
- git diff --check 通过。完整质量门禁、真实宽/窄/短屏、首次/失败/热缓存浏览器验收由父主审统一执行，此处不宣称已完成。

所有生成物留在忽略目录，不提交构建产物/日志。不操作玩家5339/5340入口，不部署公网。
