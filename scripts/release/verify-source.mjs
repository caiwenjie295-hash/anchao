import { inspectReleaseSource } from './sourceState.mjs';

const state = await inspectReleaseSource();
console.log(`Source commit: ${state.gitSha}`);
console.log(`Source content SHA-256: ${state.sourceContentHash}`);
if (state.modeOnlyPaths.length) console.log(`Allowed platform mode-only paths: ${state.modeOnlyPaths.join(', ')}`);
if (state.contentDirtyPaths.length) console.error(`Changed tracked content: ${state.contentDirtyPaths.join(', ')}`);
if (state.untrackedPaths.length) console.error(`Untracked paths: ${state.untrackedPaths.join(', ')}`);
if (state.unsupportedModeOnlyPaths.length) console.error(`Unexpected mode-only paths: ${state.unsupportedModeOnlyPaths.join(', ')}`);
if (!state.clean) {
  console.error('Release verification requires a committed source tree. Commit reviewed changes before building the release package.');
  process.exit(1);
}
console.log('PASS: release source tree is clean apart from the recorded Windows mode-only scripts.');
