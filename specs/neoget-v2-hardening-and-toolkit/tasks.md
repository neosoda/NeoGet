# TASKS

- Spec ID: neoget-v2-hardening-and-toolkit
- Status: active
- Owner: NeoGet Team
- Last reviewed: 2026-10-17

## Task registry

The executable task registry is `.sentinel-sdd/tasks.json`. Create and update task IDs, priority, dependencies, status, blockers, requirements, acceptance criteria, tests, and affected modules through `sdd task`; do not duplicate that mutable state in this document.

## Planning notes

- Sequence execution in 3 short, verifiable tasks:
  - `T-001`: Specification & delivery plan definition (`specs`).
  - `T-002`: Option A — Repository hygiene, build portability, dead code removal, Base64 JSON export hardening, and architecture doc sync (`build-release.ps1`, `package.json`, `.gitignore`, `docs/ARCHITECTURE.md`, `src-tauri/src/commands.rs`).
  - `T-003`: Option B — Windows Toolkit expansion with 9 new reversible tweaks + `crash_dumps` cleanup target and unit tests (`src-tauri/src/commands.rs`, `src/components/WindowsToolkitView.tsx`).

<!-- sentinel:task-summary:start -->

## Derived task status

| Task | Title | Status | Blocker |
| --- | --- | --- | --- |
| T-002 | Hardening, build portability, git hygiene, and offline test isolation | done |  |
| T-003 | Expand Windows Toolkit with curated tweaks and CrashDumps cleanup | done |  |

<!-- sentinel:task-summary:end -->
