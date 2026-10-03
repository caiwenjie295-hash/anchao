import assert from 'node:assert/strict';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jsdom from 'jsdom';
const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;

// Execute the actual deliverable in a DOM test environment, without a web server.
// A synthetic origin gives jsdom storage semantics; real file:// browser QA is separate.
const directory = '暗潮离线';
const html = await readFile(`${directory}/index.html`, 'utf8');
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'));
const filePaths = new Set(manifest.files.map((file) => file.path));
assert.equal(manifest.entry, 'index.html');
assert.equal(manifest.totalBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
for (const file of manifest.files) {
  assert.equal((await stat(`${directory}/${file.path}`)).size, file.bytes, `Missing or altered ${file.path}`);
}
assert.ok(Buffer.byteLength(html) < 10_000, 'Offline HTML must remain small');
const javascript = await readFile(`${directory}/assets/app.js`, 'utf8');
assert.equal((javascript.match(/data:image/g) ?? []).length, 0, 'Images must not be embedded in app.js');
function assertLocalImage(value) {
  const url = new URL(value);
  assert.equal(url.origin, 'https://anchao-offline.test');
  const path = decodeURIComponent(url.pathname.slice(1));
  assert.match(path, /^assets\/.+\.(png|jpe?g|webp)$/i);
  assert.ok(filePaths.has(path), `Image missing from manifest: ${path}`);
}
const pages = JSON.parse(await readFile('data/browser_pages.json', 'utf8')).items;
const imageAssets = JSON.parse(await readFile('data/images.json', 'utf8')).items;
const act2T07Data = JSON.parse(await readFile('data/act2_t07.json', 'utf8'));
  const act3Docs = ['t00', 't01', 't02', 't03', 't04', 't05', 't06', 't07'].map(async (name) => JSON.parse(await readFile(`data/act3_${name}.json`, 'utf8')));
  const [t00Doc, t01Doc, t02Doc, t03Doc, t04Doc, t05Doc, t06Doc, t07Doc] = await Promise.all(act3Docs);
const act3RequiredClues = {
  T00: ['CLUE_A3_T00_CABLE_BREAK', 'CLUE_A3_T00_DRAIN_DISCOVERED'],
  T01: ['CLUE_A3_T01_GATE_VIEW', 'CLUE_A3_T01_SIGN_REVEALED', 'CLUE_A3_T01_MAIN_BUILDING'],
  T02: ['CLUE_A3_T02_BLACKBOARD', 'CLUE_A3_T02_SLOGAN_SPEAKER'],
  T03: ['CLUE_A3_T03_24H', 'CLUE_A3_T03_PEEPHOLES', 'CLUE_A3_T03_48_72H'],
  T04: ['CLUE_A3_T04_VVAKE_PAPER'],
  T05: ['CLUE_A3_T05_13ACK_PAPER'],
  T06: ['CLUE_A3_T06_SHRINE', 'CLUE_A3_T06_EMPTY_BASE', 'CLUE_A3_T06_TEMPLE_COMPARE'],
  T07: ['CLUE_A3_T07_XIAOYUE_MEMORY', 'CLUE_A3_T07_BACK_GAP', 'CLUE_A3_T07_NOTEBOOK_PICKUP', 'CLUE_A3_T07_FIRST_PAGE'],
};
const errors = [];
const requests = [];
const seenTransitionIds = new Set();
const offlineRuns = Math.max(1, Math.min(2, Number.parseInt(process.env.ANCHAO_OFFLINE_RUNS ?? '2', 10) || 2));
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => errors.push(error.message));
let dom;
const delay = () => new Promise((resolve) => setTimeout(resolve, 30));
async function simulateOfflineImageDecodes() {
  if (!dom) return;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const image of dom.window.document.querySelectorAll('img[src]')) {
      const url = new URL(image.currentSrc || image.src, dom.window.location.href);
      const path = decodeURIComponent(url.pathname.slice(1));
      if (url.origin !== 'https://anchao-offline.test' || !filePaths.has(path)) continue;
      const alreadyDecoded = image.dataset.offlineTestDecodedSource === image.src;
      const stillLoading = image.closest('.photo-viewport')?.querySelector('.photo-viewport__load-state')
        || image.closest('.t07-frame')?.querySelector('.t07-frame__placeholder');
      if (alreadyDecoded && !(pass === 1 && stillLoading)) continue;
      // jsdom fetches local bytes but has no image decoder; model a successful decode for interaction tests.
      if (!alreadyDecoded) {
        Object.defineProperties(image, {
          naturalWidth: { configurable: true, value: 1448 },
          naturalHeight: { configurable: true, value: 1086 },
          complete: { configurable: true, value: true },
        });
        image.dataset.offlineTestDecodedSource = image.src;
      }
      image.dispatchEvent(new dom.window.Event('load', { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
async function settle() {
  await delay();
  await simulateOfflineImageDecodes();
  // Continue each story card as a player would before testing the next action.
  for (let i = 0; i < 3; i++) {
    const launch = dom?.window.document.querySelector('.story-transition-launch:not([aria-label="第三幕调查已就绪"]):not([aria-label="第四幕调查已就绪"]) button');
    if (launch) { launch.click(); await delay(); await simulateOfflineImageDecodes(); }
    const card = dom?.window.document.querySelector('.story-transition');
    const button = card?.querySelector('button');
    if (!button) break;
    seenTransitionIds.add(card.getAttribute('data-story-transition'));
    button.click();
    await delay(); await simulateOfflineImageDecodes();
  }
}
async function mount(saved) {
  dom?.window.close();
  dom = new JSDOM(html, {
    url: 'https://anchao-offline.test', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole,
    resources: { interceptors: [requestInterceptor(async (request) => {
      requests.push(request.url);
      const url = new URL(request.url);
      const path = decodeURIComponent(url.pathname.slice(1));
      if (url.origin !== 'https://anchao-offline.test' || !filePaths.has(path)) return new Response('', { status: 403 });
      const type = path.endsWith('.js') ? 'application/javascript' : path.endsWith('.css') ? 'text/css' : 'application/octet-stream';
      return new Response(await readFile(`${directory}/${path}`), { headers: { 'Content-Type': type } });
    })] },
    beforeParse(window) {
      // jsdom lacks native dialog methods; this checks open/close wiring, not modal layout or focus.
      window.HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
      window.HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
      if (saved) window.localStorage.setItem('anchao.save.v1', saved);
    },
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Offline document load timed out')), 10_000);
    dom.window.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
  await delay();
  await simulateOfflineImageDecodes();
  if (!saved) assert.equal(dom.window.document.querySelector('.story-transition')?.getAttribute('data-story-transition'), 'TRANSITION_A1_INTRO');
  await settle();
}
const document = () => dom.window.document;
const save = () => dom.window.localStorage.getItem('anchao.save.v1');
const state = () => JSON.parse(save());
function query(selector) {
  const element = document().querySelector(selector);
  assert.ok(element, `Missing element: ${selector}`);
  return element;
}
async function click(selector) {
  const button = query(selector);
  if ('disabled' in button) assert.equal(button.disabled, false, `Disabled button: ${selector}`);
  button.click(); await settle();
}
async function lastPage(blockId) {
  const buttons = query(`[data-block-id="${blockId}"] .a4-reader__page-index`).querySelectorAll('button');
  assert.ok(buttons.length > 0, `${blockId} should expose a paged reading control`);
  await click(`[data-block-id="${blockId}"] .a4-reader__page-index button:last-child`);
}
async function waitForEnabled(selector) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const button = query(selector);
    if (!button.disabled) return;
    await delay();
    await simulateOfflineImageDecodes();
  }
  assert.equal(query(selector).disabled, false, `Button did not become enabled after its local image decode: ${selector}`);
}
async function textButton(text, selector = 'button') {
  const button = [...document().querySelectorAll(selector)].find((item) => item.textContent.includes(text));
  assert.ok(button, `Missing button: ${text}`);
  assert.equal(button.disabled, false);
  button.click(); await settle();
}
async function setInput(selector, value) {
  const input = query(selector);
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await settle();
}
async function openApp(title) {
  const button = [...document().querySelectorAll('.taskbar button')].find((item) => (item.getAttribute('aria-label') ?? '').endsWith(` ${title}`));
  assert.ok(button, `Missing taskbar button: ${title}`);
  if (button.classList.contains('taskbar__app--active')) return;
  button.click(); await settle();
}
/** 任务栏按钮在窗口已打开时会变成“切换到 …”。 */
async function openOrFocusApp(title) {
  const button = [...document().querySelectorAll('.taskbar button')].find((item) => (item.getAttribute('aria-label') ?? '').endsWith(` ${title}`));
  assert.ok(button, `Missing taskbar button: ${title}`);
  assert.equal(button.disabled, false, `Disabled taskbar button: ${title}`);
  button.click(); await settle();
}
async function browse(term) {
  await setInput('#browser-search', term);
  query('.browser-address').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  assert.ok(document().querySelectorAll('.browser-results button').length >= 6, `No noise results for: ${term}`);
}
async function investigate() {
  await openApp('微信');
  assertLocalImage(query('.avatar-sprite image').getAttribute('href'));
  await textButton('小月', '.wechat-conversation');
  await click('.wechat-chat .evidence-thumbnail');
  assert.ok(query('.evidence-lightbox[open]'));
  await click('.evidence-lightbox[open] button');
  await textButton('母亲', '.wechat-conversation');
  await new Promise((resolve) => setTimeout(resolve, 1300));
  assert.equal(state().game.flags.FLAG_A1_XIAOA_MISSING_KNOWN, true);
  await openApp('邮箱');
  await textButton('小A', '.mail-row__open');
  await openApp('浏览器');
  await setInput('#browser-search', 'XX县失踪');
  query('.browser-address').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  await textButton(pages.find((page) => page.id === 'PAGE_A1_E_001').headline, '.browser-results button');
  assert.equal(document().querySelectorAll('.browser-page figure').length, 2);
  await click('[aria-label="后退"]');
  await setInput('#browser-search', '鸡公岭');
  query('.browser-address').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  await textButton(pages.find((page) => page.id === 'PAGE_A1_E_002').headline, '.browser-results button');
  assert.equal(state().game.phase, 'F');
  await textButton('继续', '.journey-transition button');
  for (let i = 0; i < 3; i++) await click('.scene-continue');
  assert.equal(state().game.phase, 'H');
  assert.equal(query('.scene-camera').disabled, true);
  await click('[aria-label="查看A.W"]');
  assertLocalImage(query('.act1-scene__detail img').src);
  await click('.scene-camera');
  await click('.scene-continue');
  assert.equal(state().game.phase, 'I');
  await click('[aria-label="查看残缺塑像"]');
  assertLocalImage(query('.act1-scene__detail img').src);
  await click('[aria-label="查看补"]');
  await click('.scene-camera');
  await click('.scene-continue');
  assert.equal(document().querySelector('.act1-scene'), null);
  assert.equal(state().game.phase, 'I');
}
async function solvePhoto() {
  await openApp('资源管理器');
  assert.equal(document().querySelectorAll('.photo-file').length, 2);
  await textButton('山洞留言墙', '.photo-file');
  assertLocalImage(query('.photo-evidence-image').src);
  assert.equal(state().game.phase, 'J');
  assert.equal(document().querySelector('.double-s'), null);
  await setInput('[aria-label="曝光"]', '55');
  await setInput('[aria-label="阴影"]', '50');
  await setInput('[aria-label="对比度"]', '35');
  await click('[aria-label="放大照片"]');
  assert.equal(state().modules.photos.zoomByPhotoId.IMG_A1_H_003, 1.1);
  assert.notEqual(state().game.flags.FLAG_A1_SS_FOUND, true);
  await mount(save());
  assert.equal(query('[aria-label="曝光"]').value, '55');
  assert.ok(query('.double-s'));
  await click('.double-s');
  assert.equal(state().game.phase, 'K');
  assert.match(query('.photo-controls').textContent, /相反方向/);
  await textButton('查看记录', '.photo-discovery button');
  assert.match(query('.notepad-auto').textContent, /2020.04.19/);
  assert.match(query('.notepad-auto').textContent, /双S/);
  await click('[aria-label="关闭 记事本"]');
  await textButton('整理思绪', '.photo-discovery button');
  assert.match(query('.act1-ending').textContent, /第一幕完/);
  assert.equal(state().game.flags.FLAG_A1_COMPLETE, true);
}
// 第二幕 T01–T03：从“第一幕完”连续推进到读完《补母志》目标页。
async function advanceAct2() {
  await click('.act1-ending__continue');
  assert.equal(state().game.act, 2);
  assert.equal(state().game.phase, 'A2_T01');
  assert.equal(state().modules.act2Research.stage, 'search');
  // 第二幕启动后第一幕状态仍在。
  assert.equal(state().game.flags.FLAG_A1_COMPLETE, true);
  assert.equal(state().game.flags.FLAG_A1_BU_FOUND, true);
  assert.deepEqual(state().modules.scene.capturedPhotoIds, ['IMG_A1_H_003', 'IMG_A1_I_004']);
  // jsdom 不评估媒体查询，桌面任务卡默认折叠；展开后再断言文案。
  if (!document().querySelector('.desktop-task-card__body')) await click('.desktop-task-card__toggle');
  assert.match(query('.desktop-task-card').textContent, /查一次相关信息/);

  // T01：两类冻结查询，复用现有浏览器。
  await openOrFocusApp('浏览器');
  await browse('鸡公岭 补');
  assert.equal(state().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED, true);
  assert.equal(state().modules.act2Research.stage, 'search');
  await browse('双S 十字');
  assert.equal(state().game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED, true);
  assert.equal(state().game.flags.FLAG_A2_WEB_SEARCH_FAILED, true);
  assert.equal(state().game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED, true);
  assert.equal(state().modules.act2Research.stage, 'search');
  await click('.browser-next-investigation button');
  assert.equal(state().modules.act2Research.stage, 'bridge');
  assert.equal(state().game.phase, 'A2_T02');
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T01_001'));

  // 桥头场景默认全屏打开，桌面被 aria-hidden + inert 隔离。
  assert.ok(query('.act2-experience[data-act2-stage="bridge"]'));
  assert.ok(query('.act2-experience[data-asset-id="IMG_A2_T02_001"]'));
  assert.equal(query('main.desktop').getAttribute('aria-hidden'), 'true');
  assert.equal(query('main.desktop').hasAttribute('inert'), true);

  // 返回桌面与继续入口，进度不丢。
  await click('.investigation-shell__exit');
  assert.equal(document().querySelector('.act2-bridge'), null);
  assert.equal(query('main.desktop').getAttribute('aria-hidden'), 'false');
  assert.equal(query('main.desktop').hasAttribute('inert'), false);
  await textButton('继续桥头调查', '.act2-experience__continue');
  assert.ok(query('.act2-bridge'));
  assert.equal(query('main.desktop').hasAttribute('inert'), true);

  // 证据门槛：出示证据前没有方言口述。
  await textButton('坐在石凳尽头', '.act2-bridge__elder');
  assert.equal(state().modules.act2Research.bridge.talkedElderIds.includes('ELDER_A2_T02_004'), true);
  assert.equal(document().querySelector('.act2-bridge__phrase'), null);
  await click('[aria-label="出示破庙外景照片"]');
  assert.equal(state().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN, true);
  assert.equal(state().game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD, true);
  assert.match(query('.act2-bridge__phrase').textContent, /黑捕木/);

  // 三段字谜 → 县志提示，但必须显式前往图书馆。
  await click('input[name="act2-bridge-first"][value="黑"]');
  await click('input[name="act2-bridge-middle"][value="补"]');
  await click('input[name="act2-bridge-last"][value="母"]');
  await click('.act2-bridge__confirm');
  assert.equal(state().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED, true);
  assert.equal(state().game.flags.FLAG_A2_COUNTY_RECORD_HINT_KNOWN, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T02_002'));
  assert.equal(state().modules.act2Research.stage, 'bridge');

  await click('[data-action-id="A2_T02_TO_LIBRARY"]');
  assert.equal(state().modules.act2Research.stage, 'library');
  // bridge → library 后图书馆自动打开。
  assert.ok(query('.act2-library'));
  assert.equal(query('main.desktop').hasAttribute('inert'), true);

  // 错误目录无推进。
  await click('details.act2-library__catalog > summary');
  await click('[data-section-id="SECTION_A2_T03_001"]');
  assert.equal(state().game.flags.FLAG_A2_LOCAL_GAZETTE_FOUND, undefined);
  assert.equal(document().querySelector('[data-volume-id="VOLUME_A2_T03_002"]'), null);

  // 正确目录 → 目标卷册。
  await click('[data-section-id="SECTION_A2_T03_009"]');
  assert.equal(state().game.flags.FLAG_A2_LOCAL_GAZETTE_FOUND, true);
  await click('[data-shelf-entry-id="VOLUME_A2_T03_002"]');

  // 只能逐页到达目标页：页序不是可激活控件。
  assert.equal(document().querySelectorAll('.act2-library__leaves button, .act2-library__leaves a, [data-page-id][role="button"]').length, 0);
  await click('.act2-library__next');
  assert.equal(state().modules.act2Research.library.currentPageId, 'PAGE_A2_T03_004');
  assert.notEqual(state().game.flags.FLAG_A2_BUMUZHI_FOUND, true);
  await click('.act2-library__next');
  assert.equal(state().modules.act2Research.library.currentPageId, 'PAGE_A2_T03_005');
  assert.equal(state().game.flags.FLAG_A2_BUMUZHI_FOUND, true);

  assert.equal(state().game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T03_001'));
  assert.match(query('.act2-library__conclusion').textContent, /缺什么，就用某种东西补什么。/);

  // 页面阅读已完成，后续志异仍需玩家明确发起行动。
  assert.equal(state().modules.act2Research.stage, 'library');
  assert.equal(query('[data-action-id="A2_T03_TO_TALES"]').getAttribute('data-action-state'), 'ready');
  // 桌面仍留在 DOM 中（被 aria-hidden），因此只检查第二幕场景与存档。
  const sceneText = query('.act2-library').textContent;
  for (const term of ['记忆', '身份', '性格', '转移', '案例一']) assert.equal(sceneText.includes(term), false, `T03 must not show T04 term: ${term}`);
  assert.equal(sceneText.includes('T04'), false);
  for (const term of ['记忆', '身份', '性格', '转移']) assert.equal(save().includes(term), false, `T03 must not persist T04 term: ${term}`);

  // T04：打开两篇原文、选取跨篇片段，并确认有边界的暂定判断。
  await click('[data-action-id="A2_T03_TO_TALES"]');
  assert.equal(state().modules.act2Research.stage, 'tales');
  await click('details.act2-tales__index > summary');
  for (const title of ['石工补指', '书生遗事']) {
    await textButton(title, '.act2-tales__record');
    await click('.act2-tales__evidence > summary');
    await click('.act2-tales__evidence button');
  }
  await click('details.act2-tales__comparison > summary');
  const comparisonRows = [...query('.act2-tales__comparison tbody').querySelectorAll('tr')];
  assert.equal(comparisonRows.length, 2, 'the two read records appear as two cross-source character comparisons');
  assert.deepEqual(comparisonRows.map((row) => row.querySelector('th[scope="row"]')?.textContent.trim()), ['周三，石匠', '六儿']);
  assert.equal(state().modules.act2Research.tales.supportingEvidenceIds.length, 2);
  assert.match(query('.act2-tales__evidence-list summary').textContent, /2\/2 篇来源/);
  await click('details.act2-tales__hypotheses > summary');
  await click('[data-inference-id="accompanied-change"]');
  await click('[data-action-id="A2_T04_CONFIRM_PATTERN"]');
  assert.equal(state().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T04_004'));

  // T05 only starts after the player chooses the new WeChat transition.
  await click('.investigation-shell__exit');
  await openOrFocusApp('微信');
  await textButton('小月', '.wechat-conversation');
  assert.ok(query('.wechat-chat__messages').textContent.includes('去年聚会拍的'));
  await click('.wechat-message__body[data-asset-id="IMG_A2_T05_008"] .evidence-thumbnail');
  assertLocalImage(query('.evidence-lightbox[open] img').src);
  await click('.evidence-lightbox[open] [aria-label="关闭图片"]');
  await click('.wechat-message__body[data-asset-id="IMG_A2_T05_011"] .evidence-thumbnail');
  assertLocalImage(query('.evidence-lightbox[open] img').src);
  await click('.evidence-lightbox[open] [aria-label="关闭图片"]');
  assert.equal(state().modules.act2Research.stage, 'tales');
  await click('.wechat-school-transition button');
  assert.equal(state().modules.act2Research.stage, 'school');
  assert.equal(state().game.phase, 'A2_T05');
  assert.equal(state().game.flags.FLAG_A2_SCHOOL_ENTERED, true);
  assert.ok(query('.t05-school'));
  assertLocalImage(query('.t05-school__backdrop img').src);

  await textButton('走廊', '.t05-school__map button');
  assert.equal(state().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN, true);
  assert.equal(state().modules.notepad.autoEntryIds.some((id) => id.includes('HYDRANT')), false);
  await textButton('老师办公室', '.t05-school__map button');
  await textButton('听听老师回忆', '.t05-school__image-hotspot');
  assert.match(query('.t05-school__dialog').textContent, /高二那年休学了两个月/);
  await textButton('记下老师的回忆', '.t05-school__dialog button');
  await textButton('关闭 ×', '.t05-school__dialog button');
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_001'));

  await textButton('走廊', '.t05-school__map button');
  await textButton('光荣榜', '.t05-school__map button');
  await textButton('查看历次名次', '.t05-school__image-hotspot');
  assert.deepEqual([...query('.t05-school__ranks').querySelectorAll('strong')].map((item) => Number(item.textContent)), [600, 400, 300, 130, 88, 53, 20]);
  await textButton('记下这组名次', '.t05-school__dialog button');
  await textButton('关闭 ×', '.t05-school__dialog button');

  await textButton('走廊', '.t05-school__map button');
  await textButton('小A旧教室', '.t05-school__map button');
  await textButton('翻看学霸笔记', '.t05-school__image-hotspot');
  assert.ok(query('.t05-school__notebook-page'));
  await textButton('打开双 S 比对', '.t05-school__dialog button');
  assert.ok(query('.t05-comparison__side'));
  await textButton('半透明重合');
  assert.ok(query('[aria-label="重合图案透明度"]'));
  await textButton('确认图案一致');
  await textButton('关闭 ×', '.t05-school__dialog button');
  assert.equal(state().modules.act2Research.school.symbolMatchConfirmed, true);
  assert.notEqual(state().game.flags.FLAG_A2_SS_MATCH_CONFIRMED, true);

  const schoolMaterials = query('details.t05-school__timeline-disclosure');
  assert.equal(schoolMaterials.open, false, 'school materials are initially collapsed');
  await click('details.t05-school__timeline-disclosure > summary');
  assert.equal(schoolMaterials.open, true, 'player explicitly expands school materials before selecting support');
  await textButton('班主任的回忆', '.t05-school__evidence-options button');
  await textButton('历次成绩记录', '.t05-school__evidence-options button');
  await textButton('休学后他的表现和成绩都有明显变化', '.t05-school__inferences button');
  assert.equal(query('[data-action-id="A2_T05_CONFIRM_TIMELINE"]').getAttribute('data-action-state'), 'ready');
  await click('[data-action-id="A2_T05_CONFIRM_TIMELINE"]');
  assert.equal(state().game.flags.FLAG_A2_SS_MATCH_CONFIRMED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_004'));
  await click('.investigation-shell__exit');
  assert.equal(document().querySelector('.t05-school'), null);
}

async function investigateT07() {
  // 当前T06“与小月继续核对资料”已由玩家点击后进入T07；兼容仍显示中性入口的旧壳。
  if (!document().querySelector('.t07-finale')) await click('.act2-t07-entry');
  assert.equal(state().modules.act2Research.stage, 'finale');
  assert.equal(state().game.phase, 'A2_T07');
  assert.ok(query('.t07-finale'));
  assert.equal(query('main.desktop').hasAttribute('inert'), true);

  // 半途重载不丢进度，也不跳过任何步骤。
  await mount(save());
  assert.equal(state().modules.act2Research.stage, 'finale');
  assert.ok(query('.t07-finale'));
  assert.equal(state().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND, undefined);

  // 合影右下角的双 S：放大后才由玩家主动确认。
  await waitForEnabled('.t07-finale__photo-zoom');
  await click('.t07-finale__photo-zoom');
  assert.ok(query('.t07-finale__photo-symbol'));
  assert.equal(state().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND, undefined);
  await waitForEnabled('.t07-finale__photo-confirm');
  await click('.t07-finale__photo-confirm');
  assert.equal(state().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T07_001'));

  // 视频：打开后可见，窗口外不可截，窗口内可截，只拖不播不算看过。
  await click('.t07-finale__video-open');
  assert.equal(state().game.flags.FLAG_A2_PROMO_VIDEO_FOUND, true);
  assert.equal(query('.t07-finale__capture').disabled, true);
  await setInput('.t07-finale__seek', '7000');
  await waitForEnabled('.t07-finale__capture');
  assert.equal(query('.t07-finale__capture').disabled, false);
  await click('.t07-finale__capture');
  assert.deepEqual(state().modules.act2Research.t07.capturedFrameIds, ['FRAME_A2_T07_001']);
  await click('.t07-finale__screenshot-zoom');
  assert.ok(query('.t07-finale__shot-dialog'));
  const enlargedFrame = query('.t07-finale__shot-large img');
  assert.ok(enlargedFrame.getAttribute('src'));
  assert.notEqual(dom.window.getComputedStyle(enlargedFrame).objectFit, 'cover', 'the enlarged 4:3 source must not be cropped');
  assert.equal(dom.window.getComputedStyle(query('.t07-finale__shot-large')).boxSizing, 'border-box');
  const enlargedAspectRatio = dom.window.getComputedStyle(query('.t07-finale__shot-large')).aspectRatio.split('/').map(Number);
  assert.ok(Math.abs(enlargedAspectRatio[0] / enlargedAspectRatio[1] - 4 / 3) < 0.005, 'the enlarged source keeps its natural 4:3 ratio');
  await click('.t07-finale__shot-dialog [aria-label="关闭截图"]');
  await setInput('.t07-finale__seek', '4000');
  assert.equal(state().game.flags.FLAG_A2_PROMO_VIDEO_WATCHED, undefined);
  await click('.t07-finale__play');
  await new Promise((resolve) => setTimeout(resolve, 5200));
  await settle();
  await click('.t07-finale__play');
  assert.equal(document().querySelector('.t07-finale__play').textContent, '播放');
  assert.equal(state().game.flags.FLAG_A2_PROMO_VIDEO_WATCHED, true);

  // 外景对照只能用第一幕破庙外景，不能用“补”字石碑近照。
  await textButton('外景对照', '.t07-finale__tab');
  const compareImages = [...query('.t07-finale__compare-grid').querySelectorAll('.photo-viewport__plane > img')];
  assert.equal(compareImages.length, 2, 'comparison shows exactly the captured frame and the original temple exterior');
  const sourceFile = (img) => decodeURIComponent(new URL(img.src).pathname).split('/').at(-1);
  const capturedFrameImageId = act2T07Data.video.keyFrames.find((frame) => frame.id === 'FRAME_A2_T07_001')?.imageId;
  const expectedFrameFile = imageAssets.find((asset) => asset.id === capturedFrameImageId)?.file;
  const expectedExteriorFile = imageAssets.find((asset) => asset.id === 'IMG_A1_I_001')?.file;
  assert.equal(sourceFile(compareImages[0]), expectedFrameFile);
  assert.equal(sourceFile(compareImages[1]), expectedExteriorFile, 'comparison uses the original temple exterior, not the nearby stele image');
  const comparePanes = [...query('.t07-finale__compare-grid').querySelectorAll('.photo-viewport')];
  assert.equal(comparePanes.length, 2);
  for (const pane of comparePanes) {
    const zoomIn = pane.querySelector('.photo-viewport__controls button[aria-label="放大"]');
    assert.ok(zoomIn, 'each comparison pane exposes its shared photo zoom control');
    zoomIn.click(); await settle();
    assert.match(pane.querySelector('.photo-viewport__world').style.transform, /scale\(1\.25\)/);
    pane.querySelector('.photo-viewport__controls button:last-of-type').click(); await settle();
  }
  await click('input[name="t07-comparison-feature"][value="square-opening"]');
  await waitForEnabled('.t07-finale__compare');
  await click('.t07-finale__compare');
  assert.equal(state().game.flags.FLAG_A2_TEMPLE_FRAME_FOUND, true, 'one valid source comparison records the semantic conclusion atomically');
  assert.ok(query('.t07-finale__comparison-record'));
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T07_002'));

  // 地点结论只到“曾经在鸡公岭破庙附近活动”。
  await click('[data-action-id="A2_T07_INFER_LOCATION"]');
  assert.equal(state().game.flags.FLAG_A2_QIMING_LOCATION_INFERRED, true);
  assert.match(query('.t07-finale__outcomes').textContent, /启明曾经就在鸡公岭破庙附近/);

  // 小月与主角一起约定第二次进山，然后播放一次幕末收束。
  await click('[data-action-id="A2_T07_PLAN_TRIP"]');
  assert.equal(state().game.flags.FLAG_A2_SECOND_TRIP_PLANNED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T07_004'));
  assert.ok(query('.t07-finale__ending'));
  await new Promise((resolve) => setTimeout(resolve, 5200));
  await settle();
  assert.match(query('.t07-finale__ending').textContent, /第一次进山的时候/);
  assert.match(query('.t07-finale__ending').textContent, /启明。/);
  assert.equal(query('.t07-finale').textContent.includes('第三幕'), false);
  await click('.t07-finale__ending-continue');
  assert.equal(state().game.flags.FLAG_A2_COMPLETE, true);
  assert.equal(document().querySelector('.t07-finale__ending'), null);
  assert.ok(query('.t07-finale__ending-replay'));

  // 完成后重载：可回看资料，但不自动进入第三幕。
  await mount(save());
  assert.equal(state().modules.act2Research.stage, 'finale');
  assert.equal(state().game.flags.FLAG_A2_COMPLETE, true);
  assert.ok(query('.t07-finale'));
  assert.equal(document().querySelector('.t07-finale__ending'), null);
}

async function investigateAct3() {
  await click('.investigation-shell__exit');
  await click('.story-transition-launch[aria-label="第三幕调查已就绪"] button');
  assert.equal(state().game.phase, 'A3_T00');
  const stages = [['T00', t00Doc], ['T01', t01Doc], ['T02', t02Doc], ['T03', t03Doc], ['T04', t04Doc], ['T05', t05Doc], ['T06', t06Doc], ['T07', t07Doc]];
  const lensForClue = (doc, clueId) => doc.lenses.find((lens) => lens.hotspots.some((hotspot) => hotspot.clueId === clueId));
  const routePath = (doc, startId, targetId, inspected) => {
    if (startId === targetId) return [];
    const queue = [{ lensId: startId, path: [] }];
    const visited = new Set([startId]);
    while (queue.length) {
      const { lensId, path } = queue.shift();
      const lens = doc.lenses.find((item) => item.id === lensId);
      for (const route of lens?.routes ?? []) {
        if (visited.has(route.target)) continue;
        const target = doc.lenses.find((item) => item.id === route.target);
        if (!target || (target.requiresClueIds ?? []).some((id) => !inspected.includes(id))) continue;
        const nextPath = [...path, route.target];
        if (route.target === targetId) return nextPath;
        visited.add(route.target);
        queue.push({ lensId: route.target, path: nextPath });
      }
    }
    return null;
  };
  const inspectClue = async (stage, doc, clueId, visiting = new Set()) => {
    if (state().modules.act3.inspectedClueIds.includes(clueId)) return;
    const targetLens = lensForClue(doc, clueId);
    assert.ok(targetLens, `No Act3 lens contains ${clueId}`);
    assert.ok(!visiting.has(clueId), `Cyclic Act3 clue prerequisite at ${clueId}`);
    visiting.add(clueId);
    for (const prerequisite of targetLens.requiresClueIds ?? []) {
      if (!state().modules.act3.inspectedClueIds.includes(prerequisite)) await inspectClue(stage, doc, prerequisite, visiting);
    }
    let currentLensId = state().modules.act3.currentLensId;
    if (!currentLensId) {
      currentLensId = doc.lenses[0].id;
      await click(`[data-action-id="A3_ROUTE_${stage}_001_002"]`).catch(() => {});
      currentLensId = state().modules.act3.currentLensId ?? currentLensId;
    }
    const path = routePath(doc, currentLensId, targetLens.id, state().modules.act3.inspectedClueIds);
    assert.notEqual(path, null, `No open Act3 route to ${clueId} in ${stage} from ${currentLensId}`);
    for (const nextLensId of path) {
      const currentLens = doc.lenses.find((lens) => lens.id === state().modules.act3.currentLensId);
      const route = currentLens?.routes.find((item) => item.target === nextLensId);
      assert.ok(route, `Missing route ${currentLens?.id} -> ${nextLensId}`);
      await click(`[data-action-id="${route.actionId}"]`);
    }
    await click(`[data-clue-id="${clueId}"]`);
    assert.ok(query('.investigation-detail[role="dialog"]'));
    await click('.investigation-detail button');
    visiting.delete(clueId);
  };

  for (const [stage, doc] of stages) {
    assert.equal(state().modules.act3.stage, stage);
    for (const clueId of act3RequiredClues[stage]) await inspectClue(stage, doc, clueId);
    assert.ok(act3RequiredClues[stage].every((clueId) => state().modules.act3.inspectedClueIds.includes(clueId)), `Core evidence missing in ${stage}`);
    if (stage === 'T07') {
      await click('[data-action-id="A3_T07_LEAVE_SITE"]');
      assert.equal(state().game.flags.FLAG_A3_SITE_EXITED, true);
      assert.equal(state().game.flags.FLAG_A3_COMPLETE, true);
    } else {
      const nextStage = stages[stages.findIndex(([id]) => id === stage) + 1]?.[0];
      await click(`[data-action-id="A3_${stage}_LEAVE_AND_CONTINUE"]`);
      assert.equal(state().modules.act3.stage, nextStage, `${stage} should confirm and advance in one deliberate exit action`);
    }
  }
  assert.equal(state().game.phase, 'A3_T07');
  assert.equal(state().game.flags.FLAG_A3_VVAKE_PAPER_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A3_T04_001'));
  assert.equal(state().game.flags.FLAG_A3_13ACK_PAPER_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A3_T05_001'));
  assert.equal(state().game.flags.FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A3_T06_001'));
  assert.equal(state().game.flags.FLAG_A3_NOTEBOOK_FOUND, true);
  assert.equal(state().game.flags.FLAG_A3_SITE_EXITED, true);
  assert.equal(state().game.flags.FLAG_A3_COMPLETE, true);
  assert.equal(state().modules.act4.stage, 'inactive', '第四幕必须由玩家主动点击入口');
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A3_T07_001'));
  assert.ok([...document().querySelectorAll('.story-transition-launch button')].some((button) => button.textContent.includes('继续调查小 A 的笔记')));
  await textButton('回看第三幕', '.story-transition-launch button');
  assert.ok(document().querySelector('[data-act3-stage="T07"]'));
  await click('.investigation-shell__exit');
  assert.equal(state().modules.act4.stage, 'inactive');
  await mount(save());
  assert.equal(state().modules.act3.stage, 'T07');
  assert.equal(state().game.phase, 'A3_T07');
  assert.equal(state().modules.act4.stage, 'inactive');
  assert.ok([...document().querySelectorAll('.story-transition-launch button')].some((button) => button.textContent.includes('继续调查小 A 的笔记')));
}

async function investigateAct4() {
  await click('.story-transition-launch[aria-label="第四幕调查已就绪"] button:first-child');
  assert.equal(state().modules.act4.stage, 'T01');
  const continueSection = async (stage) => {
    await click(`[data-action-id="A4_${stage}_CONTINUE_READING"]`);
    const next = { T01: 'T02', T02: 'T03', T03: 'T04', T04: 'T05', T05: 'T06', T06: 'T07', T07: 'T08', T08: 'T09', T09: 'T10', T10: 'T10' }[stage];
    assert.equal(state().modules.act4.stage, next, `${stage} should advance exactly one reading section`);
    await new Promise((resolve) => setTimeout(resolve, 510));
  };
  await continueSection('T01');
  assert.equal(state().modules.act4.stage, 'T02');
  assert.equal(document().querySelectorAll('.a4-reader__mail button').length, 0, 'old-mail actions remain behind the final T02 page');
  await lastPage('T02_ORIGINAL');
  const oldMailButtons = [...document().querySelectorAll('.a4-reader__mail button')];
  assert.equal(oldMailButtons.length, 2);
  for (const button of oldMailButtons) { button.click(); await settle(); }
  assert.equal(state().modules.act4.checkedMailRecipients.length, 2);
  await mount(save());
  assert.equal(state().modules.act4.stage, 'T02', 'T02 reload keeps the date checks');
  await lastPage('T02_ORIGINAL');
  await setInput('#a4-shared-date', '20200419');
  await textButton('主动登录', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T02_LOGIN_SUCCEEDED'));
  assert.deepEqual(state().modules.act4.unlockedAccountIds, ['weibo', 'mail']);
  await continueSection('T02');
  await continueSection('T03');
  await textButton('打开这封邮件', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T04_WAKE_MAIL_OPENED'));
  await continueSection('T04');
  await continueSection('T05');
  await continueSection('T06');
  await continueSection('T07');
  await lastPage('T08_RETURN');
  await textButton('查看 2008 年档案', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T08_ARCHIVE_OPENED'));
  await mount(save());
  assert.equal(state().modules.act4.stage, 'T08', 'T08 reload keeps the opened archive');
  assert.ok(query('[data-block-id="T08_ARCHIVE"]'));
  await continueSection('T08');
  await lastPage('T09_REPLY_AND_LAST_PAGE');
  await textButton('把笔记藏到消防箱后', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T09_NOTE_HIDDEN'));
  await mount(save());
  assert.equal(state().modules.act4.stage, 'T09', 'T09 reload keeps the hidden note');
  assert.ok(query('[data-block-id="T09_NOTE_HIDDEN"]'));
  await textButton('走向门外，听完广播', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T09_DOOR_EXITED'));
  await continueSection('T09');
  await lastPage('T10_AFTERMATH');
  await textButton('打开启明的最后一封邮件', '.a4-reader__interaction button');
  assert.ok(state().modules.act4.completedNarrativeActionIds.includes('A4_T10_FINAL_MAIL_OPENED'));
  await mount(save());
  assert.equal(state().modules.act4.stage, 'T10', 'T10 reload keeps the opened final mail');
  assert.ok(query('[data-block-id="T10_FINAL_MAIL"]'));
  await continueSection('T10');
  assert.equal(state().game.flags.FLAG_A4_COMPLETE, true);
  assert.equal(document().querySelector('.a4-reader__ending'), null, 'the recap stays behind its explicit disclosure');
  await mount(save());
  assert.equal(state().game.flags.FLAG_A4_COMPLETE, true);
  const recap = query('.a4-reader__final-recap');
  assert.equal(recap.open, false);
  assert.equal(recap.querySelector('.a4-reader__ending'), null);
  await click('.a4-reader__final-recap > summary');
  assert.match(query('.a4-reader__ending').textContent, /第四幕阅读完成/);
}

async function reset() {
  const before = save();
  await click('.debug-reset__trigger');
  await textButton('取消', '.debug-reset__confirm button');
  assert.equal(save(), before);
  await click('.debug-reset__trigger');
  await textButton('确认清零', '.debug-reset__confirm button');
  assert.equal(state().game.phase, 'A');
  assert.deepEqual(state().game.flags, {});
  assert.deepEqual(state().game.discoveredClueIds, []);
  assert.equal(document().querySelectorAll('.app-window').length, 0);
  assert.equal(document().querySelector('.act1-ending'), null);
  assert.deepEqual(state().modules.scene.capturedPhotoIds, []);
  assert.deepEqual(state().modules.browser, { queryHistory: [], visitedPageIds: [] });
  assert.deepEqual(state().modules.notepad, { userText: '', autoEntryIds: [] });
  assert.deepEqual(state().modules.photos, { activePhotoId: null, openedPhotoIds: [], adjustments: {}, zoomByPhotoId: {}, inspectedSymbolPhotoIds: [] });
  // 清零后第二幕状态完全回到默认值。
  assert.deepEqual(state().modules.act2Research, {
    stage: 'inactive',
    bridge: { talkedElderIds: [], shownEvidenceAssetIds: [], heardPhrase: false, nameChoices: { first: null, middle: null, last: null } },
    library: { visitedSectionIds: [], openedVolumeIds: [], currentPageId: null, bookmarkedPageIds: [], markedKeywordIds: [], excerptedEntryIds: [] },
    tales: { readTaleIds: [], collectedTaleIds: [], placedCardIds: [], sorted: false, inferenceAcknowledged: false, supportingEvidenceIds: [], selectedInferenceId: null },
    school: { visitedAreaIds: [], inspectedHotspotIds: [], selectedEvidenceIds: [], selectedInferenceId: null, symbolMatchConfirmed: false, legacyCompletionMigrated: false },
    t06: { reviewedCases: [], nicknameAssessment: null, legacyCompletionMigrated: false },
    t07: { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], capturedAtMsByFrameId: {}, comparedFrameIds: [], comparisonFeatureIdByFrameId: {} },
  });
  assert.deepEqual(state().modules.act3, { stage: 'inactive', currentLensId: null, visitedLensIds: [], inspectedClueIds: [], confirmedFlagIds: [] });
  await mount(save());
  assert.equal(document().querySelectorAll('.app-window').length, 0);
  assert.equal(document().querySelector('.act2-experience'), null);
}

if (process.env.ANCHAO_OFFLINE_PHASE === 'finale') {
  try {
    await mount(await readFile(process.env.ANCHAO_OFFLINE_SAVE_PATH, 'utf8'));
    await investigateT07();
    await investigateAct3();
    await investigateAct4();
    await reset();
    assert.deepEqual(errors, []);
      console.log('PASS: offline T07 finale, act3 T00–T07 and act4 T01–T10');
  } finally { dom?.window.close(); }
} else try {
  await mount();
  assert.equal(document().querySelectorAll('script[src], link[href]').length, 2);
  for (const image of document().querySelectorAll('svg image')) assertLocalImage(image.getAttribute('href'));
  assert.equal(document().querySelector('script[type="module"]'), null);
  for (let run = 1; run <= offlineRuns; run++) {
    await investigate(); await solvePhoto();
    await mount(save());
    assert.ok(query('.act1-ending'));
    if (run === 1) {
      await advanceAct2();
      // T05 场景返回桌面后，继续入口恢复场景且保留学校阶段。
      await textButton('继续高中调查', '.act2-experience__continue');
      assert.ok(query('.t05-school'));
      assert.equal(state().modules.act2Research.stage, 'school');
      await click('.investigation-shell__exit');
      assert.equal(state().modules.act2Research.tales.inferenceAcknowledged, true);
      // 学校阶段存档重载后从校门总览恢复。
      await mount(save());
      assert.equal(state().modules.act2Research.stage, 'school');
      assert.ok(query('.t05-school'), 'reload must resume the school stage');
      assert.match(query('.t05-school__backdrop').textContent, /校门/);
      assert.equal(query('main.desktop').getAttribute('aria-hidden'), 'true');
      await click('.investigation-shell__exit');
      // T06 opens only after an active Qiming search; suggestions/results stay hidden before then.
      await openOrFocusApp('浏览器');
      await setInput('#browser-search', '启明');
      assert.equal(document().querySelector('.browser-suggestions')?.textContent.includes('启明 投诉'), false);
      assert.equal(state().modules.act2Research.stage, 'school');
      await browse('启明 投诉');
      assert.equal(state().modules.act2Research.stage, 'qiming');
      assert.equal(state().game.phase, 'A2_T06');
      await textButton('返回个案材料复核', '.browser-qiming-toolbar button');
      await textButton('打开启明宣传案例', '.browser-case-review button');
      assert.equal(state().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ, true);
      await textButton('返回个案材料复核', '.browser-qiming-toolbar button');
      await textButton('打开黄子山后续报道', '.browser-case-review button');
      await textButton('返回个案材料复核', '.browser-qiming-toolbar button');
      const huangCase = '.browser-case-review__case[aria-label="黄子山材料"]';
      query(`${huangCase} label:nth-of-type(2)`).click(); await settle();
      await click(`${huangCase} .browser-case-review__submit`);
      assert.deepEqual(state().modules.act2Research.t06.reviewedCases, []);
      query(`${huangCase} label:nth-of-type(1)`).click(); await settle();
      await click(`${huangCase} .browser-case-review__submit`);
      assert.deepEqual(state().modules.act2Research.t06.reviewedCases.map((review) => review.caseId), ['huang']);
      await textButton('打开钟子月后续报道', '.browser-case-review button');
      await textButton('返回个案材料复核', '.browser-qiming-toolbar button');
      const zhongCase = '.browser-case-review__case[aria-label="钟子月材料"]';
      query(`${zhongCase} label:nth-of-type(1)`).click(); await settle();
      await click(`${zhongCase} .browser-case-review__submit`);
      assert.deepEqual(state().modules.act2Research.t06.reviewedCases.map((review) => review.caseId), ['huang', 'zhong']);
      assert.equal(state().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL, true);
      assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T06_004'));
      assert.equal(state().game.flags.FLAG_A2_HUANG_MATCH_INFERRED, undefined);
      assert.equal(state().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED, undefined);
      assert.equal(state().modules.act2Research.t06.nicknameAssessment, null);
      assert.equal(state().modules.browser.visitedPageIds.includes('PAGE_A2_T06_006'), false, 'forum nickname evidence remains optional to the main path');
      await textButton('与小月继续核对资料', '.browser-case-review__next button');
      assert.equal(state().modules.act2Research.stage, 'finale');
      await mount(save());
      assert.equal(state().modules.act2Research.stage, 'finale');
      assert.equal(state().game.phase, 'A2_T07');
      assert.ok(state().modules.browser.visitedPageIds.includes('PAGE_A2_T06_009'));
      for (const id of ['TRANSITION_A1_INTRO', 'TRANSITION_A1_B', 'TRANSITION_A1_C', 'TRANSITION_A1_H', 'TRANSITION_A1_I', 'TRANSITION_A1_RETURN', 'TRANSITION_A1_J', 'TRANSITION_A2_T01', 'TRANSITION_A2_T02', 'TRANSITION_A2_T03', 'TRANSITION_A2_T04', 'TRANSITION_A2_T05', 'TRANSITION_A2_T06']) {
        assert.ok(seenTransitionIds.has(id), `Missing story transition in offline flow: ${id}`);
      }
      const savePath = join(tmpdir(), `anchao-offline-${randomUUID()}.json`);
      await writeFile(savePath, save(), 'utf8');
      try {
        const child = spawnSync(process.execPath, ['scripts/verify-offline.mjs'], {
          env: { ...process.env, ANCHAO_OFFLINE_PHASE: 'finale', ANCHAO_OFFLINE_SAVE_PATH: savePath },
          stdio: 'inherit', timeout: 120_000,
        });
        if (child.error) throw child.error;
        assert.equal(child.status, 0, 'Offline finale process failed');
      } finally { await rm(savePath, { force: true }); }
    }
    await reset();
      console.log(`PASS ${run}: rendered A–K flow, photo editing, save reload, ending, reset and clean reload${run === 1 ? ' plus act2 T01–T07 and act3 T00–T07' : ''}`);
  }
  assert.ok(requests.some((url) => url.endsWith('/assets/app.js')));
  assert.ok(requests.some((url) => url.endsWith('/assets/app.css')));
  for (const request of requests) {
    const url = new URL(request);
    assert.equal(url.origin, 'https://anchao-offline.test');
    assert.ok(filePaths.has(decodeURIComponent(url.pathname.slice(1))), `Unexpected resource: ${request}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: local offline assets, no network resources and zero runtime errors');
} finally { dom?.window.close(); }
