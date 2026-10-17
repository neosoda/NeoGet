# PRD

- Spec ID: neoget-v2-hardening-and-toolkit
- Status: active
- Owner: NeoGet Team
- Last reviewed: 2026-10-17

## Problem

NeoGet v2.2.0 needs repository hygiene, build portability, deterministic offline unit tests, and an expanded Windows Toolkit integrating high-value, reversible optimizations and cleanup targets inspired by the reference tools (`optimizerDuck` and `Winhance`).

## Users and scope

- Primary users: Windows 10/11 power users, developers, and system administrators configuring or maintaining workstations.
- In scope:
  - Option A (Hardening & Maintenance): Git hygiene (`.gitignore`, untracking `.tsbuildinfo`), build portability (`USERPROFILE`), isolation of live WinGet integration test (`#[ignore]`), dead code removal (`api.rs`, `InstallingGuard`), Base64-safe PowerShell JSON export, and updated `docs/ARCHITECTURE.md`.
  - Option B (Toolkit Expansion): Expand Windows Toolkit with curated, reversible registry toggles (Taskbar, Explorer, Appearance, Gaming, System, Performance) and CrashDumps cleanup item (`%LOCALAPPDATA%\CrashDumps`).
- Out of scope:
  - Destructive OS modifications (deleting Windows services, modifying ISO images, or auto-deleting `Windows.old`).
  - Telemetry or external network dependencies.

## Requirements

- FR-001: Ensure build scripts (`package.json`, `build-release.ps1`), Git hygiene (`.gitignore`), and `docs/ARCHITECTURE.md` are portable, clean, and synchronized with the v2.2.0 architecture.
- FR-002: Ensure backend Rust unit tests run deterministically offline without live `winget` side effects, remove dead code (`api.rs`, `InstallingGuard`), and harden JSON export serialization via Base64.
- FR-003: Expand the Windows Toolkit backend and UI preview with curated, reversible system tweaks (`dark_mode`, `taskbar_left_align`, `taskbar_end_task`, `clipboard_history`, `launch_to_this_pc`, `disable_bing_search`, `numlock_on_boot`, `disable_mouse_acceleration`, `speed_up_menus`) and the `crash_dumps` cleanup target.

## Acceptance criteria

- AC-001: `build-release.ps1` and `package.json` resolve `%USERPROFILE%` dynamically, `.gitignore` excludes `.serena/` and `_A INTEGRER/`, `tsconfig*.tsbuildinfo` are untracked from Git index, and `docs/ARCHITECTURE.md` reflects `OperationManager` and `tauri-plugin-log`.
- AC-002: `cargo test` completes rapidly without invoking live `winget` scans by default (`test_all_winget_commands` marked `#[ignore]`), unused `src-tauri/src/api.rs` and `InstallingGuard` are removed, and `export_configuration` encodes JSON via Base64.
- AC-003: `get_windows_tweaks`, `apply_windows_tweak`, `scan_cleanup_items`, and `clean_windows_items` support all 19 Windows tweaks and 7 cleanup targets with unit tests validating tweak IDs, cleanup IDs, and frontend preview consistency.

## Risks and assumptions

- Risk: Modifying registry keys can require Explorer restart or session sign-out to take visual effect. Mitigation: Explicitly declare `restart_required` (`Explorateur` or `Session`) on each tweak and keep all toggles 100% reversible.
