# Claim ledger

Absence and negative claims are maintained separately.

| Claim | Evidence | Type | Confidence | Caveat |
|---|---|---|---|---|
| snapshots are not behaviorally equivalent | shortcut/paging/layout/lifecycle witnesses | source/runtime | high | external runtime unnecessary to prove divergence |
| valid internal tab actions are preserved | reducer source/tests | source/runtime | high | malformed and deep-import calls differ |
| decode formulas are retained | before/after source and decode tests | source/runtime | high | tested formats only |
| merge risk is medium | production effects plus green tests | manual synthesis | medium-high | live/Kitty pending |
| root CLI surface is stable | root/package diff | source | high | deep imports remain exposed |
