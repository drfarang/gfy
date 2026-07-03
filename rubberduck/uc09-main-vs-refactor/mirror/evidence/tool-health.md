# Tool health

| Surface | Status | Evidence | Impact |
|---|---|---|---|
| CI BEFORE | Phase 2 full, pinned | 37/37 TS | full baseline |
| CI AFTER | Phase 2 full, pinned | 50/50 TS | full head |
| Semantic loads | 100% | AST/CFG/DDG/CPG14 | usable local semantics |
| Source reads | complete | 13 key ranges | strong anchors |
| Variable traces | coherence 1.0 | state/items/cache/frames/viewport | local flows confirmed |
| Call chains | degraded | exported TS symbols unresolved | search/source used |
| Diff assess | partial | under-reports split modules | not equivalence proof |
| PR review | failed | tool local-variable error | omitted |
| Runtime | green | 34 BEFORE, 68 AFTER, both typechecks | suite compatibility only |
| External runtime | unavailable | no live/Kitty run | residual caveat |
