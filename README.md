# NeoGet v2.0 — Installateur de logiciels moderne

**Application Windows ultra-moderne pour installer vos logiciels en un clic.**

```
Frontend:  React 19 + TypeScript + Tailwind CSS
Backend:   Tauri 2.0 (Rust)
Build:     Vite + Cargo
Size:      6.2 MB (standalone executable)
```

---

## 🚀 Démarrage rapide

### Option 1 : Lancer directement l'exe
```bash
releases/neoget.exe
```

### Option 2 : Développer
```bash
npm install
npm run tauri:dev
```

### Option 3 : Recompiler
```bash
npm run tauri:build
```

---

## 📁 Structure du projet

```
NeoGet/
├── releases/
│   └── neoget.exe              ← 🎉 Application compilée (6.2 MB)
│
├── src/                        ← Frontend React
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   └── components/
│       ├── Header.tsx
│       ├── SoftwareGrid.tsx
│       └── InstallationOverlay.tsx
│
├── src-tauri/                  ← Backend Tauri/Rust
│   ├── src/
│   │   ├── main.rs              # Point d'entrée
│   │   ├── lib.rs               # Configuration du runtime
│   │   └── commands.rs          # Logique d'installation (Rust)
│   ├── tauri.conf.json          # Configuration Tauri
│   └── Cargo.toml               # Dépendances Rust
│
├── docs/                       ← Documentation technique
│   ├── ARCHITECTURE.md         # Architecture v2.0
│   ├── SETUP.md                # Guide d'installation dev
│   └── ...
│
└── Configuration Files
    ├── package.json            # Dépendances npm
    ├── vite.config.ts          # Build Vite
    ├── tailwind.config.js      # Design tokens
    └── tsconfig.json           # TypeScript config
```

---

## 🎨 Features

✅ **Modern UI** — React 19 avec animations fluides (Framer Motion)  
✅ **Batch Install** — Installation multiple avec barre de progression  
✅ **Dark Mode** — Toggle intégré avec persistence (localStorage)  
✅ **Lightweight** — Exécutable autonome de ~6MB  
✅ **Search** — Recherche globale via les dépôts WinGet  
✅ **Safety** — Orchestration Rust sécurisée sans dépendances externes  

---

## 🔧 Développement

### Installation dépendances (une seule fois)
```bash
npm install
```

### Mode développement (hot-reload)
```bash
npm run tauri:dev
```

### Build production
```bash
npm run tauri:build
# Crée: releases/neoget.exe
```

---

## 📊 Tech Stack

| Composant | Technologie |
|-----------|------------|
| **Frontend** | React 19 + TypeScript |
| **Styling** | Tailwind CSS 3.4 |
| **Animations** | Framer Motion 11 |
| **UI Framework** | Tauri 2.0 |
| **Backend** | Rust (Tokio) |
| **Installer** | Microsoft WinGet |

---

## 🎯 Roadmap v2.x

1. **Auto-updates** — Mise à jour automatique de l'application via Tauri updater.
2. **Historique** — Journal local des installations réussies/échouées.
3. **Export/Import** — Sauvegarder et restaurer sa liste de logiciels.
4. **Custom Sources** — Support de sources WinGet personnalisées.

---

## 📚 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Détails techniques du backend Rust.
- **[SETUP.md](docs/SETUP.md)** — Guide détaillé pour les développeurs.

---

## 📝 License

MIT

---

**Fait avec ❤️ en React + Rust + Tauri**
