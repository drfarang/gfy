# Witness inputs

| ID | Input/state | BEFORE | AFTER | Evidence |
|---|---|---|---|---|
| W1 | two tabs; Ctrl+`1` | selects first | no switch | source |
| W2 | two tabs; plain `1` | no switch | selects first | source |
| W3 | forum pages 1 and 2 | page 1 only | calls 1/2, merges | runtime after |
| W4 | page 1 succeeds, page 2 fails | success | rejection | source |
| W5 | concurrent uncached same image | two fetches may start | one starts | runtime after |
| W6 | destroy Kitty image | placement delete | image delete | source/runtime after |
