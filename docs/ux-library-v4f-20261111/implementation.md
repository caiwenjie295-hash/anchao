# UX-LIBRARY-V4F-20261111 implementation record

## Integrated scope

- Integrated the user v4f patch into the 9d92-based branch without resetting or replacing the current tree. Patch SHA-256: `f5bcbc714e05770dbcc28ae02a441fdc8f53df23d02db820f2a56926c614c45a`.
- Resolved the `PhotoViewport.tsx` and `Act3Investigation.tsx` conflicts by retaining the old `investigationSpotlight` API for compatibility, enabling only the new `pointerSpotlight` for A3, and disabling the old mask in that mode.
- Per the user’s preference, retained the previously implemented Polaroid treatment: A3 `PolaroidPhoto` with `ClueDetailEvidence`, plus the A1 independent photo. The patch replacements `src/components/investigation/InvestigationDetail.tsx`, `src/components/investigation/InvestigationDetail.test.tsx`, and `src/design/polaroidCard.css` were excluded.
- Kept the A1 guidance/grid correction and A4 non-sticky pager from the current branch. `SHOW_FENGTUZHI_MISSING_PAGES` remains `true`.
- Kept the original public library images byte-for-byte. Vite URL imports from `LibraryResearch.tsx` and a relative CSS asset URL make the panorama and shelf image emit as hashed build assets; an initial production build emitted both successfully.
- Final book-frame compatibility is scoped to the new reader. It restores the gold background and shadow while clearing the legacy border; it leaves v4f book flow, spacing, size, and leaf layout to their own cascade rules.

## Commits

- `00cdebd` — integrate user library patch and resolve the two source conflicts.
- `bf39424`, `b1602cc`, `d78c321` — refine only the reader’s gold frame compatibility after production visual review. The final rule does not set book display, columns, width, max-width, gap, or padding.

## Deferred items and validation boundary

- The patch handoff’s seven additional observations remain unimplemented; this integration did not expand into further design work.
- `scripts/verify-offline.mjs` UI migration is now owned by the parent reviewer and is not included in this implementation. Existing offline route, business-state, two-round, no-network, and cleared-save assertions remain to be validated there.
- Parent reviewer owns production screenshots and the full offline/quality gate. No post-integration full gate or final visual acceptance is claimed here.
- Targeted validation after the final CSS adjustment: 5 test files passed, 71 tests passed (`LibraryResearch`, `TalesInvestigation`, `libraryEndmatter.pack`, `PhotoViewport.spotlight`, `Act3Investigation`). `git diff --check` passed for the CSS adjustments. The initial Vite production build passed before the final frame-only CSS refinements.
