import { describe, expect, it, vi } from 'vitest';
import { sha256, type StartupManifest, type StartupResource } from './preload';
import { StartupGroupReadiness } from './groupReadiness';

const bytesFor = (value: string) => new TextEncoder().encode(value);

async function manifestFixture() {
  const definitions: { path: string; body: string; groups: StartupResource['groups'] }[] = [
    { path: 'assets/shared.webp', body: 'shared', groups: ['shared'] },
    { path: 'assets/act3-a.webp', body: 'act3-a', groups: ['act3'] },
    { path: 'assets/act3-b.webp', body: 'act3-b', groups: ['act3'] },
    { path: 'assets/act4-a.webp', body: 'act4-a', groups: ['act4'] },
  ];
  const resources: StartupResource[] = await Promise.all(definitions.map(async ({ path, body, groups }) => {
    const bytes = bytesFor(body);
    return { path, bytes: bytes.length, sha256: await sha256(bytes), groups };
  }));
  const groupIds = ['shared', 'act1', 'act2', 'act3', 'act4'] as const;
  const groups = Object.fromEntries(groupIds.map((group) => {
    const members = resources.filter((resource) => resource.groups.includes(group));
    return [group, { resources: members.length, totalBytes: members.reduce((sum, resource) => sum + resource.bytes, 0) }];
  })) as StartupManifest['groups'];
  return { manifest: { schema: 2, version: 'a'.repeat(64), base: '/AnChao/', totalBytes: resources.reduce((sum, resource) => sum + resource.bytes, 0), groups, resources } satisfies StartupManifest, resources, bodies: new Map(definitions.map(({ path, body }) => [path, bytesFor(body)])) };
}

describe('startup group readiness', () => {
  it('promotes selected work without losing the running background slot accounting', async () => {
    const fixture = await manifestFixture();
    const shared = fixture.resources.find(({ path }) => path.endsWith('shared.webp'))!;
    const started: string[] = [];
    const releases = new Map<string, (response: Response) => void>();
    let active = 0, peak = 0;
    const fetcher = vi.fn(async (url: string) => {
      const path = new URL(url).pathname.slice('/AnChao/'.length);
      started.push(path);
      active += 1;
      peak = Math.max(peak, active);
      return new Promise<Response>((resolve) => {
        releases.set(path, (response) => { active -= 1; resolve(response); });
      });
    }) as unknown as typeof fetch;
    const readiness = new StartupGroupReadiness({
      manifest: fixture.manifest,
      base: new URL('https://example.test/AnChao/'),
      initialResources: [shared],
      fetcher,
    });

    readiness.startBackgroundPrefetch();
    await vi.waitFor(() => expect(started).toContain('assets/act3-a.webp'));
    expect(started).not.toContain('assets/act4-a.webp');

    let act3Ready = false;
    void readiness.requestAct(3).then(() => { act3Ready = true; });
    await vi.waitFor(() => expect(started).toContain('assets/act3-b.webp'));
    releases.get('assets/act3-a.webp')!(new Response(fixture.bodies.get('assets/act3-a.webp')));
    await vi.waitFor(() => expect(started).toContain('assets/act4-a.webp'));
    releases.get('assets/act3-b.webp')!(new Response(fixture.bodies.get('assets/act3-b.webp')));
    await vi.waitFor(() => expect(act3Ready).toBe(true));
    releases.get('assets/act4-a.webp')!(new Response(fixture.bodies.get('assets/act4-a.webp')));
    await vi.waitFor(() => expect(readiness.getSnapshot(4).state).toBe('ready'));

    expect(peak).toBeLessThanOrEqual(2);
    expect(started).toEqual(['assets/act3-a.webp', 'assets/act3-b.webp', 'assets/act4-a.webp']);
    expect(readiness.getSnapshot(4)).toBe(readiness.getSnapshot(4));
  });
});
