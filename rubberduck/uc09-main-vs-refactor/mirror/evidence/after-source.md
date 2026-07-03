# AFTER source inventory

Snapshot: `refactor` at `c958da5bb995126f9777bae86c31f0fee9710e33`.

| Area | Source anchor | Contract |
|---|---|---|
| Keyboard | `src/ui/App.tsx:112-136` | Plain digits switch tabs |
| Tabs | `src/ui/tabs.ts:1-117` | Pure guarded reducer and wrapper |
| Images | `src/ui/components/ImageBlock.tsx`, `src/ui/image/*`, render components, `src/util/lru.ts` | Split, bounded, coalesced |
| Kitty | `src/ui/components/KittyImage.ts:42-158` | Renderable owns/deletes image ID |
| List | `src/ui/components/List.tsx:24-123` | Allocated box height |
| Threads | `src/ui/screens/ThreadListScreen.tsx`, `src/ui/threadListPaging.ts` | One/two-page aggregate |

RubberDuck `read_source` returned all requested ranges.
