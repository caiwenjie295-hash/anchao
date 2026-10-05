# UX-POLISH-20261006 ART 资源账本

本账本记录 ART 分支新增的七张照片、参考、提示词、注册字段、消费建议与文件校验值。图像均由内置 `image_gen` 独立生成；T06 禁闭室、T08 食堂、T08 消防箱图在主审按原文反馈后迭代到最终版本。照片源文件与发布 WebP 均在此 worktree，应用运行只依赖工作区中的文件。

发布副本使用 Pillow WebP `quality=82`、`method=6`，无缩放；全部长边 1448px。完整七图合计会在下表后给出。

| ID | 源 PNG（像素；字节） | 源 SHA-256 | 发布 WebP（像素；字节） | WebP SHA-256 |
| --- | --- | --- | --- | --- |
| `IMG_A2_T03_002` | `src/第二幕/IMG_A2_T03_002.png` · 1448×1086 · 2,472,279 | `d76b1ad38fceaef44b2b5aa674ac2d88b5dca286005d21730f7212ce30c32332` | `src/assets/compressed/第二幕/IMG_A2_T03_002.webp` · 1448×1086 · 197,818 | `5ba7c27bcf363365efa11fdb7cc3423fa9d97d1ccc03c7e5c669c53c0bc28389` |
| `IMG_A2_T03_003` | `src/第二幕/IMG_A2_T03_003.png` · 1448×1086 · 2,412,597 | `7b866f94c0dc6280c4e907c0157663d6c65e4723593b3d594c337074ecfbe990` | `src/assets/compressed/第二幕/IMG_A2_T03_003.webp` · 1448×1086 · 154,976 | `15f47675d38731e32191804f169e7a30b81e4099b1c48c2f748ede7d4fdfdde3` |
| `IMG_A2_T05_012` | `src/第二幕/IMG_A2_T05_012.png` · 1086×1448 · 1,833,863 | `2a18c4e63c4a124af34e4733769e2a9dee2926aeb8872adecb0f0e5f2398aa89` | `src/assets/compressed/第二幕/IMG_A2_T05_012.webp` · 1086×1448 · 56,312 | `1254998300830a54a74ca39c7fd545cca062ed1f8d48cbe1b7613c9e850db1e5` |
| `IMG_A3_T06_009` | `src/第三幕/IMG_A3_T06_009.png` · 1448×1086 · 2,473,556 | `14e5c7cd64708955844e11745a69ff2350ce795ea490f6132aef6838b81555c6` | `src/assets/compressed/第三幕/IMG_A3_T06_009.webp` · 1448×1086 · 182,938 | `ecf8ded0a9535f4d74c56cf3799f369e4510e50f6687d27032f5364bc98a2d14` |
| `IMG_A4_T06_007` | `src/第四幕/T06/IMG_A4_T06_007.png` · 1448×1086 · 1,884,498 | `fe39bd971641b492bb7676a183715d6633e89720bacd4d45f093c610ee7f4adc` | `src/assets/compressed/第四幕/T06/IMG_A4_T06_007.webp` · 1448×1086 · 56,488 | `34e6b9e104f47c606d879d009c99c77fc89e47a56200444cef4ecb6022e68dc7` |
| `IMG_A4_T08_011` | `src/第四幕/T08/IMG_A4_T08_011.png` · 1448×1086 · 2,021,305 | `dfedb6a3007914d2248ff8062b900442ea3bcf81e5d93ec6c5558c47195e147c` | `src/assets/compressed/第四幕/T08/IMG_A4_T08_011.webp` · 1448×1086 · 109,478 | `5c166d6704ac16bebe43863c02ed3be077b702d0bfdce4e3295a6fef72524dd5` |
| `IMG_A4_T08_012` | `src/第四幕/T08/IMG_A4_T08_012.png` · 1448×1086 · 1,954,594 | `3de2e46defddf7d0b709fb1b9747e2e69afc2abc7c39546feb0f11c3246396f7` | `src/assets/compressed/第四幕/T08/IMG_A4_T08_012.webp` · 1448×1086 · 96,524 | `b7d2d8c3c7a73e1f2248bafa47012e7777c5d5463767ef33e083cb7f54b1d4b2` |

**发布副本合计：854,534 bytes (0.81 MiB)，预算 2 MiB 内。**

## 用途、参考与消费建议

| ID | 参考图及用途 | 消费建议 |
| --- | --- | --- |
| `IMG_A2_T03_002` | `src/第二幕/IMG_A2_T03_001.jpg` — 县图书馆阅览室、旧书材质与自然窗光。 | A2 地方志阅览页的旧卷封面图；卷名由网页准确渲染，照片保持无字。 |
| `IMG_A2_T03_003` | `src/第二幕/IMG_A2_T03_001.jpg` — 县图书馆环境与旧卷材质。 | A2 旧录正文配图；保留宽阔纸面留白，准确正文由网页排版。 |
| `IMG_A2_T05_012` | `src/第二幕/IMG_A2_T05_006.jpg` — 已有学霸笔记页、纸张、桌面与紫色划线。 | A2 学校双 S 比较时使用的页边近景；右侧空白页边供现有共用 SVG 标记叠加，不把 AI 笔迹当作证据。 |
| `IMG_A3_T06_009` | `src/第三幕/IMG_A3_T06_007.png` — 空木神龛与底座结构；`src/Photo_src/黑补母特写1.png` — 只参考旧址材质年代。 | EXTRAS 第三幕 T06 已有底座观察/对照；和第一幕破庙塑像照片并列观察，空处保持空白。 |
| `IMG_A4_T06_007` | `src/第四幕/T06/IMG_A4_T06_006.png` — 原禁闭室门、三孔、翻盖；中间工作稿以同路径重新生成并由最终暗室图取代。 | EXTRAS 第四幕 T06 禁闭段的室内图；三孔只有少量透光、送餐翻盖可辨，不能用床铺或亮室改变原文。 |
| `IMG_A4_T08_011` | `src/第四幕/T08/IMG_A4_T08_002.png` — 校园人工湖与早春颜色；中间湖景工作稿以食堂图取代。 | EXTRAS A4 T08 清醒生活段的食堂用餐配图，可接“食堂的饭真好吃”；第一人称餐盘、远窗春绿，不突出辨识人物。 |
| `IMG_A4_T08_012` | `src/第四幕/T09/IMG_A4_T09_001.png` — 走廊消防箱、门窗与空间方向；中间工作稿经过两次干燥/运营状态修正。 | EXTRAS A4 T08 厨房逃离后消防箱附近段落；低视角、凌晨弱灯、干燥地面。避免复用厨房图或展示笔记/人物。 |

## 注册字段

以下为 `data/images.json` 中新增的完整七条记录；既有记录原样保留。

### `IMG_A2_T03_002`

```json
{
  "id": "IMG_A2_T03_002",
  "title": "县图书馆旧卷封面",
  "act": 2,
  "phase": "A2_T03",
  "source": "scene",
  "purpose": "县图书馆旧卷封面近景；准确标题由网页文字显示。",
  "unlockCondition": [],
  "relatedFlags": [],
  "notes": "imagegen 参照图生成的旧卷封面照片；不含标题文字。",
  "assetType": "image",
  "file": "IMG_A2_T03_002.png"
}
```

### `IMG_A2_T03_003`

```json
{
  "id": "IMG_A2_T03_003",
  "title": "旧卷纸页",
  "act": 2,
  "phase": "A2_T03",
  "source": "scene",
  "purpose": "同卷旧纸细节配图；正文由网页准确显示。",
  "unlockCondition": [],
  "relatedFlags": [],
  "notes": "imagegen 参照图生成的留白旧纸照片；不含正文或符号。",
  "assetType": "image",
  "file": "IMG_A2_T03_003.png"
}
```

### `IMG_A2_T05_012`

```json
{
  "id": "IMG_A2_T05_012",
  "title": "学霸笔记页边近景",
  "act": 2,
  "phase": "A2_T05",
  "source": "scene",
  "purpose": "已有学霸笔记的页边近景；双 S 由既有共用 SVG 叠加。",
  "unlockCondition": [
    "FLAG_A2_SCHOOL_ENTERED"
  ],
  "relatedFlags": [
    "FLAG_A2_SCHOOL_SS_FOUND"
  ],
  "notes": "imagegen 参照图生成的同款笔记页边；页边留空，不生成双 S。",
  "assetType": "image",
  "file": "IMG_A2_T05_012.png"
}
```

### `IMG_A3_T06_009`

```json
{
  "id": "IMG_A3_T06_009",
  "title": "空神龛底座近景",
  "act": 3,
  "phase": "A3_T06",
  "source": "scene",
  "purpose": "T06 空底座近景，与第一幕破庙塑像照片并列观察。",
  "unlockCondition": [
    "FLAG_A3_KITCHEN_DOOR_REACHED"
  ],
  "relatedFlags": [],
  "notes": "imagegen 参照图生成；保持空底座，不含塑像、文字或新线索。",
  "assetType": "image",
  "file": "IMG_A3_T06_009.png"
}
```

### `IMG_A4_T06_007`

```json
{
  "id": "IMG_A4_T06_007",
  "title": "禁闭室铁门",
  "act": 4,
  "phase": "A4_T06",
  "source": "scene",
  "purpose": "仍在使用的禁闭室；三孔与翻盖送餐口清楚可辨。",
  "unlockCondition": [],
  "relatedFlags": [],
  "notes": "imagegen 参照图生成；门孔透入少量光，不展示暴力。",
  "assetType": "image",
  "file": "IMG_A4_T06_007.png"
}
```

### `IMG_A4_T08_011`

```json
{
  "id": "IMG_A4_T08_011",
  "title": "大学食堂日常",
  "act": 4,
  "phase": "A4_T08",
  "source": "scene",
  "purpose": "食堂用餐桌面与窗外春日校园配图，不新增可辨身份人物。",
  "unlockCondition": [],
  "relatedFlags": [],
  "notes": "imagegen 参照原文与校园参照图生成；餐盘及文字保持无品牌、无可读字。",
  "assetType": "image",
  "file": "IMG_A4_T08_011.png"
}
```

### `IMG_A4_T08_012`

```json
{
  "id": "IMG_A4_T08_012",
  "title": "凌晨走廊 · 消防栓旁",
  "act": 4,
  "phase": "A4_T08",
  "source": "scene",
  "purpose": "厨房外、消防箱旁低视角走廊；不以厨房作此段封面。",
  "unlockCondition": [],
  "relatedFlags": [],
  "notes": "imagegen 参照图生成；凌晨低照度、地面干燥，消防箱清晰；不含人物或笔记。",
  "assetType": "image",
  "file": "IMG_A4_T08_012.png"
}
```

## 最终提示词与迭代记录

### `IMG_A2_T03_002`

参考：`src/第二幕/IMG_A2_T03_001.jpg` — 县图书馆阅览室、旧书材质与自然窗光。

**提示词**

```text
Use case: photorealistic-natural
Asset type: a detail photograph used as the county gazette cover image in a narrative reading page
Primary request: Create a believable close photograph of one old bound county gazette volume from the same county library shown in Image 1.
Input images: Image 1: reference image for the county library room, worn book materials, muted documentary realism, and natural window light; do not copy its readable signage or book titles.
Scene/backdrop: An old wooden reading table in that modest local-history library; softly blurred shelves from the reference room in the background.
Subject: A single thick, dark gray-green clothbound gazette volume, closed, with worn cloth texture, softened corners, and slightly yellowed page edges. Its cover and spine are blank, clean areas reserved for a title rendered later by the webpage.
Style/medium: Restrained documentary photography, natural material detail, historically ordinary, not cinematic.
Composition/framing: Landscape 4:3 photograph, three-quarter view slightly above the table; the closed volume fills most of the frame, with enough surroundings to establish the reading room. Keep the cover fully visible and in focus.
Lighting/mood: Soft daylight from the same kind of tall library window, quiet and factual.
Materials/textures: Faded book cloth, dry paper edges, old varnished wood, subtle dust.
Constraints: No people, no invented clues, no labels or readable marks on the book. The exact title will be rendered by the page.
Avoid: Any legible text, fake Chinese characters, pseudo-writing, logos, watermarks, dramatic effects, added artifacts, modern branding.
```

### `IMG_A2_T03_003`

参考：`src/第二幕/IMG_A2_T03_001.jpg` — 县图书馆环境与旧卷材质。

**提示词**

```text
Use case: photorealistic-natural
Asset type: an old-paper detail photograph shown beside readable county-history text in a narrative reading page
Primary request: Create a close photograph of an open, aged gazette volume from the same modest local-history library as Image 1; leave the paper visually quiet so the actual record text can be rendered by the webpage.
Input images: Image 1: reference for the same county library, old bound gazette volumes, table, and restrained natural-light documentary look. Do not copy legible signage or titles.
Scene/backdrop: The old book lies open on the wooden table in the referenced library; shelves are softly out of focus.
Subject: Two yellowed, fibrous, slightly wavering pages in a thick old gazette, with a visible central gutter, faded outer edges, and a little natural paper foxing. The page surfaces are mostly blank.
Style/medium: Close documentary photograph with sharp paper texture and natural age, matching the first image in this pair.
Composition/framing: Landscape 4:3, slightly elevated close view. The open pages occupy nearly the full image with generous calm blank space; book edges and softly blurred table establish context.
Lighting/mood: Quiet, soft window daylight; neutral and factual.
Constraints: Keep the page area clean for accurate text to be laid out separately. Do not include any symbols, handwriting, print, diagrams, stains shaped like letters, or clues.
Avoid: Readable or fake text, pseudo-writing, calligraphy, numbers, logos, watermarks, dramatic lighting, people, or newly invented objects.
```

### `IMG_A2_T05_012`

参考：`src/第二幕/IMG_A2_T05_006.jpg` — 已有学霸笔记页、纸张、桌面与紫色划线。

**提示词**

```text
Use case: photorealistic-natural
Asset type: a close-up detail photograph of the same scholar's school notebook, with a page-edge area reserved for a separately rendered comparison mark
Primary request: Create a new close view of the biology notes notebook shown in Image 1, photographed on the same school desk in the same quiet documentary style.
Input images: Image 1: reference for the existing notebook's paper, handwritten study-note feel, page shape, desk, and lighting. Do not copy or invent readable wording.
Scene/backdrop: A single open school notebook resting on a desk; the laptop edge and other paper remain soft and unobtrusive.
Subject: A close section near the outer edge of a handwritten biology-study page. Include a few understated black handwritten note lines with lavender underline strokes, matching the reference's general materials. Keep a generous, clean, empty page margin occupying about one fifth of the frame, with clear paper texture; this is where the interface will place the existing double-S SVG later.
Style/medium: Naturalistic documentary photograph of an actual school notebook, not a designed graphic.
Composition/framing: Portrait 3:4 close-up; page fills the frame, edge and margin are easy to see, slight oblique angle; focus is crisp on paper and the blank margin, writing farther inward is softly out of focus.
Lighting/mood: Soft neutral indoor daylight, ordinary school setting.
Constraints: The empty margin must contain no mark of any kind. Any study writing should be too soft to read and must not contain a symbol, emblem, letter pair, score, name, or clue. Do not draw the double S; it is added by the UI.
Avoid: Legible text, pseudo-writing that resembles a specific message, formulae, a double-S shape, icons, diagrams, logos, watermark, extra clues, or any alteration to story facts.
```

### `IMG_A3_T06_009`

参考：`src/第三幕/IMG_A3_T06_007.png` — 空木神龛与底座结构；`src/Photo_src/黑补母特写1.png` — 只参考旧址材质年代。

**提示词**

```text
Use case: photorealistic-natural
Asset type: a close observational photograph for a later-scene comparison of an empty kitchen shrine base
Primary request: Create a new close photograph of the same empty, worn wooden shrine structure shown in Image 1, making the vacant lower base easy to inspect.
Input images: Image 1: direct reference for the later scene's empty wooden shrine, tiled and flaking wall, dark worn wood, camera realism, and color. Image 2: reference for the unrelated earlier broken-temple sculpture and weathered stone; use it only to keep the old-site material age consistent. The output must remain empty.
Scene/backdrop: The neglected but still recognizable interior of the basement kitchen shrine area shown in Image 1, with its same pale peeling wall and muted green lower tile.
Subject: The existing small wooden shrine and its dusty, empty lower plinth/base. Show natural scuffs, old grain, a thin layer of dust, and the vacant central space; no object occupies the base.
Style/medium: Restrained, realistic documentary photograph, matching the supplied scene photos.
Composition/framing: Landscape 4:3, closer and slightly lower than Image 1; the empty base and lower part of the wooden structure are central and in sharp focus, while surrounding wall details softly recede.
Lighting/mood: Dim, ordinary interior light, enough exposure to see the empty base clearly; grounded and observational.
Materials/textures: Weathered stained wood, flaking paint, old tile, dust.
Constraints: Preserve the empty base and physical continuity with Image 1. Image 2 is only an age/material reference; do not transfer its figure or silhouette. Add no new story evidence.
Avoid: Any statue, person, figure, face, supernatural effect, religious symbol, inscription, glyph, carving that looks like a clue, water mark, blood, dramatic lighting, readable text, or watermark.
```

### `IMG_A4_T06_007`

参考：`src/第四幕/T06/IMG_A4_T06_006.png` — 原禁闭室门、三孔、翻盖；中间工作稿以同路径重新生成并由最终暗室图取代。

**提示词迭代 1**

```text
Use case: photorealistic-natural
Asset type: a 2014-era documentary scene photograph of an actively used confinement room, replacing a wider cover image
Primary request: Create a closer view of the same small institutional confinement room shown in Image 1, with the three door holes and flip-down meal hatch unmistakable.
Input images: Image 1: direct reference for the existing room, heavy metal door, three circular holes, hinged feeding hatch, plain bed, walls, and restrained realism. Reframe the same kind of room and preserve its physical details.
Scene/backdrop: A closed, windowless institutional room in 2014, worn but plainly maintained and still in use. Keep the heavy metal door on the far wall and a simple narrow bed partly visible.
Subject: The heavy steel door has exactly three small circular viewing holes in one horizontal row and one rectangular hinged meal-pass hatch below them. The holes and hatch are both clearly visible, recognizable, and correctly shaped. The room is austere and quiet.
Style/medium: Grounded documentary photography, muted colors, natural material wear, no cinematic exaggeration.
Composition/framing: Landscape 4:3, closer to the door than Image 1; the complete door fits in frame and dominates, with enough room context to show the bed and bare walls.
Lighting/mood: Dim institutional ceiling light, subdued and factual, but exposed enough to read all three holes and the hatch.
Materials/textures: Painted steel with ordinary scuffs, worn plaster, swept concrete floor, a neatly settled plain gray blanket.
Constraints: This is a room in use in 2014, not a derelict ruin. Preserve exactly three door holes and the single feeding hatch. No people or violence.
Avoid: Extra holes, barred doors, chains, heavy rust, broken fixtures, debris, peeling decay beyond Image 1's level, blood, restraint equipment, readable signs, writing, logos, watermarks, or supernatural effects.
```

**最终修订 2**

```text
Use case: precise-object-edit
Asset type: corrected 2014 confinement-room photograph for the memoir passage
Primary request: Edit Image 1 to show the same confinement room in very low light, still in use in 2014. Remove the bed and visible furniture, reduce the extensive peeling/rust so the room reads as austere and operational, and darken the room substantially.
Input images: Image 1: edit target; preserve the same heavy door, exact horizontal row of three circular viewing holes, and the single hinged meal-pass flap. Image 2: original room reference for the door and room identity.
Scene/backdrop: A small closed confinement room. Bare walls and floor surround the heavy iron door; nothing else is needed in frame.
Subject: Keep the door central and fully visible. It has exactly three small circular holes in one row. Below them is one closed, hand-span rectangular feeding flap. Only a trace of cool ambient light passes through the three holes; the rest of the room falls into deep shadow, with enough detail to recognize the door and flap.
Style/medium: Natural low-light documentary photography, sober and physically believable.
Composition/framing: Landscape 4:3, same straight-on view and door proportions as Image 1; no furniture in the lower corners.
Lighting/mood: Almost dark, as in a sealed room. The three holes admit only small dim points of ambient light, never a bright window beam. Keep the door outline readable.
Materials/textures: Aged but usable painted iron, plain worn plaster, a swept bare floor; modest wear only.
Constraints: Change lighting and room contents only as described; preserve the door with exactly three holes and one small feeding flap. No bed, no occupant, no violence, and no newly introduced clues.
Avoid: Bright room, sunlight, bed, furniture, windows, extra holes, bars, chains, debris, major rust, extensive flaking paint, people, writing, signs, logos, watermarks, horror styling, or supernatural effects.
```

### `IMG_A4_T08_011`

参考：`src/第四幕/T08/IMG_A4_T08_002.png` — 校园人工湖与早春颜色；中间湖景工作稿以食堂图取代。

**提示词迭代 1**

```text
Use case: photorealistic-natural
Asset type: a quiet establishing photograph for an ordinary university-campus day in the 2020 spring recollection
Primary request: Create a new everyday campus photograph from the same artificial-lake area and same season as Image 1, with a calm documentary feeling.
Input images: Image 1: reference for the actual campus lake, willow, water plants, stone path, muted spring palette, and realistic first-person documentary look. Do not reproduce the knees in the foreground.
Scene/backdrop: The same ordinary university lake edge in early spring: a paved path, budding willow branches, young water plants, lake surface, and campus buildings at a distance.
Subject: A commonplace campus day seen quietly from beside the path; mild breeze on the lake and reeds. If people appear, they are only a few tiny anonymous figures far away, with no readable faces or identifying details.
Style/medium: Natural documentary photography, restrained and believable, not a promotional brochure or cinematic scene.
Composition/framing: Landscape 4:3, eye-level establishing view from near the lakeside path; include enough lake, vegetation, and campus to establish place without a foreground person.
Lighting/mood: Soft bright overcast spring daylight, peaceful and ordinary with a slight introspective tone.
Color palette: Muted greens, gray-blue water, pale campus concrete; consistent with Image 1.
Constraints: Same season and campus setting; no new named or identifiable characters, no story clues.
Avoid: Close-up people, posed students, dramatic sunset, fantasy atmosphere, added monuments, readable signs, lettering, logos, watermarks, or UI.
```

**最终修订 2**

```text
Use case: precise-object-edit
Asset type: a quiet 2020 university-cafeteria photograph accompanying the passage about discovering ordinary student life
Primary request: Replace the lakeside view in Image 1 with a first-person seated view of a simple cafeteria meal on a table. Keep the same subdued early-spring palette, but make this clearly a dining hall scene.
Input images: Image 1: edit target; use only as a color and spring-season guide, replacing its lake and path. Image 2: campus reference for the soft daylight and green spring trees that can be seen through a distant cafeteria window; do not show its lake.
Scene/backdrop: An ordinary university dining hall in spring 2020. Through a window in the distance, show a little soft green campus foliage in daylight.
Subject: In the foreground, a plain cafeteria tray on a simple table with an everyday serving of rice and two modest dishes, plus a plain cup. Food looks ordinary and comforting; no mystery object or unusual clue.
Style/medium: Natural documentary photography, quiet and unposed, consistent with the existing university images.
Composition/framing: Landscape 4:3, first-person seated viewpoint looking down at the tray and table, with the dining-hall window and spring-green trees visible softly in the background. No lake, water, shoreline, or bench.
Lighting/mood: Soft bright overcast spring daylight, calm, ordinary, and slightly reflective.
Constraints: The image should suggest an everyday meal and campus life without adding a named or identifiable person. Keep the frame focused on tray/table and distant window.
Avoid: Any lake or waterfront, posed/clear people, visible faces, hands, phones, text, labels, logos, institution names, branded cups, dramatic lighting, extra clues, or watermark.
```

### `IMG_A4_T08_012`

参考：`src/第四幕/T09/IMG_A4_T09_001.png` — 走廊消防箱、门窗与空间方向；中间工作稿经过两次干燥/运营状态修正。

**提示词迭代 1**

```text
Use case: photorealistic-natural
Asset type: a low-angle first-person setting photograph for the escape-to-safety passage; no kitchen contents
Primary request: Create a new low-view photograph of the same old institutional corridor and wall fire-hose box shown in Image 1, from close to the floor beside the box.
Input images: Image 1: reference for the exact corridor palette, peeling pale/green wall, window placement, tile floor, and red wall-mounted fire-hose box. Preserve the same location cues but change the camera position to floor level.
Scene/backdrop: The boundary corridor between classroom and confinement areas, the morning after an escape from a basement. This is an ordinary institutional corridor; frame only the hallway and the fire-hose box.
Subject: A red circular fire-hose reel in its old wall-mounted cabinet, at arm's reach on the right wall. The surrounding corridor leads softly into the background; no package or notebook is visible.
Style/medium: Restrained documentary photography with realistic wear, matching Image 1; this is an observation of a real place, not an action scene.
Composition/framing: Landscape 4:3, very low first-person viewpoint near seated floor height. The fire-hose box is prominent and recognizable on the near wall; a strip of tiled floor leads into the corridor. No person in frame.
Lighting/mood: Early morning ambient daylight entering from the same high windows, subdued, cool, and factual.
Materials/textures: Worn tile, faded paint, an old red fire-hose reel and metal cabinet. Keep the hallway imperfect but maintained.
Constraints: Keep this scene in the corridor by the fire-hose box; the kitchen is outside the frame. This is a low viewpoint, not a new event or new clue.
Avoid: Kitchen fixtures, cooking, food, meat, any package or notebook, extra fire equipment, people, blood, dramatic motion, heavy debris, readable signs, text, logos, watermarks, or supernatural effects.
```

**提示词迭代 2**

```text
Use case: precise-object-edit
Asset type: a dawn low-angle first-person photograph of the active institutional corridor beside its fire-hose box
Primary request: Edit Image 1 into a dim pre-dawn scene in the same corridor in 2020. Keep the low floor-level camera and the same red fire-hose reel and wall structure, but make the hall feel operational, dry, and maintained.
Input images: Image 1: edit target; preserve the close fire-hose reel, corridor direction, wall colors, window placement, and low viewpoint. Image 2: original corridor reference for the same location and fire-hose box.
Scene/backdrop: The indoor corridor at the boundary between classroom and confinement areas before daybreak, after the kitchen passage. The kitchen is elsewhere and must not appear.
Subject: The same red wall-mounted fire-hose reel remains clear and within arm's reach. The hallway is empty. Its tiled floor is dry and clear, with normal wear only.
Style/medium: Natural documentary photography, believable old institutional interior still in operation in 2020.
Composition/framing: Landscape 4:3, same very low first-person view near seated floor height; the box remains prominent on the right wall and a clean strip of corridor recedes into shadow.
Lighting/mood: Pre-dawn low light with one weak practical ceiling lamp and only faint ambient light. No bright sun, daylight beams, or dramatic glow. Keep the fire-hose box identifiable.
Materials/textures: Worn but serviceable painted plaster, dry tile, ordinary scuffs, unchanged red reel cabinet.
Constraints: Keep the same corridor and box. Remove all leaves and standing water, and reduce decay so it reads as an operating indoor facility. Do not show a person, injury, kitchen, or notebook.
Avoid: Bright daylight, sunlit windows, wet reflective floor, piles of leaves, debris, severe peeling, dilapidation, food, kitchen fixtures, fire, package, notebook, visible people, readable signs, logos, watermarks, supernatural effects.
```

**最终修订 3**

```text
Use case: precise-object-edit
Asset type: final correction to the low-angle pre-dawn institutional corridor photograph
Primary request: Make the indoor floor and wall in Image 1 unmistakably dry and in ordinary use while preserving its fire-hose box, corridor geometry, and low first-person camera.
Input images: Image 1: edit target. Preserve the red wall-mounted fire-hose reel, the window and corridor layout, and the floor-level viewpoint.
Scene/backdrop: The same 2020 institutional corridor before dawn, inside the classroom/confinement area boundary.
Subject: The red fire-hose reel remains prominent at arm's reach. The corridor is empty and operational.
Composition/framing: Keep Image 1's landscape 4:3 crop, low first-person perspective, and the fire-hose box on the right wall.
Lighting/mood: Dim, weak practical ceiling light and faint pre-dawn ambient light. Avoid any daylight beam or strong highlights.
Materials/textures: Dry matte tile with subtle ordinary scuffs, no glossy surface or reflections; painted walls with only small patches of age and no large peeling flakes.
Constraints: Change the floor to completely dry, non-reflective matte tile and reduce wall decay so this is clearly a working indoor corridor. Keep all scene geometry and the fire-hose box intact.
Avoid: Any wet or polished look, puddles, reflected lamps, leaves, debris, broad peeling paint, severe rust, bright sunshine, people, injuries, kitchen contents, packages, notebooks, text, logos, or watermark.
```

## 验收边界

- 仅增加这七个新 ID、源 PNG、对应 WebP 映射与本账本；没有重新压缩既有141张资源。
- A2 T03 标题和正文由网页层准确显示；A2 T05 双 S 由既有共用 SVG 叠加。
- A3 新图保留空底座；A4 T06 保留三孔铁门与手掌大小翻盖；A4 T08 食堂图不重复湖景，消防箱图不出现厨房、人物或笔记。
- 未运行完整测试、构建或浏览器走查；父级负责本批统一集成验证。
