# NeoGet Documentation

NeoGet est une application desktop Windows basee sur **Tauri 2 + React 19** pour installer des logiciels via WinGet.

## Architecture reelle

- Frontend: React + TypeScript + Vite
- Backend: commandes Tauri en Rust
- Moteur d'installation: `winget` execute via `tokio::process::Command`
- Elevation Windows: manifeste `requireAdministrator`
- Logs: `tauri-plugin-log` (stdout + dossier `logs` a cote de l'exe)

## Point d'entree et flux principal

1. `src-tauri/src/main.rs` lance `neoget::run()`.
2. `src-tauri/src/lib.rs` enregistre les commandes Tauri.
3. Le frontend appelle les commandes via `invoke()`.
4. Les batches envoient des evenements `installation-progress` ecoutes par le frontend.

## Commandes exposees (backend)

Fichier: `src-tauri/src/commands.rs`

- `install_software`
- `install_software_batch`
- `search_winget`
- `check_winget`
- `install_winget`
- `is_admin`
- `get_installation_status`
- `get_software_list`

## Fiabilite deja en place

- Timeouts explicites sur les appels externes (`winget`, `powershell`)
- Verrou global d'installation avec garde RAII
- Batch final honnete (succes/erreurs agreges)
- Detection erreurs privilege et deja installe

## Prerequis de build Windows

- Node.js 20+
- Rust toolchain stable (MSVC target)
- Visual Studio Build Tools (Desktop development with C++)
- Windows SDK

Pour les commandes Cargo sur Windows, utiliser **Developer PowerShell for Visual Studio**.

## Commandes utiles

```powershell
# depuis la racine du repo
npm ci
npm run build
cargo check --manifest-path .\src-tauri\Cargo.toml
cargo test --manifest-path .\src-tauri\Cargo.toml
npm run tauri:build
```

## CI

Workflow Windows: `.github/workflows/windows-tauri-build.yml`

Il execute:

1. `npm ci`
2. `cargo check`
3. `cargo test`
4. `npm run tauri:build`

## Notes importantes

- Il n'existe plus de backend HTTP local `localhost:9999` dans le runtime actuel.
- Les anciennes references Go/Fyne sont historiques et ne representent plus l'implementation active.
