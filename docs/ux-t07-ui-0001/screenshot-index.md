# UX-T07-UI-0001 截图索引

截图来自真实 Chrome。`evidence/browser` 内的 QA 报告使用合成状态夹具，不含玩家存档；`evidence/reviewer-checks` 收录主审实际交互截图。报告文件列出的截图均在目录中。

## 本轮 UX-T07 几何和生命周期

| 文件 | 内容 |
|---|---|
| `evidence/browser/school-1920x1080.png` | 学校调查宽屏状态 |
| `evidence/browser/school-390x844.png` | 学校调查窄屏状态 |
| `evidence/browser/school-1920x920.png` | 1920 宽、920 CSS 高的空间模拟 |
| `evidence/browser/act3-1920x1080.png`、`act3-390x844.png` | 第三幕代表镜头宽/窄屏 |
| `evidence/browser/act3-image-error-fallback-1920x1080.png` | 可选照片失败时的正文和动作回退 |
| `evidence/browser/t07-photo-zoom-300-dpr2-960x540.png` | T07 宣传照片最大应用倍率；DPR2 和等效 200% CSS 视口 |
| `evidence/browser/act3-t07-zoom-300-dpr2-960x540.png` | 第三幕照片/热点最大应用倍率 |
| `evidence/browser/act4-reader-zoom-dpr2-960x540.png` | 第四幕原文配图放大，Escape 后焦点回归另见报告 |
| `evidence/browser/ux-t07-ui-qa-report.json` | 六档学校交互、295 组图片/热点实测、生命周期及代表性放大结果 |
| `evidence/browser/ux-t07-ui-lifecycle-report.json` | 单独重跑的生命周期检查；只报告其实际运行范围 |

## 主审实际交互截图

| 文件 | 内容 |
|---|---|
| `evidence/reviewer-checks/bridge-1920x1080-before.png`、`library-1920x1080-before.png`、`school-1920x1080-before.png` | 主审从 main 基线采集的修前宽屏截图；与下列实际操作后的截图作视觉对照 |
| `evidence/reviewer-checks/bridge-1920.png`、`bridge-390.png` | 老人场景对话/证据桌面与窄屏 |
| `evidence/reviewer-checks/library-1920.png`、`library-390.png` | 图书馆目录、书架、目标书页 |
| `evidence/reviewer-checks/school-1920.png`、`school-390.png` | 老师办公室证据调查 |
| `evidence/reviewer-checks/compare-1920.png`、`compare-1440.png`、`compare-1024.png`、`compare-768.png`、`compare-390.png` | 同一图片内容平面上的宣传/破庙照片比较 |
| `evidence/reviewer-checks/T01-1920.png`、`T01-390.png`、`T06-1920.png`、`T06-390.png` | 第四幕阅读及当前内容显示 |
