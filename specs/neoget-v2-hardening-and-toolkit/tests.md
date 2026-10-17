# TESTS

- Spec ID: neoget-v2-hardening-and-toolkit
- Status: active
- Owner: NeoGet Team
- Last reviewed: 2026-10-17

## Test strategy

| Requirement | Test level | Evidence | Status |
| --- | --- | --- | --- |
| FR-001 | build / typecheck | `npm run build` & `sdd verify` | planned |
| FR-002 | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml` | planned |
| FR-003 | unit (Rust + Node) | `cargo test` & `npm test` | planned |

## Quality gates

- Lint: TypeScript strict compiler checks (`tsc -b`) and Rust compiler warnings check
- Typecheck: `npx tsc -b`
- Unit/integration: `npm test` and `cargo test --manifest-path src-tauri/Cargo.toml`
- Security review: Whitelisted tweak/cleanup IDs, Base64 JSON export, `npm audit --omit=dev`
- Spec conformance: `sdd validate --id neoget-v2-hardening-and-toolkit` and `sdd verify --run`
