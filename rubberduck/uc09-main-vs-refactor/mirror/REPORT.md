# gfy main vs refactor — RubberDuck Mirror Pro Report

## §0 Envelope

| Field | Value |
|---|---|
| Mode | `rename-refactor` |
| Preserved contract | `observable-behavior` |
| Before | `main` at `4a8eb495c469dec9b34bc328f1b1e02ac6cdc0cd` |
| After | `refactor` at `c958da5bb995126f9777bae86c31f0fee9710e33` |
| Verdict | `NOT_EQUIVALENT` |
| Confidence | High for non-equivalence; medium-high for merge safety |

Scope includes UI behavior, deep-import TypeScript surface, network calls, caches, terminal image lifecycle, exceptions, scheduling, and test-suite compatibility. Live gfy.com and a real Kitty-capable terminal were not exercised.

## §1 Verdict

`refactor` is **not equivalent to `main` under the observable-behavior contract**. It contains two structural refactors plus three intentional product changes: tab selection moves from Ctrl+digits to plain digits, thread-list views combine two source pages, and list sizing follows allocated layout height. The image refactor also changes cache, network, and terminal-resource side effects.

## §2 Headline Divergence or Equivalence Basis

For a forum with at least two pages, `main` requests and displays page 1. `refactor` requests pages 1 and 2, merges and de-duplicates rows, changes the page label, and rejects the view if page 2 fails. Bun tests runtime-confirm the two-call and merge behavior. This is not a drop-in behavior-preserving refactor.

## §3 Input / Contract / Scope

- Branch delta: 23 files, 1,259 insertions, 464 deletions.
- Original paths retained byte-for-byte: 38 of 48 tracked `main` paths.
- Modified paths: 10; added paths: 13; deleted paths: 0.
- Five commits: reducer navigation, bounded image pipeline, shortcut change, two-page views, allocated-height list layout.
- Valid in-app tab actions are distinguished from malformed/deep-import calls.

## §4 Import and Module Context

| Area | BEFORE binding | AFTER binding | Behavior relevance |
|---|---|---|---|
| Tabs | React state/ref; mutable `Screen[]` | reducer/memo; readonly non-empty stack | Valid actions match; invalid inputs guarded; `replace` removed |
| Images | React, Sharp, fetch, Kitty helpers in one module | same dependencies split; adds `WeightedLru` | Visual algorithm retained; lifecycle changes |
| List | `useDimensions()` plus `chromeRows` | `BoxRenderable.height`, `onSizeChange`, `process.nextTick` | Visible row count changes |
| Threads | direct `VbClient.threads` | `loadThreadListView` over same method | One request becomes one or two |
| Root | `src/index.tsx` | unchanged | CLI boot remains shared |

## §5 Path Catalogue

See `evidence/path-catalogue-before.md` and `evidence/path-catalogue-after.md` for tab, image, list, and paging paths.

## §6 Path-Match Table

| BEFORE path | AFTER path | Status | Divergence | Evidence |
|---|---|---|---|---|
| Valid tab actions | Reducer equivalents | MATCHED | Same in-app transitions | source and tests |
| Ctrl+digit switch | Plain digit switch | DIVERGENT | Different keystroke contract | App diff |
| One thread source page | Two-page aggregate | DIVERGENT | Requests, rows, labels, errors | source and tests |
| Terminal rows minus chrome | Allocated box height | DIVERGENT | Visible rows and resize behavior | source and test |
| Unbounded image caches | Weighted LRUs | DIVERGENT | Eviction/refetch behavior | source and tests |
| Shared Kitty image ID; delete placement | Per-renderable ID; delete image | DIVERGENT | Transmission and cleanup | source and test |
| Image scale/frame formulas | Split decode helpers | MATCHED | Same tested pixel algorithm | source and tests |
| `useTabs().replace` | absent | MISSING_IN_AFTER | Deep-import API break | source/search |

## §7 Divergences

1. Plain digits now switch tabs; Ctrl+digits do not. Option/meta/super combinations are excluded from plain handling.
2. Thread pages are fetched sequentially in pairs, merged, and de-duplicated by ID.
3. A second-page failure now rejects a view that `main` would render from page 1.
4. List initially has a one-row viewport until measurement settles, then follows allocated height; BEFORE used a three-row minimum.
5. Image cache eviction and request coalescing change retention and request counts.
6. Kitty instances own and delete image IDs; duplicate visible images may transmit separately.
7. `Stack` becomes readonly/non-empty and `replace` is removed.

## §8 Side-Effect Manifest Diff

See `evidence/side-effect-manifest.md`. Material differences are thread request count, image coalescing/eviction, terminal image deletion, and deferred layout updates.

## §9 Exception Envelope Diff

See `evidence/exception-envelope.md`. The decisive change is second-page failure propagation. Defensive `RangeError`s cover invalid paging and LRU configuration.

## §10 Witness Inputs

See `evidence/witness-inputs.md`: shortcut modifiers, multi-page forums, second-page failure, cache concurrency, and Kitty cleanup distinguish the snapshots.

## §11 Generated Regression Tests

Four specifications are in `evidence/generated-tests.md`. Runtime results: BEFORE 34/34 and AFTER 68/68 tests passed; both typechecks passed.

## §12 Undecidable Blockers

The verdict is not blocked. Real Kitty behavior, live forum timing, and degraded cross-file TS call graphs limit the positive safety claim only.

## §13 Structural Drift

The 367-line image component becomes a 32-line coordinator plus focused modules. Tab state becomes a pure reducer. Tests grow from 4 files/34 tests to 11 files/68 tests. Structural improvement does not imply equivalence.

## §14 Falsification Recipes

See `evidence/falsification-recipes.md`.

## §15 Tool Health and Coverage

Both commits completed RubberDuck CI Phase 2 with `semantic_mode="full"`; 100% of matching TS/TSX files loaded. Source reads and variable traces succeeded. Exported TS/TSX call-chain extraction was unresolved and PR-review assessment failed, so source/search/runtime evidence overrides empty graph results.

## §16 Evidence Pack Status

Complete normalized evidence pack; it is not a raw tool transcript.
