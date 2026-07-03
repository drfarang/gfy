# Path-match table

| Before path | After path | Status | Divergence | Evidence |
|---|---|---|---|---|
| B-TAB-1 | A-TAB-1 | DIVERGENT | plain digit added | source |
| B-TAB-2 | A-TAB-2 | DIVERGENT | Ctrl+digit removed | source |
| B-TAB-3 | A-TAB-3 | MATCHED | valid transitions | source/runtime |
| B-TAB-4 | A-TAB-4 | DIVERGENT | invalid input now no-ops | source/runtime |
| B-IMG-1 | A-IMG-1 | DIVERGENT | bound/coalescing | source/runtime |
| B-IMG-2 | A-IMG-2 | DIVERGENT | ownership/cleanup | source/runtime |
| B-LIST-1 | A-LIST-1 | DIVERGENT | viewport source | source/runtime |
| B-PAGE-1 | A-PAGE-1 | MATCHED | one-page forums | source/runtime |
| B-PAGE-1 | A-PAGE-2 | DIVERGENT | two requests/merged rows | source/runtime |
| none | A-PAGE-3 | MISSING_IN_BEFORE | invalid-page exception | source/runtime |
| `replace` | none | MISSING_IN_AFTER | hook method removed | source/search |
