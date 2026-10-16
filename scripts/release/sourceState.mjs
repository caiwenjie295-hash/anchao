import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve, sep, join } from 'node:path';

export const ALLOWED_WINDOWS_MODE_ONLY_PATHS = new Set([
  'scripts/new-worktree.sh',
  'scripts/quality-gate.sh',
]);

const SOURCE_DIRECTORIES = ['src', 'data', 'public', 'scripts/startup'];
const SOURCE_FILES = ['index.html', 'package.json', 'package-lock.json', '.node-version', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'scripts/build-offline.mjs', 'scripts/release/sourceState.mjs'];
const normalize = (path) => path.split(sep).join('/');

function git(root, args, input) {
  const result = spawnSync('git', args, { cwd: root, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

function gitNulList(root, args) {
  return git(root, args).split('\0').filter(Boolean);
}

function headEntry(root, path) {
  const entry = git(root, ['ls-tree', '-z', 'HEAD', '--', path]).split('\0').find(Boolean);
  if (!entry) return null;
  const [metadata] = entry.split('\t');
  const [mode, type, object] = metadata.split(' ');
  return { mode, type, object };
}

function indexEntry(root, path) {
  const entry = git(root, ['ls-files', '-s', '-z', '--', path]).split('\0').find(Boolean);
  if (!entry) return null;
  const [metadata] = entry.split('\t');
  const [mode, object, stage] = metadata.split(' ');
  return stage === '0' ? { mode, object } : null;
}

async function fileExists(root, path) {
  try { await access(join(root, path)); return true; } catch { return false; }
}

async function getWorkingHash(root, path) {
  const contents = await readFile(join(root, path));
  const result = spawnSync('git', ['hash-object', `--path=${path}`, '--stdin'], { cwd: root, input: contents, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git hash-object failed for ${path}: ${result.stderr}`);
  return result.stdout.trim();
}

export async function inspectGitSource(rootDirectory = process.cwd()) {
  const root = resolve(rootDirectory);
  const changedTrackedPaths = gitNulList(root, ['diff', '--name-only', '-z', '--no-renames', 'HEAD', '--']).map(normalize);
  const untrackedPaths = gitNulList(root, ['ls-files', '--others', '--exclude-standard', '-z']).map(normalize);
  const contentDirtyPaths = [];
  const modeOnlyPaths = [];

  for (const path of changedTrackedPaths) {
    const head = headEntry(root, path);
    const index = indexEntry(root, path);
    const exists = await fileExists(root, path);
    const workingObject = exists ? await getWorkingHash(root, path) : null;
    const contentMatchesHead = head !== null && index !== null && exists
      && head.object === index.object && head.object === workingObject;
    if (!contentMatchesHead) {
      contentDirtyPaths.push(path);
      continue;
    }
    const summary = git(root, ['diff', '--summary', 'HEAD', '--', path]);
    if (/mode change\s+\d+\s+=>\s+\d+/.test(summary)) modeOnlyPaths.push(path);
    else contentDirtyPaths.push(path);
  }

  const inputFiles = await listSourceInputs(root);
  const indexed = new Set(gitNulList(root, ['ls-files', '-z']).map(normalize));
  const untrackedSourceInputs = inputFiles.filter((path) => !indexed.has(path));
  for (const path of untrackedSourceInputs) if (!untrackedPaths.includes(path)) untrackedPaths.push(path);

  return {
    gitSha: git(root, ['rev-parse', 'HEAD']).trim(),
    contentDirtyPaths: [...new Set(contentDirtyPaths)].sort(),
    untrackedPaths: [...new Set(untrackedPaths)].sort(),
    modeOnlyPaths: [...new Set(modeOnlyPaths)].sort(),
    sourceContentHash: await hashSourceInputs(root, inputFiles),
  };
}

async function listSourceInputs(root) {
  const paths = [];
  for (const directory of SOURCE_DIRECTORIES) {
    if (await fileExists(root, directory)) paths.push(...await listDirectory(join(root, directory), root));
  }
  for (const path of SOURCE_FILES) if (await fileExists(root, path)) paths.push(path);
  return [...new Set(paths)].sort();
}

async function listDirectory(directory, root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return listDirectory(absolute, root);
    if (entry.isFile()) return [normalize(relative(root, absolute))];
    return [];
  }));
  return nested.flat();
}

async function hashSourceInputs(root, files) {
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path);
    hash.update('\0');
    hash.update(await readFile(join(root, path)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export async function inspectReleaseSource(rootDirectory = process.cwd()) {
  const state = await inspectGitSource(rootDirectory);
  const unsupportedModeOnlyPaths = state.modeOnlyPaths.filter((path) => !ALLOWED_WINDOWS_MODE_ONLY_PATHS.has(path));
  return {
    ...state,
    clean: state.contentDirtyPaths.length === 0 && state.untrackedPaths.length === 0 && unsupportedModeOnlyPaths.length === 0,
    unsupportedModeOnlyPaths,
  };
}
