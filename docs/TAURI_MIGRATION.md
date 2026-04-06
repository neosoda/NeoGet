# Migration NeoGet v1.2.2 → v2.0 (Tauri + React)

## 🎨 Vue d'ensemble

NeoGet v2.0 remplace Fyne par une architecture moderne :

```
┌─────────────────────────────────────────────────────┐
│                   React UI (TypeScript)             │
│  - Tailwind CSS                                     │
│  - Framer Motion (animations fluides)               │
│  - Lucide Icons                                     │
└────────────────────┬────────────────────────────────┘
                     │
         IPC (Tauri Commands)
                     │
┌────────────────────▼────────────────────────────────┐
│               Tauri Backend (Rust)                   │
│  - HTTP Client pour appels à l'API Go               │
│  - OS integration (PowerShell, etc)                 │
└────────────────────┬────────────────────────────────┘
                     │
         HTTP (localhost:9999)
                     │
┌────────────────────▼────────────────────────────────┐
│             API Server (Go existant)                 │
│  - WinGet installation                              │
│  - Software catalog                                 │
│  - Installation management                          │
└─────────────────────────────────────────────────────┘
```

## 📁 Structure du projet

```
neoget/
├── src/                          # Frontend React
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Composant principal
│   ├── index.css                 # Styles globaux + Tailwind
│   └── components/
│       ├── Header.tsx            # Barre supérieure
│       ├── SoftwareGrid.tsx      # Grille de logiciels
│       ├── InstallationOverlay.tsx # Modal d'installation
│       └── index.ts              # Exports
│
├── src-tauri/                    # Backend Tauri/Rust
│   ├── src/
│   │   ├── main.rs              # Entry Tauri
│   │   ├── lib.rs               # Exports
│   │   ├── commands.rs          # Commandes Tauri
│   │   └── api.rs               # Client HTTP
│   ├── tauri.conf.json          # Config Tauri
│   └── Cargo.toml               # Dépendances Rust
│
├── index.html                    # Template HTML
├── vite.config.ts               # Vite build config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
├── package.json                 # NPM dépendances
│
├── api_server.go                # API HTTP Go
├── main.go                       # Backend Go
├── managers.go                   # Logique existante
└── TAURI_MIGRATION.md           # Ce fichier
```

## 🚀 Démarrage

### Installation des dépendances

```bash
# Node.js + npm
npm install

# Rust (obligatoire pour Tauri)
# https://www.rust-lang.org/tools/install

# Go (pour le backend)
# https://golang.org/doc/install
```

### Mode développement

```bash
# Démarrer le serveur Tauri en dev
npm run tauri:dev

# OU manuellement:
# Terminal 1 - Frontend Vite
npm run dev

# Terminal 2 - Backend Tauri
npm run tauri dev
```

### Mode production

```bash
# Build tout
npm run tauri:build

# Crée : src-tauri/target/release/neoget.exe
```

## 🎯 Améliores visuelles

### Typographie
- **Headings** : Outfit (geometric, modern)
- **Body** : Work Sans (clean, balanced)
- **Code** : Fira Code (monospace)

### Couleurs
- **Primary** : #3B82F6 (Bleu)
- **Accent** : #0D9488 (Teal)
- **Orange** : #F97316 (Warm accent)
- **Light BG** : #FAFAF9 (Warm white)
- **Dark BG** : #1C1917 (Rich black)

### Animations
- **Transitions rapides** : 100ms
- **Transitions standard** : 200ms
- **Transitions lentes** : 300-500ms
- **Easing** : cubic-bezier(0.4, 0, 0.2, 1)

### Composants
- Cards avec ombre et hover effect
- Boutons avec scale feedback (0.98)
- Badges avec animations d'apparition
- Progress bar animée
- Gradient backgrounds

## 🔌 Communication Frontend ↔ Backend

### React → Tauri → Go

```typescript
// Dans React
import { invoke } from '@tauri-apps/api/tauri'

const result = await invoke('install_software', {
  id: 'vscode',
  name: 'Visual Studio Code'
})
```

↓

```rust
// Dans src-tauri/src/commands.rs
#[tauri::command]
pub async fn install_software(id: String, name: String) -> Result<String, String> {
  // Appel HTTP à l'API Go
  reqwest::Client::new()
    .post("http://localhost:9999/api/install/{id}")
    .json(&json!({"name": name}))
    .send()
    .await?
}
```

↓

```go
// Dans api_server.go
func (s *APIServer) handleInstall(w http.ResponseWriter, r *http.Request) {
  // Traitement et installation
  installSoftwareAsync(id, name)
}
```

## 📦 Dépendances principales

### Frontend
- **react** ^19.0.0 — Framework UI
- **@tauri-apps/api** ^2.0.0 — IPC avec backend
- **framer-motion** ^11.0.0 — Animations fluides
- **lucide-react** ^0.424.0 — Icons
- **tailwindcss** ^3.4.3 — Styling

### Backend (Tauri/Rust)
- **tauri** ^2.0 — Framework desktop
- **tokio** ^1.0 — Async runtime
- **reqwest** ^0.11 — HTTP client
- **serde** ^1.0 — JSON serialization

## 🔄 Migration depuis Fyne

### Avant (Fyne)
```go
// main.go
app := fyne.NewApp()
window := app.NewWindow()
window.SetContent(createUI())
app.Run()
```

### Après (Tauri + React)
```
Frontend: React avec animations fluides + Tailwind
Backend: Tauri (Rust) + API HTTP en Go
```

**Avantages** :
✅ UI ultra-moderne (React)
✅ Animations fluides (Framer Motion)
✅ Responsive et accessible
✅ Design system cohérent (Tailwind)
✅ Performance meilleure
✅ Plus petit footprint (comparé à Electron)

## 🎨 Personnalisation

### Ajouter une nouvelle page

```typescript
// src/pages/Settings.tsx
import { motion } from 'framer-motion'

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Contenu */}
    </motion.div>
  )
}
```

### Ajouter une nouvelle commande Tauri

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub async fn my_command(param: String) -> Result<String, String> {
  // Implémentation
  Ok("résultat".to_string())
}

// src-tauri/src/lib.rs
tauri::generate_handler![my_command]
```

## 📝 Notes de configuration

### Tauri config (`tauri.conf.json`)
- Titre : "NeoGet - Installateur de logiciels moderne"
- Fenêtre : 1200x800px, resizable
- Identifiant : `fr.neoget.installer`
- Cible : NSIS + MSI installer

### Vite config (`vite.config.ts`)
- Port dev : 5173
- Build target : ES2021, Chrome 100+, Safari 13+
- Minify : esbuild (release) / false (debug)

## 🐛 Troubleshooting

### Erreur : "Cannot find module @tauri-apps/api"
```bash
npm install @tauri-apps/api
cargo add tauri
```

### Rust compilation errors
```bash
# Mettre à jour Rust
rustup update

# Nettoyer la build
cargo clean
```

### React warnings sur les hooks
Assurez-vous d'utiliser les hooks dans les composants fonctionnels et jamais de façon conditionnelle.

## 📚 Ressources

- [Tauri Docs](https://tauri.app/docs/)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [TypeScript](https://www.typescriptlang.org/)

## ✅ Checklist de migration

- [x] Structure Tauri créée
- [x] Frontend React configuré
- [x] Tailwind + TypeScript setup
- [x] Composants de base
- [x] API HTTP Go intégrée
- [ ] Tests e2e Tauri
- [ ] Icônes et assets
- [ ] Signing et distribution
- [ ] Documentation utilisateur

---

**NeoGet v2.0 - Ultra-moderne, performant, délicieux** 🎨✨
