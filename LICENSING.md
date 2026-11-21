# NeoGet — Licensing and source provenance

NeoGet contains original code and dependencies or assets governed by their respective owners' licenses. **No single license overrides the rights of third-party authors.**

## Original NeoGet components

Copyright (c) 2026 Neosoda. All rights reserved for original work owned by Neosoda. See [LICENSE](LICENSE).

No general permission to copy, modify, redistribute, sublicense, sell, or commercially host Neosoda's independently authored code is granted beyond what is required by GitHub's terms or specifically allowed in a separate written agreement. This does not withdraw existing valid permission granted for any previous version.

## Upstream reference projects — not part of the current repository tree

The following full-source snapshots used to be tracked in `_A INTEGRER/` for possible future evaluation. **They have been removed from the current tree** because the reviewed NeoGet frontend, Tauri/Rust build configuration, release script and Windows CI do not reference or package those directories.

- [optimizerDuck](https://github.com/itsfatduck/optimizerDuck), by fatDuck / itsfatduck — **GNU GPL v3**, per the upstream LICENSE at the previously imported revision.
- [Winhance](https://github.com/memstechtips/Winhance), by Marco du Plessis — **PolyForm Shield License 1.0.0**, per the upstream LICENSE.txt at the previously imported revision.

These works were not relicensed, and their copyright and license obligations remain intact for any use of the historical copies, derived code, or independent integrations. Removing their source snapshots from the current Git tree **does not purge them from the Git history**, which retains earlier revisions.

## Packaging and compliance

NeoGet's standard build uses `src/` (React/TypeScript), `src-tauri/` (Tauri/Rust), `package.json`, and `src-tauri/tauri.conf.json`. The `_A INTEGRER/` directory has no apparent build references in the reviewed build scripts or CI, and was already ignored by `.gitignore`. This is **a source/build-configuration review, not a forensic verification of every binary or copied code fragment**.

Before a commercial release or third-party redistribution, verify dependency and asset licenses, source provenance of any incorporated snippets, and the contents of the actual built binaries.

The original code's reserved-rights notice does **not** apply to upstream projects or to other authors' licensed material.
