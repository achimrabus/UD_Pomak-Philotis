# Universal Dependencies Corpus Viewer — Plan (Agent 1)

## Goals
- Build a static, vanilla JS app to explore Pomak UD (CONLL-U) corpora on GitHub Pages.
- Support traditional search (exact, substring, regex-like wildcard), n-grams, collocations, bar plots, and annotation-based filters (UPOS, FEATS, DEPREL, LEMMA, FORM).
- Phase 2: add dependency visualization for selected sentences/tokens.
- Keep everything client-side; no backend.

## Data & assumptions
- Input: `qpm_philotis-ud-{train,dev,test}.conllu` (≈6.3k sentences, ~87k tokens total). Fits in memory in modern browsers.
- Licensing: CC BY-NC-SA 4.0 (non-commercial); include notice in UI/footer.
- Encoding: UTF-8; keep ASCII in code/comments.

## High-level user flows
1. Load corpus (default loads all splits; optional toggle per split).
2. Search tokens by text/lemma with simple wildcards (`*` any chars, `?` single) and case options.
3. Filter by annotations (UPOS, DEPREL, FEATS key/values, XPOS if present) and sentence metadata.
4. View results as sentences with highlighted matches; paginate.
5. Inspect n-grams (uni/bi/tri+; configurable window) over selected subset or search result.
6. Collocations: compute association scores (PMI or t-score) for a target token/lemma and window size.
7. Bar plots: frequencies per POS, lemma, feature value, or custom grouping; rendered with minimal canvas/SVG.
8. Dependency view (phase 2): render arcs for a chosen sentence; allow selecting tokens from search results.

## Feature breakdown
- **Corpus loader**: fetch CONLL-U files, parse to in-memory JSON (sentences → tokens). Provide progress indicator.
- **Indexing**: build lightweight inverted index keyed by lowercase `form` and `lemma`; store positions (sentence id, token id). Precompute POS counts.
- **Search**:
  - Query grammar: plain string with wildcards `*`/`?`; optionally treat as regex; flags: match lemma/form, case-insensitive default.
  - Apply annotation filters: UPOS list, DEPREL list, FEATS contains key/value, sentence length range.
  - Output: list of sentence ids with matched token indices; paginate.
- **N-grams**:
  - Generate n-grams (n=1–5) over chosen scope (entire corpus or filtered subset).
  - Show frequency table with sorting and export (TSV/JSON download).
- **Collocations**:
  - Input target token/lemma; window size k; compute co-occurrence counts.
  - Score via PMI (log2) and t-score; show top-N with counts.
- **Bar plots**:
  - Quick frequency charts for POS, top lemmas/forms, FEATS values.
  - Use `<canvas>` or inline SVG; no external libs.
- **Dependency view (Phase 2)**:
  - Render sentence tokens horizontally with arcs from HEAD to dependent; use basic SVG.
  - Highlight selected token and its subtree.

## Architecture
- **Static layout**: single-page app; sections/tabs: Load, Search, N-grams, Collocations, Charts, Dependency.
- **Modules (vanilla JS)**:
  - `data/conllu.js`: parse CONLL-U text → JS objects (sentences, tokens, metadata).
  - `data/index.js`: build inverted index and stats.
  - `search.js`: query parsing, filtering, result shaping.
  - `ngrams.js`: compute n-grams and counts.
  - `collocations.js`: co-occurrence and PMI/t-score.
  - `charts.js`: small chart helpers (bar, top-k).
  - `depview.js` (phase 2): dependency arc rendering.
  - `ui.js`: DOM bindings, event wiring, pagination, downloads.
  - `state.js`: app state (loaded splits, filters, results) in-memory; optional localStorage for last-used settings.
- **Styling**: minimal CSS; ensure responsive design; light theme default.
- **No build step**: plain HTML/CSS/JS; optional ES modules.

## Data structures
- Sentence: `{ id, split, text, tokens: [{id, form, lemma, upos, xpos, feats: {k:v}, head, deprel, misc}], meta }`.
- Index: `{ formToHits: Map<string, Hit[]>, lemmaToHits: Map<string, Hit[]>, uposCounts, formCounts, lemmaCounts }` with `Hit = {sid, tid}`.

## Algorithms (sketch)
- Wildcards → regex: escape string, replace `*`→`.*`, `?`→`.`; anchor full token unless substring mode.
- Filtering: iterate hits, test annotation predicates; collect unique sentence ids.
- N-grams: iterate tokens in-order; skip punctuation if option; use `Map` keyed by joined tokens.
- Collocations: for each occurrence of target, gather window tokens; count co-occurrences; compute PMI using total tokens and marginal counts.
- Charts: take frequency maps, slice top-K, render bars via scaled heights.
- Dependency arcs: compute x-positions per token; draw cubic/quadratic curves in SVG; color by relation.

## UI sketch
- Header: title + license note.
- Sidebar controls:
  - Corpus load buttons per split; progress text; counts.
  - Search box + mode (form/lemma, whole token vs substring, case toggle, wildcard hint).
  - Annotation filters (multi-select UPOS/DEPREL; FEATS key/value input; sentence length slider).
  - Buttons: Run search, Reset.
  - N-gram controls: n, scope (all vs results), stoplist toggle.
  - Collocation controls: target, window, measure.
  - Charts: preset buttons (POS, top lemmas/forms, FEATS value).
- Main panel (tabs):
  - Search results: sentences with highlights; pagination; download matches.
  - N-grams table; download.
  - Collocations table; download.
  - Charts view (bar plot).
  - Dependency: sentence selector + SVG rendering.

## Performance & UX notes
- Load sequentially per split to keep UI responsive; show progress.
- Lazy-build indexes after initial parse; reuse for all views.
- Memoize expensive computations (n-grams, collocations) per scope.
- Keep DOM updates batched; use `requestAnimationFrame` for charts.

## Testing/validation
- Unit-like helpers via browser console or simple assertions in dev mode.
- Spot-check counts against CONLL-U subsets.
- Validate wildcard search with edge cases (`*`, `?`, escaping).

## Deployment (GitHub Pages)
- Keep site in root or `/docs` folder; enable Pages from `master` → `/docs` or `/`.
- Provide `index.html`, `assets/` JS/CSS, and data files (`.conllu`).
- Add `README_PAGES.md` with run instructions.

## Milestones
1. M0: Parse CONLL-U, load UI skeleton, basic search and display.
2. M1: N-grams, collocations, bar charts; polish filters/pagination.
3. M2: Dependency visualization; finalize styling; GH Pages publish.
