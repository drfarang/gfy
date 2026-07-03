# Public API proof

- `package.json` module/bin still points to unchanged `src/index.tsx`.
- Package metadata, dependencies, lockfile, config, backend API, and domain types are unchanged.
- `files` publishes all `src`; an `exports` map is absent.
- Deep-import breaks: removed `useTabs.replace`, readonly/non-empty `Stack`, removed `List.chromeRows`.

Classification: root API stable; deep-import compatibility uncertain and at risk.
