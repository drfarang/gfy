# Shared variables

- Navigation: `state.tabs`, `state.active` within one reducer instance.
- Images: module-level source/prepared LRUs and in-flight Maps.
- Kitty: global transmitted and animated ID sets plus ID allocators.
- List: local `sel`, `offset`, `containerRows`, and measurement ref.
- Paging: local `viewPage`; aggregate `items` and `totalSourcePages` traced with coherence 1.0.
