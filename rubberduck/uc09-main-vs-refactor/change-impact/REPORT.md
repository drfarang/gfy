# main..refactor — RubberDuck Change Impact Report

| Field | Value |
|---|---|
| Target | Five-commit branch delta |
| File | 23 changed paths |
| Change | navigation/image refactors plus shortcut, paging, and layout behavior |
| Change type | behavior + refactor |
| Risk | MEDIUM, 62/100 |
| Confidence | medium-high |
| Report status | complete; runtime suites executed, external runtime pending |
| RubberDuck coverage | Phase 2 full on both commits; 100% TS/TSX semantic loads |
| Tool degradation | cross-file TS call chains unresolved; PR-review assessment failed |

## §0 Impact Summary

The branch is mergeable only as an intentional product change, not as a behavior-preserving refactor. Valid navigation transitions and image decode formulas stay shared. Production behavior changes in keyboard input, thread network requests/content/error handling, list layout, image caching, and terminal graphics cleanup. Both snapshots pass their own tests and typecheck.

## §0.5 Shadow / Doppelganger Pre-flight

| Candidate | Evidence | Zone | Action |
|---|---|---|---|
| Old monolithic image helpers vs split modules | direct lineage in diff; old bodies removed from head | production | note; not a live shadow |
| `VbClient.threads` vs `loadThreadListView` | wrapper delegates one/two calls | production | retain both; different abstraction levels |
| hook state machine vs `tabsReducer` | old implementation removed | production | no unification needed |
| other `List` implementations | scoped search found one production `List` | production | ignore |

Fingerprint level: semantic/source lineage, not a computed cross-repository duplicate proof.

## §1 Target Resolution

Target is the complete `main` (`4a8eb495`) to `refactor` (`c958da5b`) delta. Resolution confidence is high: merge base equals the BEFORE commit, the AFTER branch is a five-commit descendant, and both commit snapshots are CI-indexed.

## §2 Proposed Change Understanding

Commit order:

1. `28800a6` — reducer-driven tabs.
2. `285618d` — split and bound image pipeline.
3. `3b7f3d6` — plain-digit tab selection.
4. `6cd3ac4` — two thread source pages per view.
5. `c958da5` — list fills allocated viewport.

## §3 Caller Impact

| Changed target | Production caller | Impact |
|---|---|---|
| `useTabs` | `App` | same valid methods except removed `replace`; keyboard caller changed |
| `ImageBlock` | `ThreadViewScreen` | same component signature; fetch/cache/terminal effects differ |
| `List` | `ForumListScreen`, `ThreadListScreen` | `chromeRows` removed; viewport now self-measured |
| `loadThreadListView` | `ThreadListScreen` | new aggregation and failure boundary |
| `KittyImageRenderable` | custom `<kittyImage>` host | image-ID ownership changes |

RubberDuck impact mode under-counted these edges as one same-file reference per target. Search and source evidence are adopted.

## §4 Callee / Downstream Impact

| Target | Downstream calls/state | Impact |
|---|---|---|
| Thread list | `loadThreadListView` → `VbClient.threads` → HTTP | up to two sequential requests |
| Image block | fetch → Sharp decode → Kitty/half-block render | same pixel formulas; different caches/lifecycle |
| List | OpenTUI size callback → `process.nextTick` → React state | new deferred render step |
| Tabs | React reducer → immutable tab/stack state | guards malformed actions |

## §5 Shared State / Data Flow

- Navigation state remains per-App React state; reducer traces show active/tab state flows across every action branch.
- Image source cache and prepared-image cache are module-level shared LRUs; in-flight Maps coalesce work.
- Kitty module retains global transmitted/animated ID sets; AFTER renderables allocate and delete their own IDs.
- List selection, offset, and measured height remain component-local.
- Thread page data flows from two client results into an ordered ID-de-duplicated array.

## §6 Public API / Export / Config / Deploy Impact

The root CLI entrypoint, package metadata, dependencies, lockfile, config, backend client signatures, and domain types stay unchanged. Risk remains for deep imports because `src` is published without an `exports` map: `Stack` becomes readonly/non-empty, `useTabs().replace` disappears, and `List.chromeRows` disappears. These are not documented root exports but can break direct consumers.

## §7 Mock Breakage Taxonomy

Scoped source/test search found zero mock, spy, Jest, or Vitest sites. Existing tests call pure helpers or use OpenTUI test renderers. Caveat: external consumers are outside repository coverage.

## §8 Test Impact Matrix

| Area | BEFORE coverage | AFTER coverage | Gap |
|---|---|---|---|
| Tabs | indirect only | 9 reducer tests | App modifier routing integration |
| Image decode/fetch/cache | indirect only | 19 focused tests | duplicate live Kitty instances and eviction remount |
| List layout | indirect only | OpenTUI resize test | tiny-height and unmount-before-nextTick |
| Thread paging | direct one-page behavior only | 5 helper tests | second-page failure policy and screen integration |
| Shared parser/post/upload | 34 passing tests | same 34 still pass | none observed |

Executed: BEFORE 34 pass; AFTER 68 pass; both TypeScript checks pass.

## §9 Risk Score

**MEDIUM — 62/100 (manual max-risk aggregation).** Highest-risk dimension is intentional production behavior and external network side effects. Tests and commit isolation reduce risk; live forum and real terminal gaps prevent a LOW rating. Risk rises to HIGH if exact shortcut compatibility, one-request paging, or deep-import compatibility is required.

## §10 ★ Comment Contract

| Comment/doc | Contract | Impact | Required action |
|---|---|---|---|---|
| `src/ui/tabs.ts` browser-style navigation comment | background tabs preserve stack | retained and directly tested | none |
| `src/ui/threadListPaging.ts` two-page comment | two adjacent pages per view | new product contract | accept explicitly |
| image cache/frame comments | bounded memory and frame work | new operational contract | monitor memory/transmission |
| README shortcut/paging text | plain digits and two-page views | updated | confirm release note |

## §11 Rare / High-Value Signals

- RubberDuck security-pattern count falls from 20 High to 18 High after moving fetch code. The network fetch still exists, so this is scanner-location drift rather than a proven security improvement.
- The package publishes `src` and lacks an `exports` boundary, making nominally internal type/method changes observable to deep importers.
- Per-renderable Kitty ownership fixes retained terminal-image leakage but may duplicate transmissions for repeated identical visible images.
- The `verify_fix` helper recommends ship-with-review but its test parser captured only the first numeric count; the direct test runs are authoritative.

## §12 Runtime Optimization Opportunities

| Function | Opportunity/current change | Same-result proof needed | Risk |
|---|---|---|---|
| image fetch | in-flight coalescing and bounded LRU already implemented | fetch-count and eviction tests | low |
| image decode | prepared-image LRU already prevents repeated decode | pixel/frame equivalence | low-medium |
| thread paging | speculative parallel page 2 could reduce latency | must avoid unnecessary request and preserve errors | high; do not apply |
| Kitty render | share transmitted bytes across live identical instances | ownership-safe reference counting | medium-high |

Further optimization is not required for merge safety.

## §13 Recommended Change Order

1. Add shortcut modifier and second-page failure integration tests.
2. Decide whether deep-import compatibility is supported; add compatibility shims if yes.
3. Run a real Kitty terminal smoke with duplicate images, resize, scroll, and unmount.
4. Run a live multi-page forum smoke and record request latency/failure behavior.
5. Merge commits in their existing order; preserve separate rollback points.

## §14 Tests to Run

- Must: `bun test`, `bun run typecheck`.
- Must: generated App shortcut and second-page failure tests.
- Should: real TUI list resize with one and multiple tabs/footer states.
- Should: Kitty duplicate-image lifecycle smoke.
- Nice: cache-pressure memory and thread-page latency benchmark.

## §15 Rollback / Migration Plan

Commits are isolated enough for targeted rollback. Revert in reverse order for a full rollback. For paging incidents revert `6cd3ac4`; for image terminal incidents revert `285618d`; for shortcut compatibility revert `3b7f3d6`. Avoid reverting the reducer solely to restore shortcut behavior.

## §16 Unknowns / Unsupported Surfaces

| Surface | Status | Impact |
|---|---|---|
| real Kitty/Ghostty terminal | unsupported runtime | image transmission/cleanup residual risk |
| live gfy.com multi-page forum | not executed | latency and second-page failure rate unknown |
| external npm deep importers | outside repo | API compatibility unknown |
| README/package/lock/config | source-reviewed; lock/config unchanged | low |
| exported TS cross-file graph | degraded | source/search substituted |

## §17 Claim Ledger and Negative Claims

See `evidence/claim-ledger.md` and `evidence/negative-claims.md`. Major claims use source, graph, search, CI, or runtime labels.

## §18 Falsification Recipes

See `evidence/falsification-recipes.md`.

## §19 Paste-Ready PR Description

**Risk: MEDIUM.** Refactors tab state into a tested reducer and splits the image pipeline into bounded, testable modules. Also intentionally changes tab shortcuts to plain digits, combines two thread pages per view, and sizes lists from allocated height. `bun test` (68/68) and `bun run typecheck` pass. Reviewers should confirm shortcut compatibility, second-page failure policy, deep-import expectations, and real Kitty terminal lifecycle. Roll back by feature commit if a production issue appears.

This report is an impact analysis, not an implementation patch. No implementation code is generated unless explicitly requested.

## Evidence Pack Index

See `evidence/` and `impact-summary.json`.
