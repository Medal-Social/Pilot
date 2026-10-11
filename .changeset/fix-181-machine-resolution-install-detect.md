---
'@medalsocial/pilot': patch
---

`pilot connect` now resolves the active machine the same way `pilot kit` does:
when the hostname (or its short form) is a direct key in `kit.config.json`,
that machine is used instead of silently falling back to the first configured
one, so remote rebuilds and app edits target the machine you are on.

`pilot update` no longer mistakes an npm install for a Nix install when Node
itself comes from Nix; it inspects the pilot entry script rather than the Node
runtime path.
