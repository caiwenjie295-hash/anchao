import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectTestInventory, groupForTest, partitionTests } from '../../scripts/quality/testInventory.mjs';
import { inspectReleaseSource } from '../../scripts/release/sourceState.mjs';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('quality gate discovery and release source checks', () => {
  it('assigns every discovered src/docs test to exactly one runner group and keeps browser fixtures in jsdom', async () => {
    const tests = await collectTestInventory();
    const groups = partitionTests(tests);
    const union = [...groups.unit, ...groups.component, ...groups.acceptance];
    const requiredFixtures = [
      'docs/ux-casepath-20261003/validation/fixtureCheckpoints.test.ts',
      'docs/ux-casepath-20261003/validation/fixtureStorage.test.ts',
      'docs/ux-layout-20261003/validation/fixtureStorage.test.ts',
      'docs/ux-narr-20261002/a34/fixtureStorage.test.ts',
    ];

    expect(new Set(union).size).toBe(union.length);
    expect(union.slice().sort()).toEqual(tests);
    expect(tests).toEqual(expect.arrayContaining(requiredFixtures));
    expect(requiredFixtures.every((path) => groupForTest(path) === 'component')).toBe(true);
    expect(tests.filter((path) => path.includes('.acceptance.test.')).every((path) => groupForTest(path) === 'acceptance')).toBe(true);
  });

  it('rejects a dirty release checkout when tracked source content changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'anchao-release-check-'));
    temporaryDirectories.push(root);
    const runGit = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    runGit('init', '-b', 'main');
    runGit('config', 'user.email', 'codex-test@example.invalid');
    runGit('config', 'user.name', 'Codex quality test');
    await writeFile(join(root, 'source.txt'), 'committed\n');
    runGit('add', 'source.txt');
    runGit('commit', '-m', 'baseline');
    await writeFile(join(root, 'source.txt'), 'uncommitted change\n');

    const releaseState = await inspectReleaseSource(root);
    expect(releaseState.clean).toBe(false);
    expect(releaseState.contentDirtyPaths).toContain('source.txt');
    await writeFile(join(root, 'source.txt'), 'committed\n');
    await writeFile(join(root, 'untracked.txt'), 'not in git\n');
    const untrackedState = await inspectReleaseSource(root);
    expect(untrackedState.clean).toBe(false);
    expect(untrackedState.untrackedPaths).toContain('untracked.txt');
  });

  it('allows only the documented Windows mode-only script difference and catches content edits to that script', async () => {
    const root = await mkdtemp(join(tmpdir(), 'anchao-release-mode-check-'));
    temporaryDirectories.push(root);
    const scriptPath = 'scripts/quality-gate.sh';
    await mkdir(join(root, 'scripts'), { recursive: true });
    await writeFile(join(root, scriptPath), '#!/usr/bin/env bash\nexit 0\n');
    const runGit = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    runGit('init', '-b', 'main');
    runGit('config', 'user.email', 'codex-test@example.invalid');
    runGit('config', 'user.name', 'Codex quality test');
    runGit('config', 'core.filemode', 'true');
    runGit('add', scriptPath);
    runGit('update-index', '--chmod=+x', scriptPath);
    runGit('commit', '-m', 'baseline');
    runGit('update-index', '--chmod=-x', scriptPath);

    const modeOnly = await inspectReleaseSource(root);
    expect(modeOnly.modeOnlyPaths).toContain(scriptPath);
    expect(modeOnly.clean).toBe(true);

    await writeFile(join(root, scriptPath), '#!/usr/bin/env bash\nexit 1\n');
    const changedContent = await inspectReleaseSource(root);
    expect(changedContent.contentDirtyPaths).toContain(scriptPath);
    expect(changedContent.clean).toBe(false);
  });

  it('returns a failing exit code when the unified quality gate receives an invalid base ref', () => {
    const gate = spawnSync(process.execPath, ['scripts/quality-gate.mjs', '--base-ref=ref-maint-test-ref-does-not-exist'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(gate.error).toBeUndefined();
    expect(gate.status).toBeGreaterThan(0);
  });
});
