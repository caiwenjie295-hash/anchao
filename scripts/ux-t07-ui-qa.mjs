import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const playwrightEntry = process.env.UX_T07_PLAYWRIGHT_ENTRY
  ?? 'file:///C:/Users/Jay%20Cai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const chromePath = process.env.UX_T07_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = process.env.UX_T07_BASE_URL ?? 'http://127.0.0.1:5173/';
const evidenceDirectory = resolve(process.env.UX_T07_EVIDENCE_DIR ?? 'docs/ux-t07-ui-0001/evidence/browser');
const { chromium } = await import(playwrightEntry);
await mkdir(evidenceDirectory, { recursive: true });

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];
const schoolViewports = [...viewports, { width: 1920, height: 920 }];
const lifecycleOnly = process.env.UX_T07_LIFECYCLE_ONLY === '1';
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const report = { date: new Date().toISOString(), browser: 'Chrome headless via Playwright', baseUrl, school: [], act3Lenses: [] };
const errors = [];
const expectedImageFailure = { path: null, requestFailed: false };
try {
  const page = await browser.newPage({ viewport: viewports[0], deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', text: message.text(), url: message.location().url || null });
  });
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    if (expectedImageFailure.path && path === expectedImageFailure.path) expectedImageFailure.requestFailed = true;
    else errors.push({ type: 'requestfailed', text: request.failure()?.errorText ?? 'request failed', url: request.url() });
  });
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // School exercise: click all eight place controls, then use the timeline evidence and inference controls.
  if (!lifecycleOnly) {
  for (const viewport of schoolViewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      const { createDefaultState } = await import('/src/core/defaultState.ts');
      const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
      const state = createDefaultState();
      state.game.act = 2;
      state.game.phase = 'A2_T05';
      state.game.flags = {
        FLAG_A1_COMPLETE: true,
        FLAG_A1_SS_FOUND: true,
        FLAG_A2_TRANSFER_RULE_INFERRED: true,
        FLAG_A2_SCHOOL_ENTERED: true,
        FLAG_A2_SCHOOL_SS_FOUND: true,
        FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true,
        FLAG_A2_SCORE_CHANGE_KNOWN: true,
        FLAG_A2_QIMING_NAME_FOUND: true,
      };
      state.modules.act2Research.stage = 'school';
      state.modules.act2Research.school = {
        ...state.modules.act2Research.school,
        visitedAreaIds: ['AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
        inspectedHotspotIds: ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE'],
        selectedEvidenceIds: [],
        selectedInferenceId: null,
        symbolMatchConfirmed: true,
        legacyCompletionMigrated: false,
      };
      state.modules.storyTransitions.seenIds = storyTransitions.map((item) => item.id);
      localStorage.setItem('anchao.save.v1', JSON.stringify(state));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.t05-school__map nav button').first().waitFor({ state: 'visible' });
    const areaButtons = page.locator('.t05-school__map nav button');
    const areaCount = await areaButtons.count();
    assert.equal(areaCount, 8, `T05 map must expose all eight locations at ${viewport.width}px`);
    const places = [];
    for (let index = 0; index < areaCount; index += 1) {
      const button = areaButtons.nth(index);
      await button.scrollIntoViewIfNeeded();
      const label = (await button.innerText()).trim();
      await button.click();
      assert.equal(await button.getAttribute('aria-current'), 'location', `${label} should become current after click`);
      const hitAtCenter = await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return Boolean(hit && (hit === element || element.contains(hit)));
      });
      assert.equal(hitAtCenter, true, `${label} must receive a real pointer hit at ${viewport.width}px`);
      places.push(label);
    }
    const timeline = page.locator('.t05-school__timeline');
    await timeline.scrollIntoViewIfNeeded();
    const evidenceButtons = page.locator('.t05-school__evidence-options button');
    assert.equal(await evidenceButtons.count(), 3);
    await evidenceButtons.nth(0).click();
    await evidenceButtons.nth(1).click();
    const inference = page.locator('.t05-school__inferences button').first();
    await inference.click();
    assert.equal(await evidenceButtons.nth(0).getAttribute('aria-pressed'), 'true');
    assert.equal(await evidenceButtons.nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await inference.getAttribute('aria-pressed'), 'true');
    const schoolMetrics = await page.evaluate(() => {
      const root = document.querySelector('.investigation-shell');
      const image = root?.querySelector('.t05-school__backdrop > img');
      const imageRect = image?.getBoundingClientRect();
      const imageRatioError = image && imageRect && image.naturalWidth > 0
        ? Math.abs((imageRect.width / imageRect.height) / (image.naturalWidth / image.naturalHeight) - 1)
        : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        sceneWidth: root?.querySelector('.investigation-shell__scene')?.clientWidth ?? 0,
        places: [...root?.querySelectorAll('.t05-school__map nav button') ?? []].map((button) => button.innerText.trim()),
        selectedSources: root?.querySelectorAll('.t05-school__evidence-options button[aria-pressed="true"]').length ?? 0,
        selectedInference: Boolean(root?.querySelector('.t05-school__inferences button[aria-pressed="true"]')),
        image: image ? { natural: [image.naturalWidth, image.naturalHeight], rect: imageRect ? [imageRect.width, imageRect.height] : null, ratioError: imageRatioError } : null,
      };
    });
    assert.ok(schoolMetrics.documentWidth <= viewport.width, `school document overflows at ${viewport.width}px`);
    assert.equal(schoolMetrics.selectedSources, 2);
    assert.equal(schoolMetrics.selectedInference, true);
    report.school.push({ ...schoolMetrics, clickedPlaces: places, fixture: 'synthetic state fixture; real location and evidence controls' });
    if (viewport.width === 1920 || viewport.width === 390) {
      await page.screenshot({ path: resolve(evidenceDirectory, `school-${viewport.width}x${viewport.height}.png`) });
    }
  }
  }

  // Build a legal synthetic A3 fixture through the real state-manager actions; it does not contain a player save.
  const a3Exit = await page.evaluate(async () => {
    const { createDefaultState } = await import('/src/core/defaultState.ts');
    const { EventBus } = await import('/src/core/eventBus.ts');
    const { StateManager } = await import('/src/core/stateManager.ts');
    const { act2T07 } = await import('/src/data/act2T07Data.ts');
    const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
    const { hydrateState } = await import('/src/core/saveManager.ts');
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T06';
    state.game.flags = {
      FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true,
      FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true,
      FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true,
      FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true,
      FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true,
    };
    state.modules.act2Research.stage = 'qiming';
    state.modules.act2Research.school = {
      visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
      inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'],
      selectedEvidenceIds: ['rank-record', 'teacher-account'], selectedInferenceId: 'bounded-timeline',
      symbolMatchConfirmed: true, legacyCompletionMigrated: false,
    };
    state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
    const manager = new StateManager(new EventBus(), state);
    manager.reviewAct2QimingCase('huang', ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], 'public-claims-and-followup-differ');
    manager.reviewAct2QimingCase('zhong', ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'], 'public-claims-and-followup-differ');
    manager.enterAct2FinaleInvestigation();
    manager.viewAct2T07Material(act2T07.photoMaterialId);
    manager.confirmAct2T07PhotoSymbol();
    manager.viewAct2T07Material(act2T07.video.materialId);
    for (const segmentId of act2T07.video.requiredSegmentIds) manager.markAct2T07SegmentPlayed(segmentId);
    const frame = act2T07.video.keyFrames[0];
    manager.captureAct2T07Frame(frame.id, frame.startMs + 500);
    manager.submitAct2T07Comparison(frame.id, act2T07.comparison.matchFeatureId);
    manager.inferAct2T07Location();
    manager.planAct2T07SecondTrip();
    manager.completeAct2T07Finale();
    const completeA2 = manager.getState();
    Object.assign(completeA2.game.flags, {
      FLAG_A3_GATE_REACHED: true, FLAG_A3_INNER_FENCE_PASSED: true,
      FLAG_A3_CLASSROOM_TURNED: true, FLAG_A3_STAIRS_DESCENDED: true,
      FLAG_A3_BROADCAST_DOOR_REACHED: true, FLAG_A3_KITCHEN_DOOR_REACHED: true,
      FLAG_A3_KITCHEN_EXITED: true, FLAG_A3_NOTEBOOK_FOUND: true,
      FLAG_A3_SITE_EXITED: false, FLAG_A3_COMPLETE: false,
    });
    completeA2.game.act = 3;
    completeA2.game.phase = 'A3_T07';
    completeA2.modules.act3.stage = 'T07';
    completeA2.modules.act3.currentLensId = 'LENS_A3_T07_001';
    completeA2.modules.act3.visitedLensIds = ['LENS_A3_T07_001'];
    completeA2.modules.storyTransitions.seenIds = storyTransitions.map((item) => item.id);
    return hydrateState(JSON.parse(JSON.stringify(completeA2)));
  });
  assert.equal(a3Exit.schemaVersion, 13, 'synthetic A3 fixture should hydrate to current schema');
  assert.equal(a3Exit.game.flags.FLAG_A2_COMPLETE, true, 'synthetic fixture must complete A2 through the current state-manager actions');
  assert.equal(a3Exit.modules.act3.stage, 'T07');
  assert.equal(a3Exit.modules.act3.currentLensId, 'LENS_A3_T07_001');
  const stageDocuments = await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const stage = `T0${index}`;
    const document = JSON.parse(await readFile(resolve('data', `act3_${stage.toLowerCase()}.json`), 'utf8'));
    return { stage, lenses: document.lenses };
  }));
  const lensCount = stageDocuments.reduce((sum, item) => sum + item.lenses.length, 0);
  assert.equal(lensCount, 59, 'authored Act3 lens count changed; refresh the inventory before claiming full coverage');
  if (!lifecycleOnly) for (const { stage, lenses } of stageDocuments) {
    for (const lens of lenses) {
      const state = structuredClone(a3Exit);
      state.game.act = 3;
      state.game.phase = `A3_${stage}`;
      state.modules.act3 = {
        ...state.modules.act3,
        stage,
        currentLensId: lens.id,
        visitedLensIds: [lens.id],
      };
      state.game.flags.FLAG_A3_COMPLETE = false;
      state.game.flags.FLAG_A3_SITE_EXITED = false;
      const hydrated = await page.evaluate(async (fixture) => {
        const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
        fixture.modules.storyTransitions.seenIds = storyTransitions.map((item) => item.id);
        const { hydrateState } = await import('/src/core/saveManager.ts');
        return hydrateState(fixture);
      }, state);
      assert.equal(hydrated.modules.act3.stage, stage, `A3 fixture was not valid at ${lens.id}`);
      assert.equal(hydrated.modules.act3.currentLensId, lens.id, `A3 current lens was not preserved at ${lens.id}`);
      assert.equal(hydrated.game.flags.FLAG_A2_COMPLETE, true, `A3 prerequisite was not preserved at ${lens.id}`);
      await page.evaluate((fixture) => localStorage.setItem('anchao.save.v1', JSON.stringify(fixture)), hydrated);
      await page.reload({ waitUntil: 'networkidle' });
      const actualLens = page.locator('.act3-investigation__lens');
      await actualLens.waitFor({ state: 'visible', timeout: 10000 }).catch(async (error) => {
        const actual = await page.evaluate(() => ({
          text: document.body.innerText.slice(0, 320),
          saved: JSON.parse(localStorage.getItem('anchao.save.v1') ?? 'null')?.modules?.act3,
          phase: JSON.parse(localStorage.getItem('anchao.save.v1') ?? 'null')?.game?.phase,
        }));
        throw new Error(`Act3 scene did not render for ${lens.id}: ${JSON.stringify(actual)}; ${error.message}`);
      });
      assert.equal(await actualLens.getAttribute('data-asset-id'), lens.assetId, `wrong image scene after reload for ${lens.id}`);
      await page.locator('.photo-viewport__plane > img').waitFor({ state: 'attached' });
      await page.waitForFunction(() => {
        const image = document.querySelector('.photo-viewport__plane > img');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      }, null, { timeout: 10000 });
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(40);
        const positions = await page.evaluate(async (lensId) => {
          const { act3PhotoLayout } = await import('/src/data/act3PhotoLayout.ts');
          return act3PhotoLayout[lensId] ?? {};
        }, lens.id);
        const geometry = await page.evaluate((expectedPositions) => {
          const image = document.querySelector('.photo-viewport__plane > img');
          const frame = document.querySelector('.photo-viewport__frame');
          const plane = document.querySelector('.photo-viewport__plane');
          if (!(image instanceof HTMLImageElement) || !frame || !plane) return null;
          const imageRect = image.getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          const markers = [...plane.querySelectorAll('[data-clue-id]')].map((marker) => {
            const rect = marker.getBoundingClientRect();
            const clueId = marker.getAttribute('data-clue-id');
            const expected = expectedPositions[clueId] ?? { x: .5, y: .5 };
            return {
              clueId,
              dx: Math.abs(rect.x + rect.width / 2 - (imageRect.left + imageRect.width * expected.x)),
              dy: Math.abs(rect.y + rect.height / 2 - (imageRect.top + imageRect.height * expected.y)),
            };
          });
          return {
            viewport: { width: innerWidth, height: innerHeight },
            documentWidth: document.documentElement.scrollWidth,
            frame: [frameRect.width, frameRect.height],
            image: [imageRect.width, imageRect.height],
            natural: [image.naturalWidth, image.naturalHeight],
            ratioError: Math.abs((imageRect.width / imageRect.height) / (image.naturalWidth / image.naturalHeight) - 1),
            markerCount: plane.querySelectorAll('[data-clue-id]').length,
            maxMarkerOffsetPx: Math.max(0, ...markers.flatMap((marker) => [marker.dx, marker.dy])),
            markers,
          };
        }, positions);
        assert.ok(geometry, `missing A3 viewport geometry for ${lens.id}`);
        if (geometry.image[0] <= 0 || geometry.image[1] <= 0) {
          const layout = await page.evaluate(() => {
            const rect = (selector) => {
              const element = document.querySelector(selector);
              const box = element?.getBoundingClientRect();
              const style = element ? getComputedStyle(element) : null;
              return element ? { rect: box && [box.x, box.y, box.width, box.height], display: style?.display, flex: style?.flex, minHeight: style?.minHeight, overflow: style?.overflow } : null;
            };
            return { lens: rect('.act3-investigation__lens'), viewport: rect('.act3-investigation__lens > .photo-viewport'), frame: rect('.act3-investigation__lens > .photo-viewport .photo-viewport__frame'), comparison: rect('.act3-investigation__temple-compare'), figures: [...document.querySelectorAll('.act3-investigation__temple-compare figure')].map((figure) => { const box = figure.getBoundingClientRect(); return [box.x, box.y, box.width, box.height]; }) };
          });
          await page.screenshot({ path: resolve(evidenceDirectory, `geometry-failure-${lens.id}-${viewport.width}x${viewport.height}.png`) });
          throw new Error(`empty image plane for ${lens.id} at ${viewport.width}x${viewport.height}: ${JSON.stringify({ geometry, layout })}`);
        }
        assert.ok(geometry.ratioError < 0.005, `image ratio drift for ${lens.id} at ${viewport.width}px: ${geometry.ratioError}`);
        assert.ok(geometry.documentWidth <= viewport.width, `horizontal overflow for ${lens.id} at ${viewport.width}px`);
        assert.equal(geometry.markerCount, lens.hotspots.length, `hotspot count mismatch for ${lens.id}`);
        for (const marker of geometry.markers) {
          assert.ok(marker.dx < 1.5 && marker.dy < 1.5, `hotspot ${marker.clueId} drifted ${marker.dx.toFixed(2)}×${marker.dy.toFixed(2)}px in ${lens.id} at ${viewport.width}px`);
        }
        delete geometry.markers;
        if (lens.id === 'LENS_A3_T06_008') {
          geometry.templeComparisonLayout = await page.evaluate(() => {
            const measure = (selector) => {
              const element = document.querySelector(selector);
              const rect = element?.getBoundingClientRect();
              return element ? { rect: rect && [rect.width, rect.height], scroll: [element.scrollWidth, element.scrollHeight], client: [element.clientWidth, element.clientHeight], overflowY: getComputedStyle(element).overflowY } : null;
            };
            return { lens: measure('.act3-investigation__lens'), viewport: measure('.act3-investigation__lens > .photo-viewport'), frame: measure('.act3-investigation__lens > .photo-viewport .photo-viewport__frame'), comparison: measure('.act3-investigation__temple-compare') };
          });
          assert.ok(geometry.templeComparisonLayout.frame?.rect?.[1] > 0, `T06 comparison retains a visible photo frame at ${viewport.width}px`);
          assert.equal(geometry.templeComparisonLayout.lens?.overflowY, 'auto');
        }
        report.act3Lenses.push({ id: lens.id, stage, assetId: lens.assetId, hotspotCount: lens.hotspots.length, ...geometry });
        if (stage === 'T07' && lens.id.endsWith('_001') && (viewport.width === 1920 || viewport.width === 390)) {
          await page.screenshot({ path: resolve(evidenceDirectory, `act3-${viewport.width}x${viewport.height}.png`) });
        }
      }
    }
  }
  if (!lifecycleOnly) {
    // 960×540 CSS pixels at DPR 2 is the layout-equivalent of 1920×1080 at 200%.
    // It checks representative zoom paths; it is not a browser-menu zoom test.
    const zoomPage = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    zoomPage.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
    zoomPage.on('console', (message) => {
      if (message.type() === 'error') errors.push({ type: 'console', text: message.text(), url: message.location().url || null });
    });
    zoomPage.on('requestfailed', (request) => {
      const path = new URL(request.url()).pathname;
      if (expectedImageFailure.path && path === expectedImageFailure.path) expectedImageFailure.requestFailed = true;
      else errors.push({ type: 'requestfailed', text: request.failure()?.errorText ?? 'request failed', url: request.url() });
    });
    await zoomPage.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    await zoomPage.goto(baseUrl, { waitUntil: 'networkidle' });
    assert.deepEqual(await zoomPage.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]), [960, 540, 2]);

    const finaleState = structuredClone(a3Exit);
    finaleState.game.act = 2;
    finaleState.game.phase = 'A2_T07';
    finaleState.game.flags = Object.fromEntries(Object.entries(finaleState.game.flags).filter(([id]) => !id.startsWith('FLAG_A3_')));
    finaleState.modules.act2Research.stage = 'finale';
    finaleState.modules.act3 = { stage: 'inactive', currentLensId: null, visitedLensIds: [], inspectedClueIds: [], confirmedFlagIds: [] };
    const readyFinale = await zoomPage.evaluate(async (fixture) => {
      const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
      fixture.modules.storyTransitions.seenIds = storyTransitions.map((item) => item.id);
      const { hydrateState } = await import('/src/core/saveManager.ts');
      return hydrateState(fixture);
    }, finaleState);
    assert.equal(readyFinale.modules.act2Research.stage, 'finale');
    assert.equal(readyFinale.game.flags.FLAG_A2_COMPLETE, true);
    await zoomPage.evaluate((fixture) => localStorage.setItem('anchao.save.v1', JSON.stringify(fixture)), readyFinale);
    await zoomPage.reload({ waitUntil: 'networkidle' });
    await zoomPage.locator('.t07-finale__photo-zoom:not(:disabled)').waitFor({ state: 'visible' });
    await zoomPage.locator('.t07-finale__photo-zoom').click();
    await zoomPage.waitForFunction(() => {
      const image = document.querySelector('.t07-finale__photo .photo-viewport__plane > img');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    const pressZoom = async (selector) => {
      const controls = zoomPage.locator(selector);
      await controls.waitFor({ state: 'visible' });
      const zoomLabel = controls.locator('.photo-viewport__controls > span');
      for (let count = 0; count < 9; count += 1) {
        if ((await zoomLabel.innerText()).trim() === '300%') break;
        await controls.locator('button[aria-label="放大"]').click();
      }
      assert.equal((await zoomLabel.innerText()).trim(), '300%', `${selector} reaches the 300% image zoom cap`);
      assert.match(await controls.locator('.photo-viewport__world').getAttribute('style'), /scale\(3\)/);
      const image = await controls.locator('.photo-viewport__plane > img').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { natural: [element.naturalWidth, element.naturalHeight], rect: [rect.width, rect.height], fit: getComputedStyle(element).objectFit };
      });
      assert.ok(image.natural[0] > 0 && image.natural[1] > 0);
      assert.notEqual(image.fit, 'cover');
      assert.ok(Math.abs((image.rect[0] / image.rect[1]) / (image.natural[0] / image.natural[1]) - 1) < 0.005);
      return image;
    };
    const finaleZoom = await pressZoom('.t07-finale__photo .photo-viewport');
    await zoomPage.screenshot({ path: resolve(evidenceDirectory, 't07-photo-zoom-300-dpr2-960x540.png') });

    const act3ZoomState = structuredClone(a3Exit);
    act3ZoomState.game.act = 3;
    act3ZoomState.game.phase = 'A3_T07';
    act3ZoomState.game.flags.FLAG_A3_COMPLETE = false;
    act3ZoomState.game.flags.FLAG_A3_SITE_EXITED = false;
    act3ZoomState.modules.act3.stage = 'T07';
    act3ZoomState.modules.act3.currentLensId = 'LENS_A3_T07_001';
    act3ZoomState.modules.act3.visitedLensIds = ['LENS_A3_T07_001'];
    await zoomPage.evaluate((fixture) => localStorage.setItem('anchao.save.v1', JSON.stringify(fixture)), act3ZoomState);
    await zoomPage.reload({ waitUntil: 'networkidle' });
    await zoomPage.waitForFunction(() => document.querySelector('.act3-investigation__lens')?.getAttribute('data-asset-id') === 'IMG_A3_T07_001');
    await zoomPage.waitForFunction(() => {
      const image = document.querySelector('.photo-viewport__plane > img');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    const act3Zoom = await pressZoom('.act3-investigation__lens > .photo-viewport');
    const act3Hotspots = await zoomPage.evaluate(async () => {
      const { act3PhotoLayout } = await import('/src/data/act3PhotoLayout.ts');
      const positions = act3PhotoLayout.LENS_A3_T07_001 ?? {};
      const image = document.querySelector('.act3-investigation__lens .photo-viewport__plane > img');
      const plane = image?.closest('.photo-viewport__plane');
      if (!(image instanceof HTMLImageElement) || !plane) return null;
      const imageRect = image.getBoundingClientRect();
      return [...plane.querySelectorAll('[data-clue-id]')].map((marker) => {
        const rect = marker.getBoundingClientRect();
        const expected = positions[marker.getAttribute('data-clue-id')] ?? { x: .5, y: .5 };
        return { dx: Math.abs(rect.x + rect.width / 2 - imageRect.left - imageRect.width * expected.x), dy: Math.abs(rect.y + rect.height / 2 - imageRect.top - imageRect.height * expected.y) };
      });
    });
    assert.ok(act3Hotspots?.length, 'Act3 T07 hotspots remain visible at DPR2 maximum zoom');
    assert.ok(Math.max(...act3Hotspots.flatMap((item) => [item.dx, item.dy])) < 1.5);
    await zoomPage.screenshot({ path: resolve(evidenceDirectory, 'act3-t07-zoom-300-dpr2-960x540.png') });

    const readerState = structuredClone(a3Exit);
    readerState.game.flags.FLAG_A3_SITE_EXITED = true;
    readerState.game.flags.FLAG_A3_COMPLETE = true;
    readerState.game.flags.FLAG_A3_NOTEBOOK_FOUND = true;
    readerState.modules.act3.stage = 'T07';
    readerState.modules.act3.currentLensId = 'LENS_A3_T07_001';
    readerState.modules.act3.inspectedClueIds = stageDocuments[7].lenses.flatMap((lens) => lens.hotspots.map((hotspot) => hotspot.clueId));
    const readyReader = await zoomPage.evaluate(async (fixture) => {
      const { storyTransitions } = await import('/src/data/storyTransitionData.ts');
      fixture.modules.storyTransitions.seenIds = storyTransitions.map((item) => item.id);
      const { hydrateState } = await import('/src/core/saveManager.ts');
      return hydrateState(fixture);
    }, readerState);
    assert.equal(readyReader.game.flags.FLAG_A3_COMPLETE, true);
    assert.equal(readyReader.game.flags.FLAG_A3_SITE_EXITED, true);
    await zoomPage.evaluate((fixture) => localStorage.setItem('anchao.save.v1', JSON.stringify(fixture)), readyReader);
    await zoomPage.reload({ waitUntil: 'networkidle' });
    await zoomPage.locator('.taskbar-investigation > summary').click();
    const launchReader = zoomPage.locator('.story-transition-launch[aria-label="第四幕调查已就绪"] button').first();
    await launchReader.waitFor({ state: 'visible' });
    await launchReader.click();
    await zoomPage.locator('.a4-reader').waitFor({ state: 'visible' });
    const readerEntry = await zoomPage.evaluate(async () => {
      const { stateManager } = await import('/src/core/stateManager.ts');
      return stateManager.getState().modules.act4.stage;
    });
    assert.equal(readerEntry, 'T01', 'the reader check enters through the visible Act4 launch control');
    const readerArtState = await zoomPage.locator('.a4-reader__art').evaluate((art) => ({
      buttonCount: art.querySelectorAll('button').length,
      imageSource: art.querySelector('img')?.getAttribute('src') ?? null,
      text: art.textContent?.trim() ?? '',
    }));
    assert.equal(readerArtState.buttonCount, 1, `T01 illustration zoom control should be available: ${JSON.stringify(readerArtState)}`);
    await zoomPage.locator('.a4-reader__art button').waitFor({ state: 'visible' });
    await zoomPage.waitForFunction(() => {
      const image = document.querySelector('.a4-reader__art img');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    await zoomPage.locator('.a4-reader__art button').click();
    await zoomPage.waitForFunction(() => {
      const image = document.querySelector('.a4-reader__zoom img');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    const readerImage = await zoomPage.locator('.a4-reader__zoom img').evaluate((image) => {
      const rect = image.getBoundingClientRect();
      return { fit: getComputedStyle(image).objectFit, natural: [image.naturalWidth, image.naturalHeight], rect: [rect.width, rect.height] };
    });
    assert.equal(readerImage.fit, 'contain');
    assert.ok(readerImage.natural[0] > 0 && readerImage.natural[1] > 0);
    assert.ok(Math.abs((readerImage.rect[0] / readerImage.rect[1]) / (readerImage.natural[0] / readerImage.natural[1]) - 1) < 0.005);
    await zoomPage.screenshot({ path: resolve(evidenceDirectory, 'act4-reader-zoom-dpr2-960x540.png') });
    await zoomPage.keyboard.press('Escape');
    await zoomPage.locator('.a4-reader__zoom').waitFor({ state: 'detached' });
    const readerFocusRestored = await zoomPage.locator('.a4-reader__art button').evaluate((button) => button === document.activeElement);
    assert.equal(readerFocusRestored, true);
    report.representativeZoom = {
      cssViewport: '960x540', deviceScaleFactor: 2,
      equivalentLayout: '1920x1080 at 200% layout scale; CSS viewport simulation, not native browser-menu zoom',
      t07PhotoMaxZoom: finaleZoom,
      act3T07MaxZoom: act3Zoom,
      act3T07HotspotOffsetPx: Math.max(...act3Hotspots.flatMap((item) => [item.dx, item.dy])),
      act4ReaderIllustration: { ...readerImage, escapeRestoredFocus: readerFocusRestored },
    };
    await zoomPage.close();
  }
  // Lifecycle checks on real route-driven PhotoViewport replacement: slow load keeps the text entry usable,
  // a failed asset exposes the same fallback, then the next lens recovers and remeasures after resize.
  const lifecycleState = structuredClone(a3Exit);
  lifecycleState.game.flags.FLAG_A3_COMPLETE = false;
  lifecycleState.game.flags.FLAG_A3_SITE_EXITED = false;
  lifecycleState.modules.act3.stage = 'T00';
  lifecycleState.modules.act3.currentLensId = 'LENS_A3_T00_001';
  lifecycleState.modules.act3.visitedLensIds = ['LENS_A3_T00_001'];
  lifecycleState.modules.act3.inspectedClueIds = stageDocuments[0].lenses.flatMap((lens) => lens.hotspots.map((hotspot) => hotspot.clueId));
  await page.evaluate((fixture) => localStorage.setItem('anchao.save.v1', JSON.stringify(fixture)), lifecycleState);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.act3-investigation__lens[data-asset-id="IMG_A3_T00_001"]').waitFor({ state: 'visible' });
  const slowUrl = await page.evaluate(async () => {
    const { assetLoader } = await import('/src/core/assetLoader.ts');
    return assetLoader.get('IMG_A3_T00_002')?.src ?? null;
  });
  assert.ok(slowUrl, 'T00_002 image asset must exist for the slow-load check');
  let delayedImageRequests = 0;
  const slowImagePath = new URL(slowUrl, baseUrl).pathname;
  const slowRouteMatcher = (url) => new URL(url).pathname === slowImagePath;
  await page.route(slowRouteMatcher, async (route) => {
    delayedImageRequests += 1;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 900));
    await route.continue();
  });
  await page.locator('[data-action-id="A3_ROUTE_T00_001_002"]').click();
  await page.locator('.act3-investigation__lens[data-asset-id="IMG_A3_T00_002"]').waitFor({ state: 'visible' });
  const slowFallback = page.locator('.photo-viewport__fallback button').first();
  await slowFallback.waitFor({ state: 'visible', timeout: 2000 });
  await page.locator('.photo-viewport__load-state').waitFor({ state: 'visible', timeout: 2000 });
  assert.match(await page.locator('.photo-viewport__load-state').innerText(), /正在载入/);
  const pendingImageState = await page.evaluate(() => [...document.querySelectorAll('.photo-viewport')].map((viewport) => ({
    assetId: viewport.closest('[data-asset-id]')?.getAttribute('data-asset-id'),
    loadState: viewport.querySelector('.photo-viewport__load-state')?.textContent,
    markerIds: [...viewport.querySelectorAll('.photo-viewport__plane [data-clue-id]')].map((marker) => marker.getAttribute('data-clue-id')),
    image: [...viewport.querySelectorAll('.photo-viewport__plane img')].map((image) => ({ key: image.getAttribute('data-resource-key'), complete: image.complete, naturalWidth: image.naturalWidth })),
  })));
  assert.equal(await page.locator('.photo-viewport__plane [data-clue-id]').count(), 0, `markers stay hidden before successful image load: ${JSON.stringify(pendingImageState)}`);
  const slowFallbackLabel = await slowFallback.innerText();
  await slowFallback.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '关闭特写，返回现场' }).click();
  await page.waitForFunction(() => {
    const image = document.querySelector('.photo-viewport__plane > img');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  assert.ok(delayedImageRequests >= 1, 'slow-load route must delay the actual photo request');
  await page.locator('.photo-viewport__fallback').waitFor({ state: 'detached' });
  await page.unroute(slowRouteMatcher);

  const brokenUrl = await page.evaluate(async () => {
    const { assetLoader } = await import('/src/core/assetLoader.ts');
    return assetLoader.get('IMG_A3_T00_003')?.src ?? null;
  });
  assert.ok(brokenUrl, 'T00_003 image asset must exist for the error-state check');
  expectedImageFailure.path = new URL(brokenUrl, baseUrl).pathname;
  const brokenImagePath = new URL(brokenUrl, baseUrl).pathname;
  const brokenRouteMatcher = (url) => new URL(url).pathname === brokenImagePath;
  await page.route(brokenRouteMatcher, (route) => route.abort());
  await page.locator('[data-action-id="A3_ROUTE_T00_002_003"]').click();
  await page.waitForFunction(() => document.querySelector('.photo-viewport__load-state')?.textContent?.includes('载入失败'));
  assert.equal(await page.locator('.photo-viewport__plane [data-clue-id]').count(), 0, 'failed image has no floating picture hotspots');
  assert.ok(await page.locator('.photo-viewport__fallback button').count() > 0, 'failed image retains a usable text entry');
  await page.screenshot({ path: resolve(evidenceDirectory, lifecycleOnly ? 'lifecycle-act3-image-error-fallback-1920x1080.png' : 'act3-image-error-fallback-1920x1080.png') });
  await page.unroute(brokenRouteMatcher);
  await page.locator('[data-action-id="A3_ROUTE_T00_003_004"]').click();
  await page.waitForFunction(() => document.querySelector('.act3-investigation__lens')?.getAttribute('data-asset-id') === 'IMG_A3_T00_004');
  await page.waitForFunction(() => {
    const image = document.querySelector('.photo-viewport__plane > img');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(80);
  const resizedGeometry = await page.locator('.photo-viewport__plane > img').evaluate((image) => {
    const imageRect = image.getBoundingClientRect();
    const frameRect = image.closest('.photo-viewport__frame')?.getBoundingClientRect();
    return { image: [imageRect.width, imageRect.height], frame: frameRect && [frameRect.width, frameRect.height], natural: [(image).naturalWidth, (image).naturalHeight], src: image.currentSrc };
  });
  assert.ok(resizedGeometry.image[0] > 0 && resizedGeometry.image[1] > 0, 'replacement lens refits at the resized viewport');
  assert.ok(Math.abs((resizedGeometry.image[0] / resizedGeometry.image[1]) / (resizedGeometry.natural[0] / resizedGeometry.natural[1]) - 1) < 0.005);
  report.lifecycle = {
    routeDrivenSwitches: ['T00_001→T00_002 (delayed image)', 'T00_002→T00_003 (failed image)', 'T00_003→T00_004 (recovery)'],
    slowLoadFallbackLabel: slowFallbackLabel,
    delayedImageRequests,
    failedImagePath: expectedImageFailure.path,
    failedImageRequestObserved: expectedImageFailure.requestFailed,
    failedImageFallback: 'text action available; image hotspots absent',
    recoveredLensAndResize: { viewport: '768x1024', ...resizedGeometry },
  };
  const expectedResourceErrorTexts = new Set([
    'Failed to load resource: the server responded with a status of 404 (Not Found)',
    'Failed to load resource: net::ERR_FAILED',
  ]);
  const unexpectedErrors = errors.filter((error) => {
    if (error.type !== 'console' || !error.url || !expectedImageFailure.path || !expectedResourceErrorTexts.has(error.text)) return true;
    try { return new URL(error.url).pathname !== expectedImageFailure.path; } catch { return true; }
  });
  assert.deepEqual(unexpectedErrors, [], 'unattributed browser runtime/resource errors');
  assert.equal(expectedImageFailure.requestFailed, true, 'exact broken photo URL must fail as injected');
  const summary = {
    result: 'PASS',
    school: lifecycleOnly
      ? { status: 'NOT RUN in lifecycle-only mode', viewportRuns: 0, locationsPerViewport: 0 }
      : { viewportRuns: report.school.length, locationsPerViewport: 8, timelineEvidenceAndInference: `clicked and selected at all ${report.school.length} viewport runs, including a 1920x920 viewport simulation` },
    act3: {
      status: lifecycleOnly ? 'DOM geometry sweep NOT RUN in lifecycle-only mode' : 'PASS',
      lenses: lifecycleOnly ? 0 : lensCount,
      breakpointsPerLens: lifecycleOnly ? 0 : viewports.length,
      domMeasurements: report.act3Lenses.length,
      maxImageRatioError: report.act3Lenses.length ? Math.max(...report.act3Lenses.map((item) => item.ratioError)) : null,
      everyImageRatioErrorBelow: lifecycleOnly ? null : 0.005,
      maxHotspotCenterOffsetPx: report.act3Lenses.length ? Math.max(...report.act3Lenses.map((item) => item.maxMarkerOffsetPx)) : null,
      hotspotCenterOffsetBelowPx: lifecycleOnly ? null : 1.5,
    },
    lifecycle: report.lifecycle,
    representativeZoom: report.representativeZoom ?? { status: 'NOT RUN in lifecycle-only mode' },
    unexpectedErrors,
    screenshots: lifecycleOnly
      ? ['lifecycle-act3-image-error-fallback-1920x1080.png']
      : [
          ...schoolViewports.filter(({ width, height }) => (width === 1920 && height === 1080) || width === 390).map(({ width, height }) => `school-${width}x${height}.png`),
          'school-1920x920.png',
          'act3-1920x1080.png', 'act3-390x844.png', 'act3-image-error-fallback-1920x1080.png',
          't07-photo-zoom-300-dpr2-960x540.png', 'act3-t07-zoom-300-dpr2-960x540.png', 'act4-reader-zoom-dpr2-960x540.png',
        ],
  };
  report.summary = summary;
  const reportName = lifecycleOnly ? 'ux-t07-ui-lifecycle-report.json' : 'ux-t07-ui-qa-report.json';
  await writeFile(resolve(evidenceDirectory, reportName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
