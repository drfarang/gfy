# Runtime optimization

| Target | Opportunity/current optimization | Exactness | Risk |
|---|---|---|---|
| image fetch | coalescing and LRU already added | same bytes | low |
| image decode | prepared LRU already added | same pixels/frames | low-medium |
| thread paging | speculative parallel page 2 | changes requests/errors | high; reject |
| Kitty duplicate instances | reference-count shared transmission | exact lifecycle proof needed | medium-high |
