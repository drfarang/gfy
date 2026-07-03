# Falsification recipes

| Claim | Tool/query | Contradiction |
|---|---|---|
| production behavior differs | branch diff plus witness tests | same input/effects across snapshots |
| callers listed are complete in repo | exact symbol search in both trees | additional production caller |
| deep-import break exists | compile consumer using old `Stack`, `replace`, `chromeRows` | old consumer compiles unchanged |
| tests pass | rerun `bun test` and typecheck on pinned commits | any failure |
| risk is medium | run live/Kitty smokes and integrations | serious failure raises; comprehensive green evidence lowers |
