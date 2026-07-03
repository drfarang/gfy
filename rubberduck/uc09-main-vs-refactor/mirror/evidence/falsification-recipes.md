# Falsification recipes

| Claim | Rerun | Refuting contradiction |
|---|---|---|
| Shortcut differs | App diff plus keyboard integration | same tab result for both modifiers |
| Thread view differs | `bun test test/thread-list-paging.test.ts` | one request/page-1-only on both |
| Layout differs | `bun test test/list-layout.test.tsx` plus BEFORE harness | same rows at all heights |
| Image effects differ | fetch/lifecycle tests and source | same calls/cache/IDs/deletes |
| Valid tab actions match | reducer tests plus BEFORE hook harness | any valid sequence differs |
| Root stays shared | diff `src/index.tsx` and `package.json` | root/metadata differs |
