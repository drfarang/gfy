# Search results

| Pattern | Scope | Adopted result |
|---|---|---|
| `useTabs|tabsReducer|nav.*` | `src`, `test`, both snapshots | App is production caller; reducer tests cover valid/invalid actions |
| image pipeline symbols | `src`, `test`, both snapshots | ThreadViewScreen is root caller; new modules form one pipeline |
| paging symbols and `.threads(` | `src`, `test`, both snapshots | ThreadListScreen uses wrapper; wrapper delegates two calls |
| `chromeRows|onSizeChange` | `src`, `test`, both snapshots | prop removed; size callback added |
| mock/spy/Jest/Vitest terms | current `src`, `test` | zero matches; external consumers excluded |
