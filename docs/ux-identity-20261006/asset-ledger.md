# UX 身份视觉资产账本

工单：`UX-IDENTITY-20261006`。可见身份按昵称、账户或站点名称稳定映射，不读取剧情旗标、正确答案、结果等级或页面阶段。

## 光栅资产

| ID | 原稿 | 发布文件 | 用途 | 生成提示 |
| --- | --- | --- | --- | --- |
| `IMG_UI_IDENTITY_WANGAO_001` | `source/IMG_UI_IDENTITY_WANGAO_001.png`（2,074,163 B） | `src/assets/ui-identity/IMG_UI_IDENTITY_WANGAO_001.webp`（12,530 B） | 王澳/小A共同账户头像；只有窗边树影与叶片，不包含人物、身份线索或剧情证据 | `prompts/profile-avatars.md#IMG_UI_IDENTITY_WANGAO_001` |

当前发布光栅合计 12,530 B（12.3 KiB），低于 400 KiB 上限。原始 PNG 只作项目源稿归档，不参与页面下载。

## SVG 图形

`src/components/VisualIcon.tsx` 内的 46 个本地 SVG 图形共用一个描边系统。`src/data/visualIdentityData.ts` 导出的 `visualIdentityVectorLedger` 为每个图形登记稳定 ID、图形名称和用途；ID 规则为 `ICON_UI_IDENTITY_<图形名大写并以下划线替换连字符>`。该数组由图形目录逐项生成，测试检查覆盖数、ID 唯一性与用途完整性。

图形用途覆盖邮件操作/状态、邮件附件与空状态、博客品牌/收藏、搜索结果和来源站点标识、论坛昵称头像，以及图像加载失败时无文字的账户头像回退。论坛昵称头像只使用抽象自然物图形。林予继续使用现有图集 `IMG_A1_B_010`；小A与王澳复用同一张无脸日常图。
