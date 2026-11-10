# 聚光、图书馆间距与拍立得验收

状态：APPROVED，电脑视觉与完整离线门禁已完成。基线85cc140f，旧主线3d3ec299保持不变。

## 已确认基线

完整quality:gate通过：原679项测试分组、网页构建、离线构建、默认双轮A–K与四幕流程、277文件/82.13MiB离线完整性、Mac Chrome file入口通过。日志位于外层03_测试与验收/UX-PHOTO-INTERACT-20261110-validation/baseline-quality-gate.log。该基线结果不代表新三项已经完成。

已查看指定Designeer详情中的卡片倾斜、前景纸卡及排版对比演示；只借鉴交互与布局，使用游戏已有照片。具体映射在上一轮下一步参考与实施清单。

## 最终必须检查

- 聚光：指针移动更新局部光圈；提示消隐；移出/切图重置；不拦截热点和照片拖动缩放；键盘焦点可读；不自动观察或推进；无图/加载失败回退。
- 拍立得：真实热点打开现有照片，厚底纸框、轻微倾斜、移出复位、文字完整；关闭/Esc/回焦；纸片长转录静止；第一幕独立图若接入须保留失败重试和背景裁切。
- 图书馆：1280与1440电脑尺寸，空态、展开目录、选择地方传说、取册、翻页、书签/关键词、长内容滚动；检查边距、工具分组、照片比例、热点、原阅读记录和来源不变。
- 上轮最后收口：A4 sticky翻页不能盖住正文首行；侧栏/目录/页数与正文一致；邮件日期与普通窗口密度无遮挡。
- 保护：原虚拟桌面/任务栏/窗口外框、core/story/data/素材/存档/坐标与业务动作无变更。
- 最终完整quality:gate、包清单、真实Chrome file和电脑视觉，不以夹具直接切阶段冒充整轮通关。

## 隔离预览

现有127.0.0.1:5340服务，使用docs/ux-designeer-20261110/fixture.html。mode可a3-t04、library、a4-t05、a1-temple、a1-cave、desktop、photo-editor等。先安装内存存储再导入App，不接触玩家存档。

viewport.html?width=1440&height=900提供精确尺寸iframe。motion=reduce或pointer=coarse仅模拟JS匹配，不等于系统CSS媒体查询已实测；CSS减少动态另做代码审查，动态偏好切换由组件回归覆盖。不得过度宣称设备矩阵。

外层QA保存完整日志、截图和指标；产品源码中不提交生成物或大量截图。

## 本轮电脑真实操作记录

使用生产编译夹具（522 modules，配置为本目录vite.config.mjs），本机HTTP服务5341；内存存档隔离。1280×720与1440×900均由实际body尺寸确认；其中前期1440空态使用精确iframe，最终1440非空阅读与照片为原生viewport。

- A3：原阶段还差1项时移动/拖动不自动观察；真实指针x=48.44%/y=50.55%，点击后继续跟随x=24.22%；指针移出清空坐标；提示1900ms后消隐。镜头从地下走廊→档案室门口→架边地面→纸片，key变化重置提示和坐标。原100%/170%缩放、复位与拖动仍可用。
- A3门牌：高亮点打开纸框，实际倾斜x0.44°/y1.65°；移出清空style；Esc关闭回原热点。1280最终图为518.38×388.79，1440为648×486，均完整4:3且无灰色空条。纸片VVaKe的六项转录位于卡片外，computed transform=none；原观察后阶段必需齐全。
- A1：山腰破庙残缺塑像独立照片复用纸框，Esc回原热点；空石座仍为背景局部放大且无polaroid。原失败重试由既有组件回归验证，未人为破坏正式素材。
- 图书馆：展开目录→地方传说→XX县风土志→三页→末页补母志→书签→关键词展开；自动来源登记与可选摘录提示清晰，继续志异可用。1280/1440非空书页、工具分组、长页滚动实看。页缘原粗白条已去掉；1440键盘Enter翻页后computed border=0/bg=transparent/outline=none，折角opacity=1。
- 非A3照片编辑器的spotlight计数为0。原虚拟桌面1280同尺寸复看，壁纸、左列图标、照片第二列、右上任务卡与底部Dock无改变；保护路径diff为空。
- reduce/coarse夹具的JS媒体匹配静态回退已复核，新增单测覆盖偏好动态切换、rAF清理与touch不跟随。仅JS模拟，未声称真实触控设备或系统级减少动态全矩阵通过；CSS减少动态规则另静态审查。

本地截图在外层03_测试与验收/UX-PHOTO-INTERACT-20261110-validation/screenshots。主要文件：spotlight-final-1440.jpg、polaroid-final-1280.jpg、polaroid-final-1440.jpg、a1-polaroid-final-1280.jpg、library-reading-final-1440.jpg、desktop-protected-1280.jpg。旧截图含修订前问题，仅最终文件代表交付。

## 最终收口与门禁

- A4产品ed934d1改桌面pager为正常文档流；原代码直接调整scene.scrollTop，scroll-margin无效，因此移除初版无效规则。1280初始页、第二页与1440第二页复看首行完整、键盘翻页2/7及自动回焦正常。截图reader-final-first-1280.jpg、reader-final-second-1280.jpg、reader-final-second-1440.jpg。
- 冻结源679fbac4，Node24.15.0/npm11.12.1，完整quality:gate --base-ref=85cc140f通过，原超时/脚本/断言未改。135个测试文件：unit180+component480+acceptance31=691项全部通过；TypeScript、网页build、离线build通过。
- 默认离线双轮通过：第一幕A–K、照片编辑、存档重载、结局、清零再载入；包含第二幕T01–T07、第三幕T00–T07、第四幕T01–T10；本地资源、无网络依赖、零运行时错误断言通过。277文件，86,136,393bytes（82.15MiB），包逐文件SHA256通过；真实Mac Chrome file://打开并挂载桌面/本地图片通过。完整日志final-quality-gate.log位于外层QA目录。
- 该门禁不等于人工逐章完整通关；视觉夹具只证明列出的真实UI行为。手机未专项处理。构建仍有原有大bundle提示。
- 连续切换reduce/coarse隔离预览曾遇一次原图complete但loading未退，reload后正常；未改原PhotoViewport加载算法，后续观察未复现。此观察保留于implementation.md，勿声称缓存/设备全矩阵无问题。
- 只批准当前改造分支交付；不合main、不改旧发布指针。最终文档提交后仅重建离线并复核SHA/产物，产品不再变化。
