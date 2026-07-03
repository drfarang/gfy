# Exception envelope

| Path | BEFORE | AFTER | Equivalent? | Evidence |
|---|---|---|---|---|
| Image HTTP/size/abort | reject then `[image]` | same envelope/display | Mostly | source/runtime |
| Image retry after prop/size change | error not explicitly reset | state resets | No | source |
| First thread page fails | screen error | screen error | Yes | source |
| Second thread page fails | no request | whole view rejects | No | source |
| Invalid view page | no helper validation | `RangeError` | No; not normal UI | source/runtime |
| Invalid LRU config | not applicable | `RangeError` | No; constants valid | source/runtime |
| Invalid tab index | can alter/clamp | guarded no-op | No | source/runtime |
