export type TestGroup = 'unit' | 'component' | 'acceptance';
export function collectTestInventory(rootDirectory?: string): Promise<string[]>;
export function groupForTest(path: string): TestGroup;
export function partitionTests(paths: string[]): Record<TestGroup, string[]>;
