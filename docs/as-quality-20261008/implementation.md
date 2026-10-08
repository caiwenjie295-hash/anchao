# AS-QUALITY-20261008 — implementation record

## Scope

Replaced the 19 approved scene sources listed in the frozen plan and their 19 matching WebP publication assets. The 129 other mapped photos remain untouched. IDs, filenames, image data, asset-map entries, scene geometry, story text, and application code were not edited.

Parent review covered the full contact sheets and selected assets at full resolution; all 19 entries were approved. The source visualReview records report reduced uniform fine-scale texture while preserving principal space, clues, people/hands, and camera placement. This execution did not claim pixel-level texture quantification.

## Asset handling

- PNG source files: copied the approved native PNG bytes as-is.
- JPG source files: converted the approved RGB PNGs to JPEG, quality 98, chroma subsampling 0 (4:4:4).
- WebP outputs: encoded from the final source files at quality 92, method 6.
- No resize, crop, filter, smoothing, denoising, or repaint operation.
- The 15 1448 × 1086 assets and 4 1672 × 941 assets retained their exact dimensions.
- Source and WebP paths continued to resolve through the existing asset-map entries; all 19 IDs were present in data/images.json.

The full prompt set is in prompts.md. Per-file before/after sizes and hashes are in replacement-ledger.md.

## Verification

- Runtime: Node v24.15.0, npm 11.12.1; portable Node directory prepended to PATH for npm commands.
- npm ci --engine-strict --prefer-offline --no-audit --no-fund: exit 0, 82 packages added.
- Image inspection/conversion: Python 3.13.11, Pillow 12.1.1 with WebP support.
- Pre-write checks: 19/19 approved entries; current source, current WebP, native, original backups, dimensions, and asset-map values matched the frozen plan.
- Post-write checks: 19/19 source formats and WebP formats correct, all dimensions preserved, all 19 IDs and asset-map values resolve; 8 PNG and 11 JPEG source files.
- npm run build: exit 0; TypeScript and Vite production build succeeded. Vite emitted its existing large-chunk advisory for the main JavaScript bundle.
- git diff --check: passed on tracked changes and again after staging the authorized image and documentation paths.

The initial sandboxed build attempt failed because Vite could not spawn its Windows helper (spawn EPERM). The same required build completed successfully when rerun with helper-process permission.

No unit/offline tests were added or run for this image-only change. Parent will run the full quality gates and browser checks.
