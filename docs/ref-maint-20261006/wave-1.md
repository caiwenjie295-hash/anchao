# REF-MAINT-20261006 · Wave 1 delivery

Wave 1 isolates save access, classifies startup failures, preserves recoverable records, adds a React render boundary, and makes the local/CI/release checks discoverable from one Node entry point. It leaves story rules, text, assets, flags, normal interaction layout, and serialized schema 13 unchanged.

## Boundaries

```text
React recovery/settings UI
          ↓
      StateManager ─── event bus and existing UI lifecycle events
          ↓
       SaveManager ─── validation, legacy hydration, schema 13 encoding
          ↓
 SaveStoragePort / browser localStorage
```

`SaveStoragePort` is the small platform seam in `src/core/persistence/browserStorage.ts`. Storage lookup is lazy because even reading `window.localStorage` may throw. `SaveManager` owns classification, envelope checks, hydration, primary writes, and the two bounded auxiliary keys. `StateManager` keeps its existing game actions and schedules writes as before when recovery is not pending.

The reader reports `empty`, `loaded`, `corrupt`, `unsupported-version`, or `unavailable`. Existing schema-version constants and hydration rules are unchanged. The targeted migration check loads schema 6 into schema 13; schema 13 round-trips normally; schema 14 is classified unsupported. Existing schema-7 hydration coverage remains unchanged and this wave does not add a migration for it.

| Read/write situation | Player progress and primary key | Recovery action |
| --- | --- | --- |
| Valid primary | Normal save behavior; last valid primary is copied to one backup before replacement | Restore the recent valid backup if needed |
| Empty primary with a valid backup | In-memory progress is kept; refresh can safely save it without deleting the backup | Choose the valid backup explicitly |
| Malformed or unsupported primary | Temporary play remains in memory; ordinary actions, deferred writes, and reset do not replace the primary | Export the exact raw text, restore the valid backup, or confirm a restart |
| Storage unavailable | Temporary progress remains in memory; failed protection leaves the primary untouched | Retry after storage returns; an empty key saves the in-memory progress, while a newly found device save requires a separate confirmation |
| A different raw record already occupies the recovery key | No primary replacement | Export both raw records, acknowledge replacement, then retry the selected operation |

Successful import and backup restore cancel pending timers, replace in-memory state, and emit the existing `save:completed` and `save:imported` events. Explicit restart emits `progress:reset` and `save:completed`. If storage returns with a different valid device save, the current in-memory progress stays active until the player confirms switching; the switch synchronizes the same import events used by existing controllers. The previous abnormal text stays in the bounded recovery key and remains exportable from Settings after recovery.

`RuntimeErrorBoundary` covers React descendant render and lifecycle errors only. It logs the component stack, offers retry/remount and record export with visible failure feedback, and does not claim that storage is available. Event-handler, promise, and background errors remain handled at their own boundaries; the boundary does not mark an action successful or reset progress.

The startup recovery surface is an ARIA modal dialog: it takes initial focus, contains keyboard Tab focus, and changes to a compact, reachable recovery entry when the player chooses temporary play.

## Checks and release steps

`.node-version` pins Node `24.15.0`; `package.json` requires the same Node version and npm `>=11.8.0 <12`. Use that Node version and a compatible npm before running `npm ci`. The workflow reads this pin and runs `npm ci` on both `ubuntu-latest` and `windows-latest`, then invokes `npm run quality:gate`.

`scripts/quality/testInventory.mjs` discovers tests below `src`, `docs`, and `scripts`, then assigns each discovered path to one group exactly once. At the wave 1 freeze, the inventory was 82 tests: 24 unit, 52 component, and 6 acceptance. The current count must be taken from `collectTestInventory`; do not hand-maintain or infer group totals here. The four docs storage/window fixtures remain in the jsdom component group.

Run `npm run quality:gate` for development checks. It verifies branch/path hygiene when given a base ref, the Node pin, test partition, TypeScript, all three test groups, online build, offline build and gameplay verification, package integrity/150 MiB budget, and browser smoke. Run `npm run quality:release` from the reviewed source commit for the additional clean-source check before producing a release package. The source checker compares content independently from mode bits. It reports and permits only the existing Windows mode-only differences in `scripts/new-worktree.sh` and `scripts/quality-gate.sh`; actual content edits, additions, deletions, or unexpected mode-only paths still fail. The offline manifest retains its existing fields and adds Node/npm/platform metadata, source content SHA-256 and dirty-path details, plus per-file SHA-256 values. The package verifier checks path containment, file size/hash, manifest totals, commit identity, and source hash.

The CI uses the major tags from GitHub's official Node workflow example: `actions/checkout@v6` and `actions/setup-node@v7`. GitHub's [Node.js build and test guidance](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) also documents `npm ci`; published action releases include [checkout v6.0.3](https://github.com/actions/checkout/releases/tag/v6.0.3) and [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0). The remote workflow is configured but has not been run in this delivery.

## Wave 1 verification record

On 2026-10-06, the directed local run passed 8 test files / 50 tests across save classification/migration, recovery conflict protection and timer cancellation, import/restore/reset event behavior, runtime boundary recovery, modal focus/reopen behavior, export after successful restore, inventory partitioning, release dirty-source checks, and non-zero gate failure. `tsc --noEmit -p tsconfig.app.json`, `tsc -b`, and `scripts/quality/verify-node-version.mjs` passed. `scripts/build-offline.mjs` produced 155 files (42.03 MiB), and `scripts/release/verify-offline-package.mjs` passed with the package linked to source commit `08d61844`.

Those 2026-10-06 measurements were performed with the then-pinned Node `24.13.1`; the current supported local and CI pin is `24.15.0`, selected to satisfy the engines range of the already-locked jsdom 30.1.0 dependency tree. No dependency versions or lockfile package integrity/resolved entries changed.

The initial sandbox attempt for Vite's offline build hit Windows `spawn EPERM`; the identical targeted build was rerun successfully with the authorized process permission. The full four-gate combination, complete offline gameplay verification, browser smoke, cross-platform CI, and release from a clean reviewed commit remain for the parent acceptance node. No commercial certification or release approval is claimed here.
