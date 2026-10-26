# UX-A3-REFINE-20261022 实施记录

## 实现范围

- A3前后照片保留既有成对导航和动作ID。上一张改为浅色次级描边，下一张保留唯一强调色；桌面按钮按内容宽度居中，手机继续均分并保留约44px触控高度。首尾照片的禁用占位按钮也参与手机等分布局，阶段结束、其他路线、阻塞原因、材料入口与回焦仍沿用原结构。
- A3热点使用 `act3HotspotPrompt` 为未观察的纸片、时长标记、黑板划痕、对照动作及扉页检查提供中性对象/动作标签。热点框仍常驻可见，标签仅在悬停或键盘聚焦时显示；可见标签、`title`、`aria-label` 和无图回退共用同一字符串。原 `inspectedClueIds` 是唯一知情标签来源，主动点击仍调用原 `inspectAct3Clue`。相关材料入口也使用同一中性提示；详情保持原已知标题和正文。
- 59个A3热点的位置与框尺寸独立存放于 `act3PhotoLayout`。框依整张原图的归一化宽高定位，随照片缩放并保持至少44px屏幕命中尺寸；标签单独逆缩放且在图像边缘改为内侧锚定。可拖动框内图像，7px移动阈值后抑制点击；双指从框内起手仍缩放。已观察框为极淡蓝灰边，未观察框为琥珀边；两种状态都保留透明底和可辨焦点。逐点视觉依据、目标和避让记录见 `hotspot-regions.md`。
- T03_002/003的地点标题在24小时标记观察前显示“走廊房门”，T03_002图像替代文字用“门牌近处”；T03_004在48/72小时标记观察前使用相同的中性地点和图像标题。对应现有观察记录后恢复原数据标题。稳定地点分组和同名照片计数继续按原展示函数计算。
- A3单独启用移动端精简照片工具：默认可直接放大和切换全图，缩小、百分比和复位放入用户主动展开的“调节”面板。桌面通过同一组控件保持完整工具。视口响应式变化和切换镜头时关闭手机面板；工具区拦截指针与滚轮输入。键盘、拖拽、滚轮、双指、原图比例、裁切热点焦点与无图回退逻辑仍由原PhotoViewport处理。
- 旁白按lens记录React本地已读集合。新镜头详情折叠并带静态浅金色圆点及“未读”无障碍名；主动打开后圆点和未读名移除。已读镜头回访保持已读。旁白行为不写入观察、游戏Flag、存档或浏览器存储，正文和阶段intro未改。

## 变更路径

- `src/scenes/act3/Act3Investigation.tsx`
- `src/scenes/act3/Act3Investigation.test.tsx`
- `src/scenes/act3/act3HotspotPrompt.ts`
- `src/scenes/act3/act3HotspotPrompt.test.ts`
- `src/act3/act3Scene.css`
- `src/components/PhotoViewport.tsx`
- `src/components/photoViewport.css`
- `src/components/PhotoViewport.cover.test.tsx`
- `src/components/scenePolish/SceneObservationCrop.test.tsx`（仅同步校准后的T00_009与洞内对话裁切预期，并保留边缘钳位断言；生产Crop未改）
- `src/data/act3PhotoLayout.ts`
- `src/data/act3PhotoLayout.test.ts`
- `docs/ux-a3-refine-20261022/hotspot-regions.md`
- `src/components/investigation/InvestigationNavigation.tsx`
- `src/components/investigation/InvestigationNavigation.test.tsx`
- `src/components/investigation/investigation.css`

## 定向验证

使用 Node 24.15.0/npm 11.8 环境执行了定向 Vitest：热点区域、裁切坐标和PhotoViewport交互共17项通过。完整 `npm test` 为128个测试文件、648项通过；`npm run build`、`npm run build:offline`、`npm run test:offline` 均通过。完整套件覆盖未观察与已观察提示切换、T03_002/003/004标题和位置遮蔽/恢复、旁白逐lens读状态、手机精简工具响应式开合/单组控件/隔离手势、首尾照片成对导航、59个热点范围完整且边界合法、同图目标不相交、区域内拖图/双指缩放/点击抑制、44px屏幕命中计算及T00_009校准裁切与边缘钳位。

构建与离线验收日志保存在外层 `03_测试与验收/UX-A3-REFINE-20261022-validation/luna-max/`。Codex主审真实浏览器复核了全部58镜头/59个热点：1280桌面几何与边缘、390手机Cover与全图状态（命中区至少44px），并检查1440、1280、390、320和844×390五种视口。纸片、桌脚、底座和包裹的框贴合实物且透明；150%下框内拖动能平移并抑制误点击，紧接的轻点只触发一次详情。全图下纸角键盘标签可读；24小时线索未观察前标题、aria和标签保持中性，Tab/Enter后才恢复原门牌名称，阶段行动和1/2稳定分组正确。T02_005单点修正后，fresh fixture确认58镜头/59个热点中心均由自身接收命中且遮挡数为0；新版喇叭框中心轻点打开原详情、缩放保持100%。最终 `git diff --check 03a16a483467ab2d213300e18ba9e7845f24d6a5..HEAD` 通过。
