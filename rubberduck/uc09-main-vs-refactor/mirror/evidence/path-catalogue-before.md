# BEFORE path catalogue

| ID | Guard | Calls/effects | Result | Lifecycle |
|---|---|---|---|---|
| B-TAB-1 | plain key | settings/brackets | state/no-op | none |
| B-TAB-2 | Ctrl+digit | `switchTo` | tab changes | none |
| B-TAB-3 | valid action | React setters | next tab state | React |
| B-TAB-4 | invalid index | accepts index | clamp/invalid intermediate | React |
| B-IMG-1 | cache miss | fetch/decode | image/error | unbounded Maps |
| B-IMG-2 | Kitty render | shared ID/place | visible image | delete placement |
| B-LIST-1 | items exist | slice by terminal viewport | rows/hint | resize listener |
| B-PAGE-1 | page N | one client call | one page | one request |
