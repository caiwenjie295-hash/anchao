import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import jsdom from 'jsdom';
const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;

// Execute the actual deliverable in a DOM test environment, without a web server.
// A synthetic origin gives jsdom storage semantics; real file:// browser QA is separate.
const html = await readFile('暗潮.html', 'utf8');
const pages = JSON.parse(await readFile('data/browser_pages.json', 'utf8')).items;
const errors = [];
const requests = [];
const offlineRuns = Math.max(1, Math.min(2, Number.parseInt(process.env.ANCHAO_OFFLINE_RUNS ?? '2', 10) || 2));
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => errors.push(error.message));
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
let dom;
async function mount(saved) {
  dom?.window.close();
  dom = new JSDOM(html, {
    url: 'https://anchao-offline.test', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole,
    resources: { interceptors: [requestInterceptor((request) => { if (request.url.startsWith('data:')) return; requests.push(request.url); return new Response('', { status: 403 }); })] },
    beforeParse(window) {
      // jsdom lacks native dialog methods; this checks open/close wiring, not modal layout or focus.
      window.HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
      window.HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
      if (saved) window.localStorage.setItem('anchao.save.v1', saved);
    },
  });
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
async function openApp(title) { await click(`.taskbar button[aria-label="打开 ${title}"]`); }
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
  assert.match(query('.avatar-sprite image').getAttribute('href'), /^data:image\/png;base64,/);
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
  assert.match(query('.act1-scene__detail img').src, /^data:image\/png;base64,/);
  await click('.scene-camera');
  await click('.scene-continue');
  assert.equal(state().game.phase, 'I');
  await click('[aria-label="查看残缺塑像"]');
  assert.match(query('.act1-scene__detail img').src, /^data:image\/png;base64,/);
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
  assert.match(query('.photo-evidence-image').src, /^data:image\/png;base64,/);
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
  assert.match(query('.evidence-lightbox[open] img').src, /^data:image\/jpeg;base64,/);
  await click('.evidence-lightbox[open] [aria-label="关闭图片"]');
  await click('.wechat-message__body[data-asset-id="IMG_A2_T05_011"] .evidence-thumbnail');
  assert.match(query('.evidence-lightbox[open] img').src, /^data:image\/jpeg;base64,/);
  await click('.evidence-lightbox[open] [aria-label="关闭图片"]');
  assert.equal(state().modules.act2Research.stage, 'tales');
  await click('.wechat-school-transition button');
  assert.equal(state().modules.act2Research.stage, 'school');
  assert.equal(state().game.phase, 'A2_T05');
  assert.equal(state().game.flags.FLAG_A2_SCHOOL_ENTERED, true);
  assert.ok(query('.t05-school'));
  assert.match(query('.t05-school__backdrop img').src, /^data:image\/jpeg;base64,/);

  await textButton('走廊', '.t05-school__map button');
  assert.equal(state().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN, true);
  assert.equal(state().modules.notepad.autoEntryIds.some((id) => id.includes('HYDRANT')), false);
  await textButton('老师办公室', '.t05-school__map button');
  await textButton('听听老师回忆', '.t05-school__hotspots button');
  assert.match(query('.t05-school__dialog').textContent, /高二那年休学了两个月/);
  await textButton('记下老师的回忆', '.t05-school__dialog button');
  await textButton('关闭 ×', '.t05-school__dialog button');
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_001'));

  await textButton('光荣榜', '.t05-school__map button');
  await textButton('查看历次名次', '.t05-school__hotspots button');
  assert.deepEqual([...query('.t05-school__ranks').querySelectorAll('strong')].map((item) => Number(item.textContent)), [600, 400, 300, 130, 88, 53, 20]);
  await textButton('记下这组名次', '.t05-school__dialog button');
  await textButton('查看成绩表下方的感谢文字', '.t05-school__dialog button');
  assert.match(query('.t05-school__dialog').textContent, /启明青少年成长中心两个月来对我的教育和培养/);
  await textButton('记下这段文字', '.t05-school__dialog button');
  await textButton('关闭 ×', '.t05-school__dialog button');
  assert.equal(state().game.flags.FLAG_A2_QIMING_NAME_FOUND, true);
  assert.ok(state().modules.notepad.autoEntryIds.includes('NOTE_A2_T05_003'));

  await textButton('小A旧教室', '.t05-school__map button');
  await textButton('翻看学霸笔记', '.t05-school__hotspots button');
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
  });
  await mount(save());
  assert.equal(document().querySelectorAll('.app-window').length, 0);
  assert.equal(document().querySelector('.act2-experience'), null);
}

try {
  await mount();
  assert.equal(document().querySelectorAll('script[src], link[href]').length, 0);
  for (const image of document().querySelectorAll('svg image')) assert.match(image.getAttribute('href'), /^data:image\/png;base64,/);
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
    }
    await reset();
      console.log(`PASS ${run}: rendered A–K flow, photo editing, save reload, ending, reset and clean reload${run === 1 ? ' plus act2 T01–T06' : ''}`);
  }
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log('PASS: standalone classic script, inline styles, zero external resources and zero runtime errors');
} finally { dom?.window.close(); }
