# UX-WALLPAPER-20261003 用户提供的Windows调查桌面壁纸

> 状态：2026-10-03 冻结小型追加工单；与CASEPATH/PROGRESS同批验收合并
> 基线：main / `81fafb13586e660b9bc2db1380467295aaee4b88`
> 执行：a2；不增加第三个代理
> 用户授权：使用提供的Windows壁纸，让调查桌面更拟真

## 来源与范围

用户提供：`D:/暗潮开发/暗潮-跨电脑开发包-2026-09-24/bd764bb25d49a05105060185774ba14cd2c846f7.jpg`。

主审已查看，是4500×3000蓝天草地壁纸，1,601,144字节；SHA256 `86316098369820B22CE0265E8D0149EBB321FF5F1D33B4ACA004F6F7D74D3642`。原图只读，不能覆盖、删除或重编码。复制至仓库独立本地资产，再由Vite/CSS纳入生产与离线包；无需远程加载。

## a2唯一写入路径

- 新增`src/assets/desktop-wallpaper.jpg`，原字节复制，验证SHA256相同。
- `src/imageAssets.css`：仅追加/调整`.desktop`、`.desktop::after`、`.desktop-icon`、`.desktop-icon span:last-child`的壁纸与标签可读性规则；该文件其他场景/图片规则冻结。桌面背景使用相对url，让Vite处理，cover/居中、比例不拉伸。抑制旧装饰斜线遮罩，保留合理背景失败回退。需要时白色图标标签加适度深阴影。
- `docs/ux-casepath-20261003/implementation.md`记录来源、资产哈希与改动。

`src/styles.css`由a34在PROGRESS合同中仅负责desktop-task-card，a2不可写它。不要修改App、assetLoader、资源ID或data源文档；既有桌面data-asset-id沿用，图片用于桌面装饰背景。其他幕/调查照片/纸面正文/任务栏内容不换成壁纸。

## 验收

桌面原渐变更换为用户原图，桌面图标与提示仍可读。默认浏览器窗口、右侧抽屉、最大化/返回桌面都工作，窄屏可裁切装饰背景但不变形、不溢出。生产和离线包均含本地jpg；原29项素材/草稿保持。

低风险可逆资产/CSS更新不新增镜像单元测试。a2在T06局部最终节点一起生产build+diffcheck并给哈希；父沿整批门禁一次检查离线manifest/本地资源与真实桌面截图。若构建先前已运行则此资产节点需一次构建验证，不重跑无关unit/offline。

主审把本项结果记录在CASEPATH审查；只有CASEPATH与PROGRESS全部批准才合main。a34全App隔离fixture可同时验证桌面，不另开浏览器或测试线。
