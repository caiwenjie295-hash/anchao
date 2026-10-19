import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareStartup } from './prepareStartup';
import { sha256, type StartupGroup, type StartupManifest } from './preload';
import { StateManager, stateManager } from '../core/stateManager';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import type { AppState } from '../core/types';
import fixtureSeeds from '../../docs/ui-field-20261019/fixture/memory-storage-seeds.json';

const version = 'a'.repeat(64);
function shell(useFakeTimers = true) {
  document.head.innerHTML = `<meta name="anchao-preload-version" content="${version}">`;
  document.body.innerHTML = '<div id="anchao-startup"><p id="anchao-startup-copy"></p><div role="progressbar"><div id="anchao-startup-fill"></div></div><p id="anchao-startup-progress"></p><p id="anchao-startup-total"></p><p id="anchao-startup-loaded"></p><p id="anchao-startup-speed"></p><p id="anchao-startup-detail"></p><button id="anchao-startup-retry"></button></div>';
  vi.stubEnv('PROD', true);
  vi.stubEnv('BASE_URL', '/AnChao/');
  if (useFakeTimers) vi.useFakeTimers();
}
async function manifest(): Promise<StartupManifest> {
  const bytes = new TextEncoder().encode('photo');
  const groups = Object.fromEntries(['shared', 'act1', 'act2', 'act3', 'act4'].map((group) => [group, { resources: 1, totalBytes: bytes.length }])) as Record<string, { resources: number; totalBytes: number }>;
  return { schema: 2, version, base: '/AnChao/', totalBytes: bytes.length, groups, resources: [{ path: 'assets/photo.webp', bytes: bytes.length, sha256: await sha256(bytes), groups: ['shared', 'act1', 'act2', 'act3', 'act4'] }] };
}
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks();
  document.body.innerHTML = ''; document.head.innerHTML = '';
});

async function groupedManifest() {
  const definitions: StartupGroup[] = ['shared', 'act1', 'act2', 'act3', 'act4'];
  const bodies = new Map<string, Uint8Array>();
  const resources = await Promise.all(definitions.map(async (group) => {
    const path = `assets/${group}.webp`;
    const body = new TextEncoder().encode(`resource:${group}`);
    bodies.set(path, body);
    return { path, bytes: body.byteLength, sha256: await sha256(body), groups: [group] };
  }));
  const groupSummaries = Object.fromEntries(definitions.map((group) => {
    const resource = resources.find((item) => item.groups.includes(group))!;
    return [group, { resources: 1, totalBytes: resource.bytes }];
  })) as StartupManifest['groups'];
  const manifest: StartupManifest = {
    schema: 2, version, base: '/AnChao/', totalBytes: resources.reduce((sum, resource) => sum + resource.bytes, 0),
    groups: groupSummaries, resources,
  };
  return { manifest, bodies };
}

function fixtureState(scenario: keyof typeof fixtureSeeds.scenarios): AppState {
  return JSON.parse(fixtureSeeds.scenarios[scenario]['anchao.save.v1']) as AppState;
}

class MemoryStorage {
  private readonly values: Map<string, string>;
  constructor(entries: Record<string, string>) { this.values = new Map(Object.entries(entries)); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function installGroupedFetcher(fixture: Awaited<ReturnType<typeof groupedManifest>>, requested: string[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('anchao-preload-manifest.json')) return new Response(JSON.stringify(fixture.manifest));
    const path = new URL(url).pathname.slice('/AnChao/'.length);
    requested.push(path);
    const body = fixture.bodies.get(path);
    if (!body) return new Response('missing', { status: 404 });
    return new Response(body as Uint8Array<ArrayBuffer>);
  }));
}

describe('startup gate', () => {
  it('reloads the T05 field-notes fixture with the first-act double-S discovery intact', () => {
    const manager = new StateManager(new EventBus(), undefined, new MemoryStorage(fixtureSeeds.scenarios['act2-t05-school']));
    const restored = manager.getState();
    expect(restored.schemaVersion).toBe(13);
    expect(restored.game.phase).toBe('A2_T05');
    expect(restored.modules.act2Research.stage).toBe('school');
    expect(restored.game.flags.FLAG_A1_SS_FOUND).toBe(true);
  });

  it.each(['act2-t06-institution-search', 'act2-t06-people-known'] as const)('reloads the legal %s schema-13 fixture into qiming', (scenario) => {
    const saved = fixtureSeeds.scenarios[scenario];
    const manager = new StateManager(new EventBus(), undefined, new MemoryStorage(saved));
    const restored = manager.getState();
    expect(restored.schemaVersion).toBe(13);
    expect(restored.modules.act2Research.stage).toBe('qiming');
    expect(restored.game.phase).toBe('A2_T06');
    expect(restored.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    expect(restored.modules.act2Research.school.visitedAreaIds).toEqual([
      'AREA_A2_T05_TEACHER_OFFICE', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_XIAOA_CLASSROOM',
    ]);
    expect(restored.modules.act2Research.school.inspectedHotspotIds).toEqual([
      'HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE',
    ]);
    if (scenario === 'act2-t06-people-known') {
      expect(restored.modules.browser.visitedPageIds).toEqual(['PAGE_A2_T06_001', 'PAGE_A2_T06_004']);
      expect(restored.game.flags.FLAG_A2_QIMING_OFFICIAL_FOUND).toBe(true);
      expect(restored.game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ).toBe(true);
    }
  });

  it('enters after shared plus acts one and two only; unavailable later-act resources stay out of the first batch', async () => {
    shell(false);
    const fixture = await groupedManifest();
    const requested: string[] = [];
    installGroupedFetcher(fixture, requested);
    vi.spyOn(stateManager, 'getState').mockReturnValue(createDefaultState());

    const startup = prepareStartup();
    await startup;

    expect([...requested].sort()).toEqual(['assets/act1.webp', 'assets/act2.webp', 'assets/shared.webp']);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toContain('准备就绪');
  });

  it.each([
    ['act3-resume-t00', 'assets/act3.webp'],
    ['act4-resume-t01', 'assets/act4.webp'],
  ] as const)('loads a legal %s save from shared plus its current-act resources', async (scenario, currentActPath) => {
    shell(false);
    const fixture = await groupedManifest();
    const requested: string[] = [];
    installGroupedFetcher(fixture, requested);
    vi.spyOn(stateManager, 'getState').mockReturnValue(fixtureState(scenario));

    const startup = prepareStartup();
    await startup;

    expect([...requested].sort()).toEqual(['assets/shared.webp', currentActPath].sort());
    expect(document.getElementById('anchao-startup-copy')?.textContent).toContain('准备就绪');
  });

  it('keeps moving below completion during a slow download, exposes retry on failure, and enters only after real success', async () => {
    const list = await manifest();
    shell();
    let finish: ((response: Response) => void) | undefined;
    let first = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('anchao-preload-manifest.json')) return new Response(JSON.stringify(list));
      if (first) return new Promise<Response>((resolve) => { finish = resolve; });
      return new Response('photo');
    }));
    let entered = false;
    const ready = prepareStartup().then(() => { entered = true; });
    // Keep the connection active window under the 60s idle timeout. A fetch
    // promise that never settles now correctly triggers an automatic retry.
    await vi.advanceTimersByTimeAsync(30_000);
    const shown = Number(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'));
    expect(shown).toBeGreaterThan(3);
    expect(shown).toBeLessThanOrEqual(95);
    expect(entered).toBe(false);
    expect(document.getElementById('anchao-startup-total')?.textContent).toBe('0.00 MB');
    expect(document.getElementById('anchao-startup-loaded')?.textContent).toBe('0.00 MB');
    expect(document.getElementById('anchao-startup-speed')?.textContent).toBe('0.0 KB/s');
    finish!(new Response('missing', { status: 404 }));
    await vi.advanceTimersByTimeAsync(1);
    const retry = document.getElementById('anchao-startup-retry') as HTMLButtonElement;
    expect(retry.hidden).toBe(false);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toContain('加载暂时中断');
    expect(document.getElementById('anchao-startup-detail')?.textContent).toContain('HTTP 404');
    expect(document.getElementById('anchao-startup-detail')?.textContent).toContain('assets/photo.webp');
    expect(document.getElementById('anchao-startup-total')?.textContent).toBe('0.00 MB');
    expect(document.getElementById('anchao-startup-loaded')?.textContent).toBe('0.00 MB');
    expect(document.getElementById('anchao-startup-speed')?.textContent).toBe('0.0 KB/s');
    expect(entered).toBe(false);
    first = false;
    retry.click();
    await vi.advanceTimersByTimeAsync(500);
    await ready;
    expect(entered).toBe(true);
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('requests a page refresh rather than retrying a new manifest against an old app version', async () => {
    const list = await manifest();
    shell();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...list, version: 'b'.repeat(64) }))));
    let entered = false;
    void prepareStartup().then(() => { entered = true; });
    await vi.advanceTimersByTimeAsync(1);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toBe('页面已更新，请刷新后继续。');
    expect(document.getElementById('anchao-startup-retry')?.textContent).toBe('刷新页面');
    expect(entered).toBe(false);
  });

  it('does not fetch a nonexistent web manifest in development or an offline entry without the shell', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await prepareStartup();
    shell();
    vi.stubEnv('PROD', false);
    await prepareStartup();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires refresh if an entry stylesheet failed, rather than mounting an unstyled game after a warmup', async () => {
    shell();
    document.getElementById('anchao-startup')!.dataset.entryError = 'true';
    vi.stubGlobal('fetch', vi.fn());
    let entered = false;
    void prepareStartup().then(() => { entered = true; });
    await vi.advanceTimersByTimeAsync(1);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toBe('页面未能完整加载，请刷新后重试。');
    expect(document.getElementById('anchao-startup-retry')?.textContent).toBe('刷新页面');
    expect(entered).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
