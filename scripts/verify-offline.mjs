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
  const act3Docs = ['t00', 't01', 't02', 't03', 't04', 't05', 't06', 't07'].map(async (name) => JSON.parse(await readFile(`data/act3_${name}.json`, 'utf8')));
  const [t00Doc, t01Doc, t02Doc, t03Doc, t04Doc, t05Doc, t06Doc, t07Doc] = await Promise.all(act3Docs);
const errors = [];
const requests = [];
const seenTransitionIds = new Set();
const offlineRuns = Math.max(1, Math.min(2, Number.parseInt(process.env.ANCHAO_OFFLINE_RUNS ?? '2', 10) || 2));
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => errors.push(error.message));
let dom;
const delay = () => new Promise((resolve) => setTimeout(resolve, 30));
async function settle() {
  await delay();
  // Continue each story card as a player would before testing the next action.
  for (let i = 0; i < 3; i++) {
    const launch = dom?.window.document.querySelector('.story-transition-launch:not([aria-label="第三幕调查已就绪"]):not([aria-label="第四幕调查已就绪"]) button');
    if (launch) { launch.click(); await delay(); }
    const card = dom?.window.document.querySelector('.story-transition');
    const button = card?.querySelector('button');
    if (!button) break;
    seenTransitionIds.add(card.getAttribute('data-story-transition'));
    button.click();
    await delay();
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
  assert.equal(button.disabled, false, `Disabled button: ${selector}`);
  button.click(); await settle();
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
// 第二幕 T01–T03：从“第一幕完”连续推进到图书馆摘录完成。
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
  assert.match(query('.desktop-task-card').textContent, /在网上再查一次/);

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
  await click('.act2-bridge__return');
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

  await click('.act2-bridge__continue');
  assert.equal(state().modules.act2Research.stage, 'library');
  // bridge → library 后图书馆自动打开。
  assert.ok(query('.act2-library'));
  assert.equal(query('main.desktop').hasAttribute('inert'), true);

  // 错误目录无推进。
  await click('[data-section-id="SECTION_A2_T03_001"]');
  assert.equal(state().game.flags.FLAG_A2_LOCAL_GAZETTE_FOUND, undefined);
  assert.equal(document().querySelector('[data-volume-id="VOLUME_A2_T03_002"]'), null);

  // 正确目录 → 目标卷册。
  await click('[data-section-id="SECTION_A2_T03_009"]');
  assert.equal(state().game.flags.FLAG_A2_LOCAL_GAZETTE_FOUND, true);
  await click('.act2-library__shelf-hotspot');
  await click('[data-volume-id="VOLUME_A2_T03_002"]');

  // 只能逐页到达目标页：页序不是可激活控件。
  assert.equal(document().querySelectorAll('.act2-library__leaves button, .act2-library__leaves a, [data-page-id][role="button"]').length, 0);
  await click('.act2-library__next');
  assert.equal(state().modules.act2Research.library.currentPageId, 'PAGE_A2_T03_004');
  assert.notEqual(state().game.flags.FLAG_A2_BUMUZHI_FOUND, true);
  await click('.act2-library__next');
  assert.equal(state().modules.act2Research.library.currentPageId, 'PAGE_A2_T03_005');
  assert.equal(state().game.flags.FLAG_A2_BUMUZHI_FOUND, true);

  // 少于 3 个核心词不能摘录。
  assert.equal(query('.act2-library__excerpt-button').disabled, true);
  await click('[data-keyword-id="KW_A2_T03_001"]');
  await click('[data-keyword-id="KW_A2_T03_002"]');
  assert.equal(query('.act2-library__excerpt-button').disabled, true);
  await click('[data-keyword-id="KW_A2_T03_003"]');
  assert.equal(query('.act2-library__excerpt-button').disabled, false);
  await click('.act2-library__excerpt-button');
  assert.equal(state().game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN, true);
  assert.deepEqual(state().modules.act2Research.library.excerptedEntryIds, ['ENTRY_A2_T03_001']);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T03_001'));
  assert.match(query('.act2-library__conclusion').textContent, /缺什么，就用某种东西补什么。/);

  // 完成态先停留，桌面仍留在 DOM 中（被 aria-hidden），因此只检查第二幕场景与存档。
  const sceneText = query('.act2-library').textContent;
  for (const term of ['记忆', '身份', '性格', '转移', '案例一']) assert.equal(sceneText.includes(term), false, `T03 must not show T04 term: ${term}`);
  assert.equal(sceneText.includes('T04'), false);
  for (const term of ['记忆', '身份', '性格', '转移']) assert.equal(save().includes(term), false, `T03 must not persist T04 term: ${term}`);

  // T04：显式进入三篇志异，阅读、收集、整理并确认问题。
  await click('.act2-library__continue-tales');
  assert.equal(state().modules.act2Research.stage, 'tales');
  for (const title of ['石工补指', '书生遗事', '哑女借声']) {
    await textButton(title, '.act2-tales__record');
    await click('.act2-tales__read');
    await click('.act2-tales__collect');
  }
  const columns = ['人物', '缺失', '进食', '获得与异变'];
  for (let index = 1; index <= 12; index += 1) {
    await click(`.act2-tales__card:nth-of-type(1)`);
    const card = query('.act2-tales__card.is-selected');
    const column = columns[Math.floor((index - 1) % 4)];
    const heading = [...document().querySelectorAll('.act2-tales__column h3')].find((item) => item.textContent === column);
    assert.ok(heading, `Missing sorting column: ${column}`);
    heading.parentElement.querySelector('.act2-tales__drop').click(); await settle();
    assert.equal(card.isConnected, false);
  }
  await click('.act2-tales__finish-sort');
  await textButton('记下这个问题', '.act2-tales__inference button');
  assert.equal(state().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T04_004'));

  // T05 only starts after the player chooses the new WeChat transition.
  await click('.act2-tales__return');
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

  await textButton('光荣榜', '.t05-school__map button');
  await textButton('查看历次名次', '.t05-school__image-hotspot');
  assert.deepEqual([...query('.t05-school__ranks').querySelectorAll('strong')].map((item) => Number(item.textContent)), [600, 400, 300, 130, 88, 53, 20]);
  await textButton('记下这组名次', '.t05-school__dialog button');
  await textButton('查看成绩表下方的感谢文字', '.t05-school__dialog button');
  assert.match(query('.t05-school__dialog').textContent, /启明青少年成长中心两个月来对我的教育和培养/);
  await textButton('记下这段文字', '.t05-school__dialog button');
  await textButton('关闭 ×', '.t05-school__dialog button');
  assert.equal(state().game.flags.FLAG_A2_QIMING_NAME_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_003'));

  await textButton('小A旧教室', '.t05-school__map button');
  await textButton('翻看学霸笔记', '.t05-school__image-hotspot');
  assert.ok(query('.t05-school__notebook-page'));
  await textButton('打开双 S 比对', '.t05-school__dialog button');
  assert.ok(query('.t05-comparison__side'));
  await textButton('半透明重合');
  assert.ok(query('[aria-label="重合图案透明度"]'));
  await textButton('确认图案一致');
  assert.equal(state().game.flags.FLAG_A2_SS_MATCH_CONFIRMED, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_004'));
  await click('.t05-school__return');
  assert.equal(document().querySelector('.t05-school'), null);
  await mount(save());
  assert.equal(state().modules.act2Research.stage, 'school');
  assert.ok(query('.t05-school'));
  assert.match(query('.t05-school__backdrop').textContent, /校门/);
  await click('.t05-school__return');
}

async function investigateT07() {
  // 入口是中性文案，且必须由玩家点击；浏览 T06 页面不会自动进入。
  assert.equal(document().querySelector('.t07-finale'), null);
  await click('.act2-t07-entry');
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
  await click('.t07-finale__photo-zoom');
  assert.ok(query('.t07-finale__photo-symbol'));
  assert.equal(state().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND, undefined);
  await click('.t07-finale__photo-confirm');
  assert.equal(state().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T07_001'));

  // 视频：打开后可见，窗口外不可截，窗口内可截，只拖不播不算看过。
  await click('.t07-finale__video-open');
  assert.equal(state().game.flags.FLAG_A2_PROMO_VIDEO_FOUND, true);
  assert.equal(query('.t07-finale__capture').disabled, true);
  await setInput('.t07-finale__seek', '7000');
  assert.equal(query('.t07-finale__capture').disabled, false);
  await click('.t07-finale__capture');
  assert.deepEqual(state().modules.act2Research.t07.capturedFrameIds, ['FRAME_A2_T07_001']);
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
  assert.ok(query('[data-asset-id="IMG_A1_I_001"]'));
  assert.equal(query('.t07-finale__compare-grid').querySelector('[data-asset-id="IMG_A1_I_004"]'), null);
  await click('.t07-finale__zoom-left');
  await click('.t07-finale__zoom-right');
  await click('.t07-finale__compare');
  assert.equal(state().game.flags.FLAG_A2_TEMPLE_FRAME_FOUND, undefined);
  await click('.t07-finale__temple-confirm');
  assert.equal(state().game.flags.FLAG_A2_TEMPLE_FRAME_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T07_002'));

  // 地点结论只到“曾经在鸡公岭破庙附近活动”。
  await textButton('地点结论', '.t07-finale__tab');
  await click('.t07-finale__infer');
  assert.equal(state().game.flags.FLAG_A2_QIMING_LOCATION_INFERRED, true);
  assert.match(query('.t07-finale__panel').textContent, /启明曾经就在鸡公岭破庙附近/);

  // 小月与主角一起约定第二次进山，然后播放一次幕末收束。
  await textButton('再次进山', '.t07-finale__tab');
  await click('.t07-finale__trip-confirm');
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
  await click('.t07-finale__return');
  await click('.story-transition-launch[aria-label="第三幕调查已就绪"] button');
  assert.equal(state().game.phase, 'A3_T00');
    for (const [stage, doc] of [['T00', t00Doc], ['T01', t01Doc], ['T02', t02Doc], ['T03', t03Doc], ['T04', t04Doc], ['T05', t05Doc], ['T06', t06Doc], ['T07', t07Doc]]) {
    assert.equal(state().modules.act3.stage, stage);
    const lenses = doc.lenses.filter((lens) => lens.id !== 'LENS_A3_T03_000');
    for (const [index, lens] of lenses.entries()) {
      assert.equal(query('.act3-investigation__lens').getAttribute('data-asset-id'), lens.assetId);
      for (const hotspot of lens.hotspots) {
        await click(`[data-clue-id="${hotspot.clueId}"]`);
        assert.ok(query('.act3-investigation__dialog'));
        await click('.act3-investigation__dialog [aria-label="关闭"]');
      }
      if (index + 1 < lenses.length) {
        await textButton(lenses[index + 1].title, '.photo-viewport__marker--direction');
      }
    }
    await click('.act3-investigation__action button');
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
    await click('.act3-investigation__return');
    assert.equal(state().modules.act4.stage, 'inactive');
  await mount(save());
    assert.equal(state().modules.act3.stage, 'T07');
    assert.equal(state().game.phase, 'A3_T07');
    assert.equal(state().modules.act4.stage, 'inactive');
    assert.ok([...document().querySelectorAll('.story-transition-launch button')].some((button) => button.textContent.includes('继续调查小 A 的笔记')));
}

async function choosePuzzle(title, choices) {
  const puzzle = [...document().querySelectorAll('.a4-puzzle')].find((item) => item.getAttribute('aria-label') === title);
  assert.ok(puzzle, `Missing puzzle: ${title}`);
  for (const choice of choices) {
    const button = [...puzzle.querySelectorAll('.a4-choices button')].find((item) => item.textContent.includes(choice));
    assert.ok(button, `Missing choice ${choice} in ${title}`);
    button.click(); await settle();
  }
  await textButton('确认线索', `.a4-puzzle[aria-label="${title}"] button`);
  assert.match(query(`.a4-puzzle[aria-label="${title}"]`).textContent, /已完成/);
}
async function photoMarker(kind) {
  await click(kind === 'route' ? '.a4-photo-stage .photo-viewport__world button:last-of-type' : `.a4-photo-stage .photo-viewport__marker--${kind}`);
}
async function investigateAct4() {
  await click('.story-transition-launch[aria-label="第四幕调查已就绪"] button:first-child');
  assert.equal(state().modules.act4.stage, 'T01');
  await photoMarker('object');
  assert.ok(query('.a4-detail[role="dialog"]'));
  for (let page = 2; page <= 9; page++) await textButton('下一页', '.a4-detail .a4-actions button');
  assert.equal(state().modules.act4.readNotebookPages.length, 9);
  await choosePuzzle('三段凌晨记录的先后', ['02:30', '03:50', '消防栓']);
  await click('.a4-detail-head button');
  await photoMarker('route');
  assert.equal(state().modules.act4.stage, 'T02');
  await textButton('核对这封信的时间', '.a4-mail-reading button');
  await textButton('小月', '.a4-mail-list button');
  await textButton('核对这封信的时间', '.a4-mail-reading button');
  assert.equal(state().modules.act4.checkedMailRecipients.length, 2);
  await setInput('.a4-puzzle input', '20200419');
  await textButton('确认线索', '.a4-puzzle button');
  assert.ok(state().modules.act4.solvedPuzzleIds.includes('A4_P04'));
  await setInput('.a4-card > label input', '20200419');
  await textButton('确认登录微博与邮箱');
  assert.deepEqual(state().modules.act4.unlockedAccountIds, ['weibo', 'mail']);
  await textButton('打开微博记录');
  assert.equal(state().modules.act4.stage, 'T03');
  await choosePuzzle('三篇代表性微博排序', ['04-03', '04-09', '04-19']);
  await textButton('04-19', '.a4-social-post');
  assert.ok(state().modules.act4.timelineReadDates.includes('04-19'));
  await textButton('继续查看邮箱');
  assert.equal(state().modules.act4.stage, 'T04');
  await textButton('VVaKe', '.a4-mail-list button');
  await choosePuzzle('同词同序的纸片', ['VVaKe · 蜘蛛']);
  await textButton('进入 2014 年的小 A 视角');
  assert.equal(state().modules.act4.stage, 'T05');
  for (const node of ['teacher', 'home', 'river', 'dinner', 'door']) {
    await photoMarker('route');
    assert.equal(state().modules.act4.birthdayNodeId, node);
  }
  await photoMarker('object');
  await choosePuzzle('确认提前安排的来人', ['父母提前联系', '已经说好两个月']);
  await click('.a4-detail-head button');
  await photoMarker('route');
  assert.equal(state().modules.act4.birthdayNodeId, 'taken');
  await photoMarker('object');
  await textButton('确认第五段结束', '.a4-detail button');
  assert.equal(state().game.flags.FLAG_A4_T05_COMPLETE, true);
  await click('.a4-detail-head button');
  await photoMarker('route');
  assert.equal(state().modules.act4.stage, 'T06');
  const scenes = {
    T06: ['WAKE', 'BREAKFAST', 'RECITE', 'BROADCAST', 'ROOMMATE', 'CONFINEMENT'],
    T07: ['DREAM', 'MATH', 'NOTEBOOK', 'MIRROR', 'KITCHEN', 'SCHOOL'],
    T08: ['MAIL', 'LAKE', 'DEPART', 'SHOP', 'ROUTE', 'WALL', 'BROADCAST', 'ARCHIVE', 'MIRROR', 'KITCHEN'],
    T09: ['HYDRANT', 'REPLY', 'NOTE', 'EXIT', 'BLACKOUT'],
    T10: ['SEARCH', 'WORDS', 'CAFE', 'MONTHS', 'MAIL'],
  };
  const solveLaterScene = async (id) => {
    if (id === 'A4_T06_BROADCAST') await choosePuzzle('排一日三段与两组广播', ['五点起床', '早读后广播', '睡前广播', '早读后 13aCK', '睡前 VVaKe']);
    if (id === 'A4_T07_MIRROR') await choosePuzzle('姓名与自认身份', ['梦中笔记：黄子山', '现实自认：王澳']);
    if (id === 'A4_T08_ARCHIVE') await choosePuzzle('档案架两步定位', ['2008 年架', '黄子山书脊']);
    if (id === 'A4_T09_NOTE') {
      for (const label of ['放进塑料袋', '用透明胶缠好', '塞到消防栓背后']) await textButton(label, '.a4-detail .a4-actions button');
      await choosePuzzle('确认笔记已包裹藏好', ['放进塑料袋', '用透明胶缠好', '塞到消防栓背后']);
    }
    if (id === 'A4_T09_EXIT') for (let i = 0; i < 6; i++) await textButton('听下一个词', '.a4-detail button');
    if (id === 'A4_T10_WORDS') await choosePuzzle('并列观察两种读法', ['可能有关，尚未证实']);
    if (id === 'A4_T10_MAIL') await textButton('打开启明最后一封邮件', '.a4-detail button');
  };
  for (const [stage, names] of Object.entries(scenes)) {
    assert.equal(state().modules.act4.stage, stage);
    for (const [index, name] of names.entries()) {
      const id = `A4_${stage}_${name}`;
      assert.equal(state().modules.act4.laterNodeId, id);
      await click('.a4-photo-stage .photo-viewport__world button:first-of-type');
      assert.ok(query('.a4-detail[role="dialog"]'));
      await solveLaterScene(id);
      await click('.a4-detail-head button');
      await photoMarker('route');
      if (index + 1 < names.length) assert.equal(state().modules.act4.laterNodeId, `A4_${stage}_${names[index + 1]}`);
    }
    assert.equal(state().game.flags[`FLAG_A4_${stage}_COMPLETE`], true);
  }
  assert.equal(state().game.flags.FLAG_A4_COMPLETE, true);
  await mount(save());
  assert.equal(state().game.flags.FLAG_A4_COMPLETE, true);
  assert.match(query('.a4-done').textContent, /第四幕完结/);
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
    tales: { readTaleIds: [], collectedTaleIds: [], placedCardIds: [], sorted: false, inferenceAcknowledged: false },
    school: { visitedAreaIds: [], inspectedHotspotIds: [] },
    t07: { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: [] },
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
      await click('.t05-school__return');
      assert.equal(state().modules.act2Research.tales.inferenceAcknowledged, true);
      // 学校阶段存档重载后从校门总览恢复。
      await mount(save());
      assert.equal(state().modules.act2Research.stage, 'school');
      assert.ok(query('.t05-school'), 'reload must resume the school stage');
      assert.match(query('.t05-school__backdrop').textContent, /校门/);
      assert.equal(query('main.desktop').getAttribute('aria-hidden'), 'true');
      await click('.t05-school__return');
      // T06 opens only after an active Qiming search; suggestions/results stay hidden before then.
      await openOrFocusApp('浏览器');
      await setInput('#browser-search', '启明');
      assert.equal(document().querySelector('.browser-suggestions')?.textContent.includes('启明 投诉'), false);
      assert.equal(state().modules.act2Research.stage, 'school');
      await browse('启明 投诉');
      assert.equal(state().modules.act2Research.stage, 'qiming');
      assert.equal(state().game.phase, 'A2_T06');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_006').headline, '.browser-results button');
      assert.equal(state().game.flags.FLAG_A2_QIMING_FORUM_FOUND, true);
      assert.equal(state().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ, undefined);
      assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T06_002'));
      await browse('启明 黄子山');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_004').headline, '.browser-results button');
      assert.equal(state().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ, true);
      assert.ok(query('.browser-page__actions').textContent.includes('复制黄子山'));
      await browse('启明 投诉');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_006').headline, '.browser-results button');
      await textButton('黄山可能对应黄子山', '.browser-page__actions button');
      assert.equal(state().game.flags.FLAG_A2_HUANG_MATCH_INFERRED, true);
      await browse('启明 投诉');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_007').headline, '.browser-results button');
      await textButton('月子可能对应钟子月', '.browser-page__actions button');
      assert.equal(state().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED, true);
      await browse('启明 黄子山');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_008').headline, '.browser-results button');
      await browse('启明 钟子月');
      await textButton(pages.find((page) => page.id === 'PAGE_A2_T06_009').headline, '.browser-results button');
      await textButton('记录其他学员也出现异常后续', '.browser-page__actions button');
      assert.equal(state().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL, true);
      assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T06_004'));
      await mount(save());
      assert.equal(state().modules.act2Research.stage, 'qiming');
      assert.equal(state().game.phase, 'A2_T06');
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
