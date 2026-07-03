# Dual-source adjudication

| Claim | Tool A | Tool B | Adopted truth | Confidence |
|---|---|---|---|---|
| `loadThreadListView` caller | impact mode says one same-file reference | search/source shows `ThreadListScreen` import/call and tests | production caller plus tests | high |
| `List` callers | impact mode says one same-file reference | search/source shows two screens | two production callers | high |
| split image diff | diff assess reports zero call changes | source/search shows fetch/decode/render split | structural and lifecycle change | high |
| test compatibility | verify-fix parsed first count only | direct commands show 34 and 68 pass | direct results authoritative | high |
| root API | CI/source diff | git/source show unchanged entrypoint/package | root unchanged, deep imports at risk | high |
