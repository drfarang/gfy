# AFTER path catalogue

| ID | Guard | Calls/effects | Result | Lifecycle |
|---|---|---|---|---|
| A-TAB-1 | plain digit | guarded switch | valid tab change | none |
| A-TAB-2 | Ctrl+digit | no matching action | no change | none |
| A-TAB-3 | valid reducer action | immutable update | same valid transition | React |
| A-TAB-4 | invalid index | range guard | same state | React |
| A-IMG-1 | cache miss | coalesced fetch/decode | image/error | weighted LRU |
| A-IMG-2 | Kitty render | per-instance ID/place | visible image | delete image |
| A-LIST-1 | items exist | size callback/nextTick | allocated rows | local state |
| A-PAGE-1 | final source page | one client call | one-page aggregate | one request |
| A-PAGE-2 | next page exists | two calls/merge | aggregate or reject | two requests |
| A-PAGE-3 | invalid view | none | `RangeError` | none |
