# Migration v1 -> v2 (etat final)

Ce document decrit l'etat reel apres migration vers Tauri.

## Ce qui a change

Avant:

- UI Fyne (Go)
- backend monolithique Go
- logique d'installation dans le meme runtime Go

Maintenant:

- UI React/TypeScript
- backend Rust via commandes Tauri
- integration WinGet appelee directement par le backend Rust

## Topologie runtime actuelle

- Frontend -> `invoke()` -> commandes Tauri Rust
- Pas de serveur HTTP local intermediaire
- Progression batch via event `installation-progress`

## Fichiers de reference

- Frontend: `src/`
- Backend: `src-tauri/src/commands.rs`
- Configuration Tauri: `src-tauri/tauri.conf.json`
- ACL/capabilities: `src-tauri/capabilities/default.json`

## Decisions de fiabilite

- Timeouts systematiques sur `winget` et `powershell`
- Verrou d'installation anti-concurrence
- Resultat batch final coherent avec les erreurs reelles

## Build et reprise

Utiliser une session **Developer PowerShell for Visual Studio** pour les commandes Cargo.

```powershell
cargo check --manifest-path .\src-tauri\Cargo.toml
cargo test --manifest-path .\src-tauri\Cargo.toml
npm run tauri:build
```

## CI de reproductibilite

Workflow: `.github/workflows/windows-tauri-build.yml`

- initialise environnement MSVC
- verifie `cargo check`
- execute les tests Rust
- construit l'application Tauri
