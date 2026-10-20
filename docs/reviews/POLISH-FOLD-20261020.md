# POLISH-FOLD-20261020 主审记录

状态：APPROVED（2026-10-20，Asia/Shanghai）。允许按仓库流程--no-ff合入本地main，再执行合并后quality gate。用户授权来源为本地anchao-polish-fold-delta-20261020.zip，产品基线fc11b3bc25394fa96add6479c9ab4ccec5e983ad；独立验收产品提交b7ca9dc490c70d16d16b9831dfbacb73cfcbab11，随后只有审查/导航文档变化。

## 导入结果与边界

包内changed/13个产品文件逐件与ZIP SHA256一致，未代写或额外修改产品实现。P01/P07/P10–17视觉折入现有T07、桥头、图书馆和桌面；P08仅“石砌空隙”展示口径，特征ID/matchFeatureId仍square-opening；P05添加authored frameKind/muteLabel和分型错帧说明；P09页缘和原分页器共用前后页方法，最后一页正确禁用，摘录确认是页内状态。

新数据字段只供呈现与作者校验，未写入存档。主审核对data/act2_t07.json，剥除获准新增展示字段、还原获准两类展示文案后与基线整份相同；帧ID/时间窗/可匹配性/正确ID不变。所有范围外Git对象保持，273个原有媒体文件未动；无新图片/新依赖/domain/schema/Flag变动。notes原件及ZIP hash留存开发包POLISH-FOLD-20261020-validation/incoming，Git文档副本仅去行尾空白以满足diff检查。

本次只导入给定13文件，未执行notes列出的P18/P19/P20/P22等未来计划、服务器外挂清理，也未合入已停止UI-HIERARCHY的WIP或山路新图。原参考配图与对照对白时机保持基线，不能把此包描述为那项层级/参考图重构已经完成。

## 独立验证

Node24.15.0/npm11.11.0；git diff --check、npm test -- --testTimeout=20000（122文件581项）、/AnChao网页构建、离线构建、默认双轮完整四幕离线回归、离线hash、原Chrome file启动七项通过。外部说明未跑测试，本结论来自本地主审重新执行；没有弱化原测试或原四幕断言。唯一首次门禁失败是导入Markdown尾空白，原日志保留gate-attempt-doc-whitespace，规范文档后全部重跑通过。

真实IAB使用独立MemoryStorage与5391新端口：1280×720页缘翻页→原下一页连续到补母志，320×480目标页摘录saved确认与禁用状态、内滚动/无横溢；T07树林及受访者错帧逐步原生AX操作均拒绝且给分型句，正确石质帧+square-opening仍可记录并推进当前第4步；390×844对照单列与mute标签，桥头人物选中/当前口述可读，1280照片两栏/暖灰状态可读。桌面任务栏暖纸透明样式和会话打开通过；当前种子无未读，未读ARIA由未改TSX与全量回归核对，不声称新徽标已逐项实测。

首轮locator批处理的场景变化没有计为通过；保留INCONCLUSIVE测量，重载独立种子后逐步原生AX复核以明确拒绝/成功结果。尺寸以实际DOM测量为准，390的复核在载入完成后设置，未把先前1251px窗口当作手机验收。

## 证据与交付

开发包POLISH-FOLD-20261020-validation/{incoming-manifest,scope-audit,integration-gates,browser-observations,browser-measurements,validated-state}.json及原日志/截图。验证后无运行源变化；main合并后需保持相同sourceContentHash。维护入口src/data/act2T07Data.ts、src/scenes/act2/{T07Investigation,LibraryResearch,Act2ShelfMap}.tsx和对应CSS；来源说明见docs/polish-fold-20261020/incoming-notes/。

本任务仅源码合入main，未推送/未部署/未重打上传或精简包，原fc11b3bc发布/源码包全部保留并保持原版号；玩家历史服务和存档未操作。未声称公网、所有设备或完整WCAG审计已覆盖。
