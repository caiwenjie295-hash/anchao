# UX-0003 图片生成清单（T01、T05、T06）

本分支按后续分工负责 T01、T05、T06，共 14 张。全部由本会话内置 `image_gen` 工具逐个独立生成，最终 PNG 已复制到本 worktree。提示词中记录了实际通过检查并保留为最终文件的版本。

## 检查结果

| ID | 文件 | 关键内容与检查 | 状态 |
|---|---|---|---|
| IMG_A4_T01_001 | `src/第四幕/T01/IMG_A4_T01_001.png` | 可用。普通县城低层住宅街景、简朴客房与塑料袋里的褐色笔记本清楚可辨；已按主审意见替换西式旅馆候选。 | 可用 |
| IMG_A4_T05_001 | `src/第四幕/T05/IMG_A4_T05_001.png` | 可用。晚自习课桌、练习册和日记本构图明确，人物只见远景背影。 | 可用 |
| IMG_A4_T05_002 | `src/第四幕/T05/IMG_A4_T05_002.png` | 可用。教师办公室桌面、茶杯与空白纸张可辨，光线自然。 | 可用 |
| IMG_A4_T05_003 | `src/第四幕/T05/IMG_A4_T05_003.png` | 可用。与 T05_005 同一普通县城公寓风格：窄门厅、防盗门、瓷砖、鞋柜、行李箱及早餐。 | 可用 |
| IMG_A4_T05_004 | `src/第四幕/T05/IMG_A4_T05_004.png` | 可用。冬日河岸、空椅与远景家庭/孩子构成可辨，人物处于远景。 | 可用 |
| IMG_A4_T05_005 | `src/第四幕/T05/IMG_A4_T05_005.png` | 可用。三人生日餐桌与生日蛋糕清楚，仅出现手部；餐桌内容不编造关键证据。 | 可用 |
| IMG_A4_T05_006 | `src/第四幕/T05/IMG_A4_T05_006.png` | 可用。室内卧室门缝、镜中客厅和远景背影可辨；与 T05_003/005 共用公寓空间和暖色调。 | 可用 |
| IMG_A4_T05_007 | `src/第四幕/T05/IMG_A4_T05_007.png` | 可用。门槛第一人称朝屋内回望，前景行李箱表明视角正向外迈出；父母留在客厅深处，门边仅有模糊来人局部，未显示接触或暴力。 | 可用 |
| IMG_A4_T06_001 | `src/第四幕/T06/IMG_A4_T06_001.png` | 可用。清晨操场、两层围栏和灰色教学楼清楚；无人院落，无具体机构标识。 | 可用 |
| IMG_A4_T06_002 | `src/第四幕/T06/IMG_A4_T06_002.png` | 可用。中国食堂不锈钢分格餐盘、筷子、米饭和普通菜肉可辨；细小浅色碎片自然且未作来源判断。 | 可用 |
| IMG_A4_T06_003 | `src/第四幕/T06/IMG_A4_T06_003.png` | 可用。2014 年正常使用的教室，课桌、课本、黑板和墙面喇叭齐全，墙面干净。 | 可用 |
| IMG_A4_T06_004 | `src/第四幕/T06/IMG_A4_T06_004.png` | 可用。维护中的学校走廊及广播喇叭清楚，与 T06_003 校园环境连贯，无废弃感。 | 可用 |
| IMG_A4_T06_005 | `src/第四幕/T06/IMG_A4_T06_005.png` | 可用。宿舍下铺被面与空白折纸位于前景，未编造纸条内容。 | 可用 |
| IMG_A4_T06_006 | `src/第四幕/T06/IMG_A4_T06_006.png` | 可用。无人房间中铁门的三个观察孔和送餐翻盖清楚，无暴力画面。 | 可用 |

## 每图提示词

### 通用摄影要求

除下列独立场景要求外，采用低饱和、极度写实的手机纪实摄影；横向构图，适合网页大幅场景；按环境使用自然阴天、普通室内灯或可信夜间曝光。人物仅远景、背影或局部手部，不留可识别人脸。避免水印、平台标志、插画感和电影海报感。难以准确生成的字句保留空白，由前端文字层呈现。

### 各资源最终提示词

#### IMG_A4_T01_001
文件：`src/第四幕/T01/IMG_A4_T01_001.png`
检查：可用。普通县城低层住宅街景、简朴客房与塑料袋里的褐色笔记本清楚可辨；已按主审意见替换西式旅馆候选。
参考图：无；重做时按主审反馈定向生成。

```text
Use case: photorealistic-natural
Asset type: widescreen scene photograph for an interactive Chinese narrative.
Primary request: Replacement final image for IMG_A4_T01_001: a plain, modest hotel room or guesthouse room in an ordinary Chinese county town at night, seen from a first-person viewpoint while reviewing a brown notebook brought back in a transparent plastic bag.
Scene/backdrop: practical small-town lodging with simple laminate furniture, basic curtains, plain walls and a low-rise residential street outside the window; outside show only low apartment buildings, a streetlamp and quiet road. No landmarks.
Subject: a worn brown notebook inside a clear plastic bag on a simple desk, with two small printed photographs nearby. Pages closed or turned away; leave space for interface text.
Style/medium: extremely realistic low-saturation smartphone snapshot, candid documentary texture, subtle natural imperfections.
Composition/framing: horizontal wide view, desk and notebook foreground, ordinary window and low-rise street in background.
Lighting/mood: modest warm ceiling or desk light mixed with cool night light from outside, restrained and quiet.
Constraints: Chinese county-town domestic context. Avoid church spires, towers, Western hotel decor, ornate lamps, carpets, European furniture, luxury styling, readable text, logos, watermark, illustration, or cinematic poster treatment.
```

#### IMG_A4_T05_001
文件：`src/第四幕/T05/IMG_A4_T05_001.png`
检查：可用。晚自习课桌、练习册和日记本构图明确，人物只见远景背影。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T05_001.
Scene/backdrop and key content: 2014 evening self-study desk, fluorescent-lit Chinese high school classroom, worn wooden desk with workbook partly covering a closed diary; empty foreground, no readable writing.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

#### IMG_A4_T05_002
文件：`src/第四幕/T05/IMG_A4_T05_002.png`
检查：可用。教师办公室桌面、茶杯与空白纸张可辨，光线自然。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T05_002.
Scene/backdrop and key content: modest Chinese high school teacher's office, ceramic teacup with tea leaves on a desk, papers turned blank-side up, late afternoon window light; no people.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

#### IMG_A4_T05_003
文件：`src/第四幕/T05/IMG_A4_T05_003.png`
检查：可用。与 T05_005 同一普通县城公寓风格：窄门厅、防盗门、瓷砖、鞋柜、行李箱及早餐。
参考图：`src/第四幕/T05/IMG_A4_T05_005.png`（同一家庭客厅风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative scene photograph, companion image to a Chinese family birthday dinner.
Primary request: replacement candidate for IMG_A4_T05_003, showing Wang Ao arriving home on his birthday in 2014.
Input image: use the provided reference image only for the modest Chinese apartment interior, warm lived-in color and lighting continuity; do not copy its table, cake, framing, or objects.
Scene/backdrop: a narrow entry foyer inside an ordinary Chinese county-town apartment building, 2014. Plain tile floor, a practical metal security door, small shoe cabinet with slippers, simple wood veneer doors; beyond the foyer, a glimpse of the same warm modest living room.
Subject: a small suitcase set beside the entry door and a simple breakfast tray visible on a nearby counter, no people.
Style/medium: extremely realistic low-saturation smartphone snapshot, candid documentary texture.
Composition/framing: horizontal wide image from inside the apartment, foyer clearly visible and linked to the living room.
Lighting/mood: quiet winter morning, soft cool window light balanced by warm household lighting.
Constraints: Chinese county apartment, not a detached house; no stairs, porch, suburban lawn, Western door design, ornate furniture, readable text, brand logos, watermark, illustration, or cinematic poster treatment.
```

#### IMG_A4_T05_004
文件：`src/第四幕/T05/IMG_A4_T05_004.png`
检查：可用。冬日河岸、空椅与远景家庭/孩子构成可辨，人物处于远景。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T05_004.
Scene/backdrop and key content: winter riverbank in a small Chinese county town, a simple chair in the foreground, distant children playing and families walking as tiny indistinct figures, dry grass and pale sun.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

#### IMG_A4_T05_005
文件：`src/第四幕/T05/IMG_A4_T05_005.png`
检查：可用。三人生日餐桌与生日蛋糕清楚，仅出现手部；餐桌内容不编造关键证据。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T05_005.
Scene/backdrop and key content: ordinary family birthday dinner table for three in a modest home, dishes and chopsticks, two adults' hands at edge of frame exchanging a subtle glance, no faces.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

#### IMG_A4_T05_006
文件：`src/第四幕/T05/IMG_A4_T05_006.png`
检查：可用。室内卧室门缝、镜中客厅和远景背影可辨；与 T05_003/005 共用公寓空间和暖色调。
参考图：`src/第四幕/T05/IMG_A4_T05_003.png`、`IMG_A4_T05_005.png`（同一住宅空间参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative scene photograph, same home as the approved Chinese apartment reference images.
Primary request: replacement candidate for IMG_A4_T05_006, the bedroom-door mirror scene from a teenager's first-person viewpoint in 2014.
Input images: use the two reference images only to match the ordinary Chinese county apartment's warm modest interior, tile floor, wood veneer and lived-in lighting; do not copy their framing or suitcase.
Scene/backdrop: inside a small bedroom, looking through a narrow gap in a plain wood veneer bedroom door into the same modest Chinese apartment living room. The apartment has a tiled hallway and an ordinary metal security entrance door in the distance.
Subject: a small rectangular mirror held or propped beside the bedroom door edge reflects only soft, distant adult silhouettes in the living room; no faces, no clear details.
Style/medium: extremely realistic low-saturation smartphone snapshot, quiet documentary texture.
Composition/framing: horizontal wide frame, bedroom door gap occupies the foreground, mirror reflection and warm living room visible through it.
Lighting/mood: warm household lamp light in the living room, dimmer bedroom foreground, restrained and observational.
Constraints: Chinese county-town apartment, narrow interior, no stairs, porch, suburban lawn, Western door or window details, ornate decor, readable text, logos, watermark, violence, or cinematic poster treatment.
```

#### IMG_A4_T05_007
文件：`src/第四幕/T05/IMG_A4_T05_007.png`
检查：可用。门槛第一人称朝屋内回望，前景行李箱表明视角正向外迈出；父母留在客厅深处，门边仅有模糊来人局部，未显示接触或暴力。
参考图：`src/第四幕/T05/IMG_A4_T05_003.png`、`src/第四幕/T05/IMG_A4_T05_006.png`（同一住宅空间参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative scene photograph, same Chinese county apartment as the reference images.
Primary request: replacement candidate for IMG_A4_T05_007. Show a 2014 first-person moment at the threshold as teenage Wang Ao is leaving the family apartment.
Input images: use the references only to preserve the same narrow tiled foyer, shoe cabinet, plain metal security door, wood veneer trim and warm modest living room; do not copy their framing or props.
Scene/backdrop: camera at the apartment threshold, just outside the open metal security door, looking back inward through the same narrow tiled foyer toward the warm living room. The familiar shoe cabinet and slippers are visible.
Subject: the parents remain far inside the apartment near the living room, only distant soft silhouettes. At the edge of the frame, a partial sleeve or shoulder of another adult is visible just outside the doorway, suggesting an escort without showing contact. A small suitcase remains near the threshold. The camera viewpoint is moving outward.
Style/medium: extremely realistic low-saturation smartphone snapshot with restrained documentary texture.
Composition/framing: horizontal wide first-person view across the threshold into the apartment; parents are clearly inside and behind the camera's direction of travel. Keep the entrance frame and floor continuous with the reference home.
Lighting/mood: warm household light inside, cooler corridor light outside, subdued and observational.
Constraints: the protagonist is the first-person viewer stepping outward; parents stay inside. No adults pulling or carrying a suitcase, no adults leaving, no visible restraint, violence, injury, identifiable faces, exterior porch, suburban house, readable text, logos, watermark, illustration, or cinematic poster treatment.
```

#### IMG_A4_T06_001
文件：`src/第四幕/T06/IMG_A4_T06_001.png`
检查：可用。清晨操场、两层围栏和灰色教学楼清楚；无人院落，无具体机构标识。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen immersive narrative background photograph.
Primary request: IMG_A4_T06_001, a quiet institutional school courtyard at dawn, observed from an ordinary first-person standing viewpoint.
Scene/backdrop: broad concrete exercise yard, two layers of tall plain metal perimeter fencing, a gray two-story classroom building in the distance, cool overcast early-morning sky.
Subject: empty yard with a few distant, indistinct figures only if naturally present; no identifiable people or faces.
Style/medium: candid documentary smartphone photography, natural imperfections, low saturation.
Composition/framing: horizontal wide frame, eye-level view, open concrete foreground leads toward the building and fences.
Lighting/mood: dim cool dawn, calm and observational.
Color palette: muted gray, dusty green, faded concrete.
Constraints: no readable signs or text, no logo, watermark, weapons, barbed wire, violence, dramatic horror, cinematic poster treatment, or illustration.
```

#### IMG_A4_T06_002
文件：`src/第四幕/T06/IMG_A4_T06_002.png`
检查：可用。中国食堂不锈钢分格餐盘、筷子、米饭和普通菜肉可辨；细小浅色碎片自然且未作来源判断。
参考图：无；按中国食堂器具重新生成。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative scene photograph of an ordinary institutional cafeteria meal.
Primary request: replacement candidate for IMG_A4_T06_002, the same simple daily breakfast tray seen from the first-person viewpoint in a Chinese institution in 2014.
Scene/backdrop: modest Chinese institutional dining hall with plain tables and neutral tiled floor, softly visible beyond the tray.
Subject: a shallow stainless-steel divided cafeteria tray holding a small portion of rice and ordinary braised meat with vegetables. Among the food, include one tiny naturally occurring pale translucent crescent-shaped sliver, subtle and not enlarged; its origin remains indeterminate. Include familiar Chinese chopsticks and a small Chinese ceramic soup spoon, no fork.
Style/medium: extremely realistic low-saturation phone photograph, matter-of-fact documentary look.
Composition/framing: horizontal wide overhead-oblique first-person view, tray centered at normal arm's length; food remains a modest serving, not a macro.
Lighting/mood: plain soft fluorescent cafeteria light, neutral and unremarkable.
Constraints: visually unmistakable Chinese cafeteria utensils and steel tray; no Western plate setting, fork, knife, no mystery-organ close-up, no gore, no readable text, logos, watermark, illustration, or cinematic poster treatment. Do not suggest or identify the meat's source.
```

#### IMG_A4_T06_003
文件：`src/第四幕/T06/IMG_A4_T06_003.png`
检查：可用。2014 年正常使用的教室，课桌、课本、黑板和墙面喇叭齐全，墙面干净。
参考图：无；按 2014 年在用教室重新生成。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative background photograph inside a school in 2014.
Primary request: replacement candidate for IMG_A4_T06_003, a classroom in regular daily use for morning reading.
Scene/backdrop: ordinary Chinese school classroom with maintained pale walls, rows of used but tidy wooden desks, a dark green chalkboard, windows and a small wall-mounted broadcast speaker.
Subject: one open literature textbook on the nearest desk with pages blank or indistinct, a pencil and notebooks nearby; no people.
Style/medium: low-saturation, extremely realistic phone snapshot with ordinary documentary texture.
Composition/framing: horizontal wide room view from seated student eye level, foreground desk and open book, speaker visible on the wall.
Lighting/mood: soft morning daylight mixed with normal classroom ceiling lighting.
Constraints: active, cared-for classroom in 2014; desks and walls show ordinary age but no abandonment, heavy dust, rubble, peeling extreme decay, graffiti, readable text, logos, watermark, illustration, or cinematic poster treatment.
```

#### IMG_A4_T06_004
文件：`src/第四幕/T06/IMG_A4_T06_004.png`
检查：可用。维护中的学校走廊及广播喇叭清楚，与 T06_003 校园环境连贯，无废弃感。
参考图：无；按 2014 年维护中的走廊重新生成。

```text
Use case: photorealistic-natural
Asset type: widescreen narrative background photograph of a school corridor in regular use in 2014.
Primary request: replacement candidate for IMG_A4_T06_004, the same school corridor seen at two different times of day with a clearly visible broadcast speaker.
Scene/backdrop: ordinary maintained Chinese school corridor with pale painted walls, classroom doors, clean tile floor, simple windows and a small wall-mounted public-address loudspeaker. Everyday school furniture may be visible through an open classroom door. No people.
Style/medium: extremely realistic low-saturation smartphone snapshot, natural documentary look.
Composition/framing: horizontal wide view looking down the corridor, speaker easy to spot high on the wall; the hall feels connected to the classroom setting in IMG_A4_T06_003.
Lighting/mood: normal fluorescent ceiling lights mixed with daylight through windows, neutral morning/evening tone.
Constraints: active, maintained school in 2014; no abandoned building, no heavy dust, no peeling extreme decay, no debris, no fire hose reel, no broken windows, no readable signs, logos, watermark, violence, illustration, or cinematic poster treatment.
```

#### IMG_A4_T06_005
文件：`src/第四幕/T06/IMG_A4_T06_005.png`
检查：可用。宿舍下铺被面与空白折纸位于前景，未编造纸条内容。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T06_005.
Scene/backdrop and key content: first-person dormitory view of a lower bunk bed with plain blanket and one small folded blank paper note resting on it, restrained morning light, no people.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

#### IMG_A4_T06_006
文件：`src/第四幕/T06/IMG_A4_T06_006.png`
检查：可用。无人房间中铁门的三个观察孔和送餐翻盖清楚，无暴力画面。
参考图：第三幕 `src/第三幕/IMG_A3_T07_003.png`（风格参考）。

```text
Use case: photorealistic-natural
Asset type: widescreen scene background for an interactive narrative.
Style/medium: extremely realistic, low-saturation candid smartphone photography with natural imperfections and documentary restraint. Horizontal framing suitable for a large web scene. Natural overcast daylight, ordinary fluorescent light, or believable night phone exposure as appropriate. Preserve a clean area for exact text overlay where documents or screens appear.
Constraints: no readable invented words, no watermark, no platform or brand logo, no illustration, no cinematic poster treatment, no sensational horror or graphic violence. Do not invent plot evidence, identity, motive, destination, or the source of food. People, when present, are distant, turned away, or limited to hands; no identifiable faces.
Primary request: Generate one independent photograph for asset IMG_A4_T06_006.
Scene/backdrop and key content: small dim institutional holding room viewed from inside, heavy closed metal door with three small round peepholes and a low meal hatch, bare concrete walls, no person, no violence.
Composition/framing: Natural first-person snapshot framing, horizontal wide view; make the main scene recognizable and leave breathing room for interface text.
```

## 生成与复核记录

- 14 个最终 PNG 均能由 Windows 图像解码器读取；全部横向构图，尺寸以图像清单对应文件为准。
- T06 操场的第一版提示词被生成安全审核拒绝；简化为无人普通校园院落后生成成功，没有使用占位或程序绘图。
- T01 第一版被主审指出偏西式旅馆背景；原始候选保留在 Codex 生成目录，县城低层住宅街景版本通过抽查并替换。
- T05_003、T05_006、T05_007 初版被主审指出住宅地域不连续；按 T05_005 的客厅色调和陈设重做，统一为普通县城公寓。T05_007 后续再次调整为第一人称向外迈出、父母留在屋内的方向。
- T06_002 初版被指出餐具偏西式；已改为中式分格餐盘和筷子。T06_003/004 初版空间显得废弃；已重做为 2014 年正常使用、维护中的校园环境。
- 本清单覆盖此分支负责的 14 张；T07–T10 由其他独立 worktree 负责。
