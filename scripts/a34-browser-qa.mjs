import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const playwrightEntry = process.env.A34_PLAYWRIGHT_ENTRY
  ?? 'file:///C:/Users/Jay%20Cai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const chromePath = process.env.A34_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = process.env.A34_BASE_URL ?? 'http://127.0.0.1:5173/';
const evidenceDirectory = resolve(process.env.A34_EVIDENCE_DIR ?? 'docs/a34-narrative-0001/evidence/browser');
const { chromium } = await import(playwrightEntry);
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const runtimeErrors = [];
const consoleErrors = [];
const expectedBrokenImagePath = '/a34-missing-optional-art.png';
const expectedBrokenImageFailures = new Set();
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url || null });
});
page.on('requestfailed', (request) => {
  if (new URL(request.url()).pathname === expectedBrokenImagePath) expectedBrokenImageFailures.add(expectedBrokenImagePath);
});
page.on('response', (response) => {
  if (new URL(response.url()).pathname === expectedBrokenImagePath && response.status() >= 400) expectedBrokenImageFailures.add(expectedBrokenImagePath);
});
await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));

async function assertStage(stage) {
  await page.waitForFunction((expected) => document.querySelector('.a4-reader')?.getAttribute('data-act4-stage') === expected, stage, { timeout: 5000 }).catch(async (error) => {
    const actual = await page.locator('.a4-reader').getAttribute('data-act4-stage').catch(() => 'reader missing');
    throw new Error(`Expected Act4 stage ${stage}, saw ${actual}: ${error.message}`);
  });
  assert.equal(await page.locator('.a4-reader').getAttribute('data-act4-stage'), stage);
}
async function continueSection(stage) {
  await page.locator(`[data-action-id="A4_${stage}_CONTINUE_READING"]`).click();
  const next = { T01: 'T02', T02: 'T03', T03: 'T04', T04: 'T05', T05: 'T06', T06: 'T07', T07: 'T08', T08: 'T09', T09: 'T10', T10: 'T10' }[stage];
  await assertStage(next);
  await page.waitForTimeout(510);
}
async function reload(waitForReader = true) {
  await page.reload();
  if (waitForReader) await page.waitForSelector('.a4-reader');
  else await page.waitForSelector('.taskbar-investigation > summary');
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const seedResult = await page.evaluate(async () => {
    const { createDefaultState } = await import('/src/core/defaultState.ts');
    const { hydrateState } = await import('/src/core/saveManager.ts');
    const { act2T07 } = await import('/src/data/act2T07Data.ts');
    const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
    const state = createDefaultState();
    state.game.act = 3;
    state.game.phase = 'A3_T07';
    state.game.flags = {
      FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true,
      FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true,
      FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true,
      FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true,
      FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true,
      FLAG_A2_QIMING_FORUM_FOUND: true, FLAG_A2_HUANG_MATCH_INFERRED: true,
      FLAG_A2_ZHONG_MATCH_INFERRED: true, FLAG_A2_OTHER_CASES_ABNORMAL: true,
      FLAG_A2_PROMO_VIDEO_FOUND: true, FLAG_A2_PROMO_VIDEO_WATCHED: true,
      FLAG_A2_PROMO_PHOTO_SS_FOUND: true, FLAG_A2_TEMPLE_FRAME_FOUND: true,
      FLAG_A2_QIMING_LOCATION_INFERRED: true, FLAG_A2_SECOND_TRIP_PLANNED: true,
      FLAG_A2_COMPLETE: true, FLAG_A3_GATE_REACHED: true,
      FLAG_A3_INNER_FENCE_PASSED: true, FLAG_A3_CLASSROOM_TURNED: true,
      FLAG_A3_STAIRS_DESCENDED: true, FLAG_A3_BROADCAST_DOOR_REACHED: true,
      FLAG_A3_KITCHEN_DOOR_REACHED: true, FLAG_A3_KITCHEN_EXITED: true,
      FLAG_A3_NOTEBOOK_FOUND: true, FLAG_A3_SITE_EXITED: true, FLAG_A3_COMPLETE: true,
    };
    state.modules.act2Research.stage = 'finale';
    state.modules.act2Research.school = {
      visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
      inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'],
      selectedEvidenceIds: ['rank-record', 'teacher-account'], selectedInferenceId: 'bounded-timeline',
      symbolMatchConfirmed: true, legacyCompletionMigrated: false,
    };
    state.modules.act2Research.t06.reviewedCases = [
      { caseId: 'huang', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], conclusionId: 'public-claims-and-followup-differ' },
      { caseId: 'zhong', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'], conclusionId: 'public-claims-and-followup-differ' },
    ];
    state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
    state.modules.act2Research.t07 = {
      viewedMaterialIds: [act2T07.video.materialId, act2T07.photoMaterialId],
      playedSegmentIds: act2T07.video.requiredSegmentIds,
      capturedFrameIds: [act2T07.video.keyFrames[0].id],
      comparedFrameIds: [act2T07.video.keyFrames[0].id],
      capturedAtMsByFrameId: { [act2T07.video.keyFrames[0].id]: act2T07.video.keyFrames[0].startMs + 500 },
      comparisonFeatureIdByFrameId: { [act2T07.video.keyFrames[0].id]: act2T07.comparison.matchFeatureId },
    };
    state.modules.act3.stage = 'T07';
    state.modules.storyTransitions.seenIds = storyTransitions.map((transition) => transition.id);
    const hydrated = hydrateState(state);
    const valid = hydrated.game.flags.FLAG_A3_COMPLETE === true
      && hydrated.game.flags.FLAG_A3_SITE_EXITED === true
      && hydrated.modules.act3.stage === 'T07'
      && hydrated.modules.act4.stage === 'inactive';
    if (valid) localStorage.setItem('anchao.save.v1', JSON.stringify(hydrated));
    return { valid, stage: hydrated.modules.act3.stage, act4Stage: hydrated.modules.act4.stage };
  });
  assert.deepEqual(seedResult, { valid: true, stage: 'T07', act4Stage: 'inactive' });
  await reload(false);
  await page.locator('.taskbar-investigation > summary').click();
  await page.getByRole('button', { name: '继续调查小 A 的笔记' }).click();
  await assertStage('T01');
  await page.screenshot({ path: resolve(evidenceDirectory, 'a34-desktop-1920x1080-t01.png') });

  await continueSection('T01');
  for (const button of await page.locator('.a4-reader__mail button').all()) await button.click();
  await reload();
  await assertStage('T02');
  assert.equal(await page.locator('.a4-reader__mail button:disabled').count(), 2, 'T02 mail checks persist after reload');
  for (let hint = 1; hint <= 3; hint += 1) await page.getByRole('button', { name: /查看下一级提示/ }).click();
  assert.match(await page.locator('[data-password-hint-level="3"]').textContent(), /20200419/);
  await page.locator('#a4-shared-date').fill('20200419');
  await page.getByRole('button', { name: '主动登录' }).click();
  assert.ok(await page.locator('[data-block-id="T02_PASSWORD_REVEAL"]').count());
  assert.match(await page.locator('.a4-reader__interaction').textContent(), /登录成功.*继续进入王澳的微博/s);
  await continueSection('T02');
  await continueSection('T03');
  await page.getByRole('button', { name: '打开 VVaKe 邮件' }).click();
  assert.ok(await page.locator('[data-block-id="T04_ORIGINAL"]').count());
  await continueSection('T04');
  await continueSection('T05');
  await page.locator('[data-action-id="A4_T06_CONTINUE_READING"]').dblclick({ delay: 60 });
  await assertStage('T07');
  await page.waitForTimeout(510);
  await page.route(`**${expectedBrokenImagePath}`, (route) => route.abort());
  await page.locator('.a4-reader__art img').evaluate((image, path) => { image.src = path; }, expectedBrokenImagePath);
  await expectImageFallback(page);
  assert.ok(expectedBrokenImageFailures.has(expectedBrokenImagePath), 'the injected optional art request must fail');
  assert.ok(await page.locator('[data-block-id="T07_ORIGINAL"]').count(), 'T07 text remains available without its optional image');
  await continueSection('T07');

  await page.getByRole('button', { name: '从档案架抽出 2008 年档案' }).click();
  await reload();
  await assertStage('T08');
  assert.ok(await page.locator('[data-block-id="T08_ARCHIVE"]').count(), 'T08 archive action survives reload');
  assert.ok(await page.locator('[data-explanation-id="A4_EXPLAIN_T08"]').count());
  const image = page.locator('.a4-reader__art img');
  await image.waitFor({ state: 'visible' });
  const desktopArtHeight = await image.evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(desktopArtHeight <= 0.32 * 1080 + 2, `desktop art height ${desktopArtHeight}px exceeds 32vh`);
  await page.screenshot({ path: resolve(evidenceDirectory, 'a34-desktop-1920x1080-t08.png') });

  const scene = page.locator('.investigation-shell__scene');
  const zoomTrigger = page.getByRole('button', { name: '放大配图' });
  await zoomTrigger.click();
  const dialog = page.getByRole('dialog', { name: '放大配图' });
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.investigation-shell').getAttribute('inert'), '');
  await page.keyboard.press('Tab');
  assert.match(await page.evaluate(() => document.activeElement?.textContent ?? ''), /关闭配图/);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !document.querySelector('.investigation-shell')?.hasAttribute('inert'));
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('放大配图'));

  const explanationReplay = page.locator('[data-review-trigger="replay-T08-A4_READ_T07"]');
  await explanationReplay.scrollIntoViewIfNeeded();
  const savedScrollTop = await scene.evaluate((element) => element.scrollTop);
  await explanationReplay.click();
  await assertStage('T08');
  assert.equal(await page.locator('.a4-reader').getAttribute('data-reading-stage'), 'T07');
  await page.getByRole('button', { name: '返回当前阅读进度' }).click();
  await page.waitForFunction(() => document.querySelector('.a4-reader')?.getAttribute('data-reading-stage') === 'T08');
  assert.equal(await scene.evaluate((element) => element.scrollTop), savedScrollTop, 'return to current restores the saved position');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-review-trigger')), 'replay-T08-A4_READ_T07');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '继续阅读', exact: false }).click();
  await assertStage('T09');
  await page.getByRole('button', { name: '把笔记藏到消防箱后' }).click();
  await reload();
  await assertStage('T09');
  assert.ok(await page.locator('[data-block-id="T09_NOTE_HIDDEN"]').count(), 'hidden-note action survives reload');
  await page.getByRole('button', { name: '走到门外，听完广播' }).click();
  assert.ok(await page.locator('[data-block-id="T09_BROADCAST"]').count());
  await continueSection('T09');
  await page.getByRole('button', { name: '打开启明的最后一封邮件' }).click();
  await reload();
  await assertStage('T10');
  assert.ok(await page.locator('[data-block-id="T10_FINAL_MAIL"]').count(), 'T10 final-mail action survives reload');
  await page.screenshot({ path: resolve(evidenceDirectory, 'a34-mobile-390x844-t10.png') });
  const mobileMetrics = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    artHeight: document.querySelector('.a4-reader__art img')?.getBoundingClientRect().height ?? 0,
    navTitleColor: getComputedStyle(document.querySelector('.investigation-navigation__title')).color,
  }));
  assert.equal(mobileMetrics.width, 390);
  assert.ok(mobileMetrics.documentWidth <= mobileMetrics.width, `mobile horizontal overflow: ${mobileMetrics.documentWidth}px`);
  assert.ok(mobileMetrics.artHeight <= 0.32 * 844 + 2, `mobile art height ${mobileMetrics.artHeight}px exceeds 32vh`);
  assert.equal(mobileMetrics.navTitleColor, 'rgb(31, 31, 31)');
  await continueSection('T10');
  assert.equal(await page.locator('.a4-reader__ending').count(), 1, 'T10 completion displays the final timeline and cast recap');
  await reload();
  await assertStage('T10');
  assert.ok(await page.locator('.a4-reader__ending').count(), 'final completion survives reload');
  const expectedBrokenImageConsoleErrors = new Set([
    'Failed to load resource: the server responded with a status of 404 (Not Found)',
    'Failed to load resource: net::ERR_FAILED',
  ]);
  const unexpectedConsoleErrors = consoleErrors.filter(({ text, url }) => {
    let locationPath = null;
    try { if (url) locationPath = new URL(url).pathname; } catch {}
    return locationPath !== expectedBrokenImagePath || !expectedBrokenImageConsoleErrors.has(text);
  });
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(unexpectedConsoleErrors, []);
  console.log(JSON.stringify({
    result: 'PASS',
    entry: 'A3 T07 exited -> player starts A4 at T01',
    sections: 'T01-T10 completed by normal reader controls',
    reloads: ['T02', 'T08', 'T09', 'T10'],
    doubleClick: 'T06 advanced exactly once to T07',
    reviewPositionAndFocus: 'restored',
    optionalArtZoomAndFallback: 'focus trap, inert background, focus restore, no-image continuation passed',
    desktop: { viewport: '1920x1080', artHeight: desktopArtHeight },
    mobile: mobileMetrics,
    runtimeErrors,
    expectedOptionalArtFailures: [...expectedBrokenImageFailures],
    screenshots: ['a34-desktop-1920x1080-t01.png', 'a34-desktop-1920x1080-t08.png', 'a34-mobile-390x844-t10.png'],
  }, null, 2));
} finally {
  await browser.close();
}

async function expectImageFallback(page) {
  await page.waitForFunction(() => document.querySelector('.a4-reader__art-placeholder'));
  assert.ok(await page.locator('.a4-reader__art-placeholder').count());
}
