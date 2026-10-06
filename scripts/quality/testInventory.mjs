import { readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const TEST_ROOTS = ['src', 'docs', 'scripts'];
const isTestFile = (path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

export async function collectTestInventory(rootDirectory = process.cwd()) {
  const root = resolve(rootDirectory);
  const files = (await Promise.all(TEST_ROOTS.map((directory) => listFiles(join(root, directory)))))
    .flat()
    .filter(isTestFile)
    .map((path) => relative(root, path).split(sep).join('/'))
    .sort();
  return files;
}

export function groupForTest(path) {
  const normalized = path.split('\\').join('/');
  const isUnit = normalized.startsWith('src/data/')
    || normalized.startsWith('src/core/persistence/')
    || normalized.startsWith('scripts/')
    || normalized.endsWith('src/core/assetLoader.test.ts')
    || normalized.endsWith('src/modules/browser/browserPresentation.test.ts');
  if (normalized.includes('.acceptance.test.')) return 'acceptance';
  return isUnit ? 'unit' : 'component';
}

export function partitionTests(paths) {
  return {
    unit: paths.filter((path) => groupForTest(path) === 'unit'),
    component: paths.filter((path) => groupForTest(path) === 'component'),
    acceptance: paths.filter((path) => groupForTest(path) === 'acceptance'),
  };
}
