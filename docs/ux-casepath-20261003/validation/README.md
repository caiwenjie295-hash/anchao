# CASEPATH 隔离验收夹具

该夹具在正式 `App` 和默认 `StateManager` 挂载前，以可验证的内存 `localStorage` 替身隔离存档。它不读取、清除或覆盖正式存档；浏览器页只保留 `__anchao_ux_casepath_temporary_snapshot_v1__` 这个 fixture 专属 `sessionStorage` 键，用于重载前保存当前内存存档文本。恢复启动只装载该文本，不重新构造 checkpoint，也不补写访问页、检视线索或已读章节。

从 Vite 开发服务器打开：

```text
/docs/ux-casepath-20261003/validation/fixture.html?mode=qiming&viewport=default
```

默认 URL 不显示夹具控件，正式产品仍由实际 `App` 渲染。需要检查状态或切换 checkpoint 时添加 `&controls=1`，控件初始收起，避免挡住场景。支持 `viewport=default`（生产默认浏览器窗 860×560）、`viewport=maximized`（浏览器窗口最大化）和 `viewport=mobile`（保留默认窗口状态；验收者将实际浏览器调到手机尺寸后由生产媒体查询呈现）。无额外控件的 clean URL 可用 `&clean=1`；去掉 `controls=1` 效果相同。

checkpoint 包含：

- `a1-start`、`a1-f`、`a1-ending`：新存档、第一幕 F 和结尾。
- `bridge`、`library`、`tales`、`school`：第二幕四个连续阅读/调查位置。
- `qiming`、`qiming-zhong`、`qiming-both`、`qiming-legacy`：启明实名复核起点、仅钟子月已记录、两人均已记录和旧版 T06 迁移状态。
- `finale`：第二幕 T07 已形成结论的实际收尾页。
- `a3-t04`：第三幕 T04 刚进入；T00–T03 门槛、必需检视和确认事实已保存，T04 纸片尚未发现。
- `a4-t05`：第四幕 T05 刚进入；前三幕的合法前置完成事实和 A4 前四节/动作已保存，当前 T05 未读，正式叙事按王澳视角呈现。
- `a4-blog`：第四幕 T03 私人动态；前三幕完成、T01–T02 阅读完成且登录动作已记录，T03 仍待阅读，适合独立检查博客首屏与动态交互。
- `a4-ending`：第四幕 T10 最后一封邮件尚未打开；前三幕和 A4 T01–T09 的合法完成事实、唤醒邮件/档案/藏笔记/出门动作已保存，可从邮件继续走到落幕。

“重挂载当前临时存档”把 StateManager 已写入的隔离内存游戏快照复制到上面的唯一 fixture session 键，再重载相同 checkpoint。成功挂载正式 App 后 fixture 删除该键；启动失败时保留它供诊断。fixture 从不访问正式 `localStorage`，也不提供可以绕过门槛的调试写入入口。

定向验证命令：

```powershell
npx vitest run docs/ux-casepath-20261003/validation/fixtureStorage.test.ts docs/ux-casepath-20261003/validation/fixtureCheckpoints.test.ts
npx tsc --noEmit -p docs/ux-casepath-20261003/validation/tsconfig.fixture.json
npx vite build --config docs/ux-casepath-20261003/validation/vite.config.mjs
```

独立构建输出使用系统临时目录下每次新建的 `anchao-ux-casepath-fixture-*` 文件夹，不会写入产品入口或生产构建目录。
