# Callers

| Target | Caller | Zone | Effect |
|---|---|---|---|
| `useTabs` | `App` | production | all navigation state |
| `ImageBlock` | `ThreadViewScreen` | production | inline forum images |
| `List` | forum/thread list screens | production | visible rows/keyboard scrolling |
| `loadThreadListView` | `ThreadListScreen` | production | page data and errors |
| reducer/fetch/decode/LRU | focused tests | test | regression oracles |
