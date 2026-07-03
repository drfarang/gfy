# Structural drift

- Image coordinator: 367 lines to 32 plus focused modules.
- Tabs: mutable hook state to pure reducer and non-empty readonly stack.
- Tests: 4 files/34 tests to 11 files/68 tests.
- CI: 37 TS files, 3,160 SLOC, 362 functions, 7 classes to 50 files, 3,889 SLOC, 465 functions, 8 classes.
- Average cyclomatic metric: 1.78 to 1.49; health: 73.75 to 71.81 as surface grew and docs density fell.
