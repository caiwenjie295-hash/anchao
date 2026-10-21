# UX-HOTSPOTCOPY-20261021 冻结工单

用户授权：按两项采纳修正文案，由原Luna Max实施；基线3f919022011414e8e8fed6c4eaea378137432496。主审Codex，唯一产品写入Luna Max；不再整轮盲测。

## 范围与固定产品规则
1. 第三幕同屏一致：当前照片还有未观察热点（包括非阶段必需热点）时，底栏与本图观察说明必须直接引导查看本图热点；禁止“本地没有（本阶段）必需观察”等看似已完的句子。厨房门牌LENS_A3_T06_001是指定复现，0/1、待观察、黄色框可点与提示必须同意图。例如“当前照片还有1处未观察，请查看黄色热点。”阶段required进度可另说，不能指示略过本张。零/部分/全观察、阶段必需完成/未完成、特殊小月口述均核验，别让口述分支掩盖本图未观察。
2. 第四幕小改说明：保留当前页数摘要/高水位/回看；展开区章节x/10说明按完成本章并继续后更新，与页数不同。T01九页末页但未完成本章时按真实动作补“九页笔记已显示完，接下来查看两人的反应。”等准确引导；反应已展开则不能还叫去看反应；回看不显示需推进剧情的引导；不能把章节/材料笼统说剩几段或伪造完成数。
3. 已过回忆封面、邮件正文/时间、解锁、存档、外挂/调试入口均不动。剧情/资源/门槛/路线/Flag/schema13/公共API不变。不得为复测加入捷径或测试入口。

## 唯一所有权
Luna允许写：src/scenes/act3/Act3Investigation.tsx、src/scenes/act3/Act3Investigation.test.tsx；src/scenes/act4/Act4NarrativeReader.tsx、src/scenes/act4/Act4LaterExperience.test.tsx、src/scenes/act4/Act4ReaderBehavior.test.tsx；src/act4/act4.css（仅新说明必要样式）；docs/ux-hotspotcopy-20261021/implementation.md。
父允许写：本工单、docs/ux-hotspotcopy-20261021/validation.md、docs/reviews/UX-HOTSPOTCOPY-20261021.md、维护导航.md、docs/progress_log.md、docs/todo.md、docs/changelog.md；外层QA/交付文件。
只读：readerProgress/layoutPreferences、core/存档/解锁、data全部、assets/public、原剧情规范01–04、所有其他工作树/历史包及本工单。范围外改动先报告父；禁止依赖/锁文件、全仓格式化、测试降级、删除/覆盖旧工作。

## 验证与交付
Node24.15.0/npm11。父复制与main锁文件匹配的独立node_modules。Luna定向回归（厨房门牌0/1与1/1、部分/全部/特殊口述提示，T01末页前后/回看语义）、npm test、build、build:offline、test:offline；提交自己分支，报告SHA/改动路径/命令结果/遗留，不能提交父工单或合并main。
父逐diff、授权范围/剧情资源保护审计，完整quality:gate，宽1280/窄390实际UI。指定验收是最新静态包清档定向走到厨房门牌复截，不拿Vite截图代替静态。测试过程不改产品的解锁/存档/外挂，不操作用户公网或已有真实存档。主审APPROVED后--no-ff合main、合并后门禁、交付同源新网站和源码，旧包保留。
