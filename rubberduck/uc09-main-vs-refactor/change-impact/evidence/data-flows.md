# Data flows

1. Keyboard event → modifier gate → tab dispatch → active stack → rendered screen.
2. Image URL → normalization → cache/in-flight lookup → fetch bytes → Sharp decode → terminal/half-block output.
3. Forum/view page → source-page indices → one/two client calls → ordered de-duplication → List rows/header.
4. OpenTUI allocated height → deferred state → viewport → selection offset → visible slice.
