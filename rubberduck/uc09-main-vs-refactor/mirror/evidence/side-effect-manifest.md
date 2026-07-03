# Side-effect manifest

| Effect | BEFORE | AFTER | Equivalent? | Evidence |
|---|---|---|---|---|
| Thread network | one request | one/two sequential requests | No | source/runtime |
| Thread state | one page | merged/de-duped pages | No | source/runtime |
| Image network | duplicate concurrent misses possible | identical requests coalesce | No | source/runtime |
| Image cache | unbounded | 128/256 MiB LRUs | No | source/runtime |
| Image pixels | original formulas | same formulas split | Yes for tested formats | source/runtime |
| Kitty I/O | shared ID/delete placement | unique ID/delete image | No | source/runtime |
| List scheduling | stdout-derived | size callback plus nextTick | No | source/runtime |
| Tab state | multiple setters | reducer dispatch | Yes for valid actions | source/runtime |
| File/DB/logging | none | none | Yes in reviewed scope | source/search |
