# Import and module context

| Name | BEFORE | AFTER | Relevance | Evidence |
|---|---|---|---|---|
| Tab state | state/ref | reducer/memo | State machine explicit | source |
| Image fetch | global fetch in monolith | global/injected fetch module | coalescing and bounded cache | source/runtime |
| Image decode | Sharp in monolith | Sharp in decode module | formulas retained | source/runtime |
| Image ID | prepared object | renderable constructor | ownership differs | source/runtime |
| List sizing | stdout dimensions | OpenTUI height | layout differs | source/runtime |
| Thread reader | client method | structural adapter | method called more often | source/runtime |

Dependencies and lockfile are unchanged.
