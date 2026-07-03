# BEFORE source inventory

Snapshot: `main` at `4a8eb495c469dec9b34bc328f1b1e02ac6cdc0cd`.

| Area | Source anchor | Contract |
|---|---|---|
| Keyboard | `src/ui/App.tsx:112-134` at BEFORE | Ctrl+digits switch tabs |
| Tabs | `src/ui/tabs.ts:1-70` | Hook state/ref; `replace` returned |
| Images | `src/ui/components/ImageBlock.tsx:1-367` | Monolith; unbounded caches; shared image IDs |
| Kitty | `src/ui/components/KittyImage.ts:36-151` | Destruction deletes placement only |
| List | `src/ui/components/List.tsx:24-115` | `rows - chromeRows`, minimum 3 |
| Threads | `src/ui/screens/ThreadListScreen.tsx:12-80` | One source page |

RubberDuck `read_source` returned all requested ranges.
