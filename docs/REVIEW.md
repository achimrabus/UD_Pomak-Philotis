# Plan Review (Agent 2)

## Feasibility
- Dataset size (~87k tokens) fits comfortably in-memory; parsing + indexing in browser is reasonable.
- Vanilla JS with ES modules is fine; no build step needed. GitHub Pages can serve from `/docs` without extra tooling.
- Canvas/SVG for bars/dep-arcs is lightweight; no heavy libs required.

## Gaps / Risks / Adjustments
- **Load performance**: parsing all splits synchronously may stutter; use incremental chunk parsing or `requestIdleCallback`/setTimeout loops. Consider optional Web Worker later if UI jank appears.
- **Wildcard → regex**: ensure escaping to avoid catastrophic regex for user input; set a max pattern length and fallback to substring search on overly broad patterns.
- **Pagination**: default to modest page size (e.g., 20–30 sentences) and cap total rendered results to avoid DOM bloat; provide total hit count.
- **Collocations/PMI**: guard against zero counts; smoothing or filtering low-frequency items (min count) to avoid noisy results.
- **Charts**: cap top-k (e.g., 30 bars) for readability; allow export for full data.
- **FEATS parsing**: normalize missing values to `{}` and handle `|`-separated feats safely.
- **Dependency view**: plan for right-to-left arcs (head before dep) and overlapping arcs; use vertical stacking by distance.
- **Persistence**: if using localStorage, keep keys namespaced to avoid collisions and handle JSON parse errors.

## Acceptance tweaks
- Define minimal API for shared data (sentences, index) to avoid circular deps between modules.
- Add a small smoke test suite (script callable in browser console) to validate parsing and search filters.
- Provide a `docs/DEPLOY.md` with GH Pages steps after implementation.
- Include license notice + dataset attribution in footer.

Overall the plan is sound and implementable; the above adjustments should keep UX smooth and avoid edge-case bugs.
