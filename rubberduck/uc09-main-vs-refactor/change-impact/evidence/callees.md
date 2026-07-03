# Callees

| Target | Callee | Impact |
|---|---|---|
| thread wrapper | `VbClient.threads` | up to two sequential network requests |
| image coordinator | fetch/decode/render modules | cache, Sharp, terminal effects |
| Kitty renderable | transmit/place/delete helpers | terminal graphics lifecycle |
| List | `onSizeChange`, `process.nextTick`, React state | deferred viewport update |
| tabs wrapper | reducer dispatch | guarded immutable transitions |
