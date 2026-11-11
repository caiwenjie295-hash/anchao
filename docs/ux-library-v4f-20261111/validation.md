# v4f用户补丁整合验收

状态：APPROVED。当前review基线9d92af7，补丁基线85cc140，main3d3ec299保持。

## 来源

用户明确请求合并本机zip，原包约13MB、含26路径的binary patch与参考截图与说明。原始zip SHA256：7d04a77ad9ea2118740c607ef9745c496b0618ce653c3e52e968071ac1407e5a。

补丁说明声明709测试及build通过，仅作为补丁作者记录，不代表当前合并结果。原应用脚本要求HEAD85cc140；本次不运行该脚本、不回退现分支，使用三方合并保留后续修复。参考附件内容不作为额外发布或扩设计授权。

## 本轮必须验收

- 图书馆：全景查阅架→九格书架→风土志封面→目录→本卷阙→补母志，未读补母志点志异只引导不写Flag，摘录后变已摘录；卷末三志异完整翻页，分页不随抽屉开闭变化，选择/确认暂定判断后前往高中，重载续读。
- 1280/1440实际电脑尺寸；参考封面页稍早，按最终补丁实装验收。用户说明中的七条未实施意见仅保留，不擅自设计优化；missing-pages保持默认开启。
- 新全景/书架图片在web及离线file可用；无根路径/外站依赖，新增资源进入包清单SHA。
- A3无双层罩/双层纸卡，指针擦除与光晕按补丁行为，关闭/Esc回焦与原照片手势可用；长纸片转录静止。A1首图/grid/按钮修复和独立图框保留；原桌面/main/核心/原故事数据不变；A4图文及首行不遮挡。
- 组合Node24.15.0完整quality gate，原默认超时/断言保留；若离线旧UI路径迁移，记录修改范围与对应业务覆盖。旧691/用户709均不能充当新全量数字。

日志/截图放外层03_测试与验收/UX-LIBRARY-V4F-20261111；源码不提交大截图、依赖、dist或离线生成物。

## 用户补充取舍

用户明确保留当前review拍立得，不采用补丁替换。InvestigationDetail.tsx/对应test/polaroidCard.css替换不纳入，A1/A3保留原PolaroidPhoto与长文字静止方案；其余补丁继续合并。

## 最终验收

- 合并节点37d60f7；最终书框de31908；独立资源82a8284。仅两个三方冲突：PhotoViewport合并prop且A3只用新罩；Act3保留原Polaroid、仅换聚光prop。3张public原图字节保留，2张运行图经静态import+no-inline独立emit进入离线包。旧第一幕/核心/data/桌面无变更。
- 生产夹具1280x800走通全景/九格/取册/目录/未解锁提示/补母志/摘录/卷末；最终金框上三篇各两翻(data-spreads=2)，都到末段才出现判断。两来源片段选中后确认暂定判断，才出现前往高中；1280/1440判断抽屉保持分页2，1280书页缩0.8位于x41.4至718.6，完整位于520px抽屉左侧。实际UI范围为隔离内存夹具，不冒充人工整轮通关。
- A1入口图片394px高、透明侧底；拍照/下山nowrap保留；A1/A3均preferred-polaroid=1、patchCard=0。A3新mask=1旧mask=0，真实指针拖动与热点/特写关闭正常。截图在外层QA/screenshots，包括judgment-final-1280/1440.jpg、preferred-polaroid-a1-1280及a3-1440.jpg。
- Node24.15.0：137文件718测试（180unit/507component/31acceptance）通过。首轮quality-gate在离线图片内联检查失败，原检查未弱化；改?url&no-inline与CSS?no-inline后重新web/offline build、默认test:offline双轮/四幕、包SHA与Chrome file均通过。279文件86,762,598bytes。日志quality-gate.log、offline-final.log、build-final.log。后两构建的变化仅asset query，不重复无关718项。
- QA脚本只迁移T03/T04真实UI步骤：全景/架/目录/阙页/目标页/同卷志异/三篇末段/支持片段/判断。保留原Flag、笔记、两来源、摘录可选、学校后续、四幕、双轮、清零与无外网/零错误断言，未改超时。CSS匹配器有非致命BREAK日志，退出0和原错误断言通过。
- 默认本卷阙开关仍true，用户说明七条未实施意见只记录。原main和旧release-main指针不动。当前批准特性分支交付，不执行main合并。
