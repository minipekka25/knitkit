---
"@knitkit/runtime": minor
---

Negotiation now accepts `||` union ranges (`^17 || ^18`), whitespace intersections
(`>=1.2.0 <2.0.0`), and partial caret/tilde operands (`^18`, `~1.2`) in `requiredVersion`.
A range is parsed as a union of comparator sets, matching node-semver's model, so common
real-world ranges no longer fail validation.
