# UX-POLISH-20261006 设置面板支援交接

> 本工单追加并优先于A1/EXTRAS的原路径分配；复用原A1 Luna/max，不新增第五位代理。主审只派工与核对。

## 唯一写入者

A1追加唯一写入 `src/modules/settings/**` 及 `docs/ui-polish-20261006/a1/settings-support.md`。EXTRAS不再创建/编辑settings目录，仍是NotepadApp、App、UI偏好、存档/stateManager和驱动的唯一写入者。不得改第一幕微信、原小说/JSON、assets、全局样式、Flag/schema或其它模块。

## 固定接入接口

`src/modules/settings/SettingsPanel.tsx` 以named export导出 `SettingsPanel`；props为 `{ manager: StateManager; onClose?: () => void }`。不自动读取全局manager。EXTRAS在调查App的设置与存档tab中挂载。

- StateManager交接API：getSaveStatus/subscribeSaveStatus、exportSave(): string、importSave(serialized: string)，结果 `{ok:true,state}` 或 `{ok:false,reason:'invalid-file'|'storage-unavailable'}`。
- 独立UI偏好：core/uiPreferences的getUiPreferences/subscribeUiPreferences/setReaderFontSize，档位18/20/22；调用失败需清楚显示“本次已调整，未能保存”等真实状态。
- 依赖实现由EXTRAS负责。主审可把当前三份dependency复制到A1 worktree供类型检查，只读借用、不得修改或提交这三份文件；报告明确借用，最终组合验收由父执行。

## 面板必须交付

1. 清楚的阅读字号三档按钮，aria-pressed、44px操作目标、可见焦点，正文/按钮至少16px、辅助至少12px；窄窗390px不溢出。只用本目录CSS，不加全局样式。
2. 状态“已保存/正在保存/暂时无法保存”订阅manager，说明轻量且有人情味。
3. 导出当前manager最新状态为本地JSON，文件名含暗潮和日期；Blob/object URL及时释放，无外部网络。
4. 导入JSON使用文件input读取text后调用manager.importSave，成功/非法文件/写盘失败均有status反馈；不解析后直接写localStorage、不重载整个页面、不绕过核心验证。有限制读取大小（例如2MiB）并在超限/读失败清楚反馈，busy状态防止重复提交。
5. 不在面板放重置按钮：原独立ResetProgressButton由EXTRAS维护二次确认。onClose若存在提供“返回调查”而不自创路由。
6. 文字面向玩家，避免UTF-8/schema/开发报告等术语。

## 收尾

只运行强制tsc和diff check，不跑完整测试/构建/浏览器；如写行为测试侧重导入失败保留原存档、失败反馈，不写镜像样式快照。显式暂存settings目录和自己的交付文档，禁止add -A。完成即提交到原A1分支，回报SHA/真实验证/借用依赖状态。不得合main。父待所有任务结束后统一一轮测试、审查合main。
