# 第三幕图片比例审计（工作包 I）

> 历史阶段记录：本文较早的浏览器检查只覆盖文中列明的镜头与档位；不得视为最终全幕几何矩阵。当前 59 镜头×5 档实测与生命周期结果见 [test-matrix.md](test-matrix.md) 及 `evidence/browser/ux-t07-ui-qa-report.json`。

> 对应工单 §16。基线 `f448851`（UX-234 衔接后），本轮 `Bunny_1`。
> 全部结论来自真实 Chromium 实测，非 jsdom 推断。

## 1. 结论摘要

用户报告的「第三幕全部被压扁」**不是主调查图链路的缺陷**。
UX-234 引入的 contain 算法在主路径上是正确的；真实缺陷有三处，已全部修复：

| 编号 | 缺陷 | 位置 | 严重度 |
| --- | --- | --- | --- |
| I-1 | 图片未加载时内容平面退化为 `100%×100%` + `object-fit:fill`，4:3 素材被纵向压扁 | `PhotoViewport.tsx` `planeStyle` 兜底分支 | 高（影响**全部**第三幕镜头） |
| I-2 | `imageUrl` 变化时不失效旧的 `imageSize`，新图沿用上一张图的内容平面 | `PhotoViewport.tsx` | 高（切镜头时拉伸/热点串图） |
| I-3 | T06 破庙/空神龛对照固定 `height:160px` + `object-fit:cover`，裁掉判读区域 | `act3Scene.css` | 中（仅 T06 / `LENS_A3_T06_008`） |

## 2. 主调查图链路：实测原本正确

`PhotoViewport` 已在 `onLoad` 读取 `naturalWidth/naturalHeight`，用
`fit = min(frameW/natW, frameH/natH)` 计算内容平面，理论上保持比例。
**工单 §3.6 的提醒是对的：不能因为看到 `object-fit:fill` 就断言根因。**

1920×1080 目标尺寸下（实测视口 800×656，比例结论与尺寸无关）：

| 指标 | 值 |
| --- | --- |
| 原图 | `IMG_A3_T00_001.jpg` 1448×1086，AR = 1.3333 |
| 内容平面绘制 | 564×423，AR = 1.3333 |
| **比例误差** | **0.00000**（容差 0.01，PASS） |
| frame | 800×423 |

切镜头后再测一次，比例误差仍为 0.00000。

## 3. 缺陷 I-1：未加载兜底会压扁（已修）

原兜底：

```tsx
fit > 0
  ? { width: imageSize.width * fit, height: imageSize.height * fit }
  : { width: '100%', height: '100%' };   // ← 配 object-fit:fill = 拉伸
```

`fit` 依赖 `imageSize`，而 `imageSize` 只在 `onLoad` 后才有值。
因此**任何一张图在解码完成前都会被拉伸**；命中缓存时一闪而过，冷加载或慢网下明显。
这与「全部被压扁」的现象吻合。

修复改为保持比例的占位：

```tsx
: { width: '100%', aspectRatio: '4 / 3', height: 'auto' };
```

实测（图片尚未加载时）：内容平面 802×601，AR = 1.334，**不再有纵向压扁**。

## 4. 缺陷 I-2：换图不失效旧尺寸（已修）

```tsx
useEffect(() => { setImageSize({ width: 0, height: 0 }); }, [imageUrl]);
```

`sceneKey` 变化时原本只重置 `zoom`/`offset`/`pointers`，**`imageSize` 保留**。
新图在 `onLoad` 之前会沿用上一张图的平面尺寸；若两张图比例不同就产生拉伸，
且热点按旧几何定位（工单 A3IMG-02「无上一图尺寸残留」）。

> 实现过程中我曾额外加过「未测量时隐藏热点」的守卫，**已撤回**：
> 那会在图片正常加载前就抹掉热点，破坏键盘可达性与既有焦点返回契约
> （`Act3Investigation.test.tsx` 的「opens the related material with focus return」因此失败）。
> 正确的边界是**只失效尺寸，不隐藏热点**。

## 5. 缺陷 I-3：T06 对照裁切（已修）

```css
/* 修复前 */
.act3-investigation__temple-compare img { width:100%; height:160px; object-fit:cover; }

/* 修复后 */
.act3-investigation__temple-compare img { width:100%; height:auto; max-height:min(46vh,420px); object-fit:contain; }
```

实测计算样式已变为 `object-fit: contain` / `height: auto` / `max-height: 301.76px`。
占位符同步改为 `aspect-ratio:4/3`，不再强制 160px。

> 注意：`.act3-investigation__temple-compare` 仅在
> `stage === 'T06' && lens.id === 'LENS_A3_T06_008'` 时渲染
> （`Act3Investigation.tsx:177`），**不影响其他镜头**。

## 6. 其余 `<img>` 路径排查（工单 §16.3）

枚举 `src/scenes/act2|3|4/**/*.tsx` 的全部原生 `<img>`，确认无其他固定高度拉伸：

| 路径 | 现状 | 判定 |
| --- | --- | --- |
| `Act4SceneImage` `.a4-scene__image` | `width:100%; max-height:min(55vh,550px); object-fit:contain` | 安全 |
| `t05School.css` `.t05-school__backdrop--image>img` | `object-fit:cover` 背景层 | 有意为之，非证据图 |
| `t05School.css` `.t05-school__notebook-visual>img` | `object-fit:contain` | 安全 |
| `t07Finale.css` `.t07-frame--image>img` | `object-fit:contain` | 安全（双S 坐标属工作包 B1–B2，未处理） |
| `SchoolSymbolComparison` | 走 `.t05-comparison__*` 布局 | 本轮未改，属工作包 F |

## 7. 新增测试

`src/components/PhotoViewport.aspect.test.tsx`（4 项，全部通过）：

1. 尺寸上报后内容平面保持原图比例（误差 < 0.001）；
2. 未测量时**绝不**退化为 `100%×100%`；
3. 换图后丢弃上一张图的尺寸；
4. 无图时仍提供文字入口（不回归无障碍路径）。

因 jsdom 无布局引擎，测试内显式 mock `getBoundingClientRect` 提供 800×600 frame，
使 `fit` 计算真正生效，而非只断言 class 名。

## 8. 本阶段 NOT RUN / 遗留

- **A3IMG-01 全镜头逐图审计 NOT RUN**：需要按阶段构造 T00–T07 全部可达镜头并逐图测量。
  本轮只测了 T00 与 T06 对照。**不得据此声称「第三幕全部比例已通过」。**
- **A3IMG-04（1920→1440→1024→768→390 动态 resize）NOT RUN**。
- **A3IMG-05（慢加载/加载失败夹具）NOT RUN**。
- **A3IMG-08（PhotoViewport 全部消费者回归）NOT RUN**：本次实测覆盖第三幕主图与
  T06 对照；第四幕 `.a4-scene__image` 与第二幕各调查未逐一回测。
- `scripts/test-browser.mjs` 未新增几何断言，仍只验证离线页挂载。
