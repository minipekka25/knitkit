---
"@knitkit/runtime": minor
"@knitkit/cli": patch
---

Rename the public error type to `KnitError` / `isKnitError` / `KnitErrorCode`.

The old `FedkitError` / `isFedkitError` / `FedkitErrorCode` names are kept as deprecated
aliases that point at the renamed symbols, so existing `catch` code keeps working. They will
be removed in a future minor — update imports to the `Knit*` names.
