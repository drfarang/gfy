# Negative claims

| Negative claim | Pattern | Scope | Matches | Caveat |
|---|---|---|---|---|
| repository mock sites absent | `mock|spyOn|vi.|jest.` | current `src`, `test` | 0 | external consumers excluded |
| deleted tracked paths absent | git diff filter `D` | `main...refactor` | 0 | removals inside modified files still exist |
| root/package changes absent | diff on `src/index.tsx`, `package.json`, lockfile | branch delta | 0 | deep-import modules changed |
| in-repo `nav.replace` callers absent | `nav.replace` | both snapshot source trees | 0 | external deep importers excluded |
