<div align="center">

# NeoGet

### Le cockpit Windows moderne pour installer, mettre a jour, nettoyer et optimiser un poste avec WinGet.

NeoGet rassemble le gestionnaire de paquets, le diagnostic systeme et un toolkit Windows dans une application desktop Tauri elegante, rapide et locale.

<p>
  <a href="releases/neoget.exe"><strong>Telecharger l'exe</strong></a>
  ·
  <a href="docs/SETUP.md">Installation dev</a>
  ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
  ·
  <a href="docs/CHANGELOG.md">Changelog</a>
</p>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?style=for-the-badge&logo=tauri&logoColor=fff)
![Rust](https://img.shields.io/badge/Rust-backend-000?style=for-the-badge&logo=rust&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)
![WinGet](https://img.shields.io/badge/WinGet-native-22D3B6?style=for-the-badge&logo=windows&logoColor=111)

<br />

<img src="docs/assets/neoget-app.png" alt="Capture de NeoGet - Toolkit Windows" width="100%" />

</div>

## Pourquoi NeoGet

Installer une machine Windows proprement demande souvent plusieurs outils : WinGet en terminal, des scripts PowerShell, le panneau des applications, le planificateur de taches et quelques reglages registre. NeoGet reunit ces flux dans une interface unique, lisible et actionnable.

| Workflow | Ce que NeoGet apporte |
| --- | --- |
| Installer un poste neuf | Starter Pack par categories, panier et installation groupee |
| Trouver une app | Recherche WinGet globale avec ajout direct au panier |
| Maintenir le parc logiciel | Centre de mises a jour et inventaire des apps installees |
| Nettoyer Windows | Nettoyage cible des caches, temporaires, miniatures et corbeille |
| Optimiser le systeme | Toggles Explorer, confidentialite, gaming, interface et energie |
| Controler le demarrage | Gestion des entrees de demarrage et des taches planifiees |
| Diagnostiquer WinGet | Verification des sources, droits, ressources et version WinGet |

## Fonctionnalites

### Gestion logiciels

- Catalogue Starter Pack organise par usages.
- Recherche directe dans les depots WinGet.
- Panier flottant pour preparer une installation multiple.
- Suivi de progression avec file d'attente, erreurs visibles et overlay minimisable.
- Mise a jour, inventaire et desinstallation via WinGet.
- Import/export de configurations JSON.

### Toolkit Windows

- Optimisations rapides : extensions de fichiers, fichiers caches, vue compacte, menu contextuel classique, Widgets, Game DVR, Copilot, hibernation.
- Nettoyage local : temporaires utilisateur, temporaires systeme, prefetch, miniatures, cache Windows Update, corbeille.
- Inventaire AppX pour inspecter et supprimer les applications Windows amovibles.
- Gestion des programmes au demarrage.
- Gestion des taches planifiees non Microsoft.
- Verrouillage clair des actions qui demandent les droits administrateur.

### Diagnostic et robustesse

- System Doctor avec RAM, disque, OS, mode developpeur et version WinGet.
- Reinitialisation des sources WinGet depuis l'interface.
- Mise a jour des sources (`winget source update`) et suppression rapide de `msstore`.
- Upgrade global non bloquant (`winget upgrade --all`) avec options `--include-unknown`, `--force`, `--silent`, `--disable-interactivity`.
- Profils de maintenance WinGet : rapide, reparation des sources, maintenance forcee.
- Nettoyage cache WinGet et ouverture directe des parametres Delivery Optimization.
- Parsing tolerant des sorties WinGet localisees.
- Timeouts sur les commandes longues.
- Blocage des installations concurrentes.
- Sorties PowerShell forcees en UTF-8.

## Installation

### Utiliser l'executable

L'executable de test est versionne dans le projet :

```powershell
.\releases\neoget.exe
```

Pour les actions systeme avancees du Toolkit Windows, lancez NeoGet en administrateur. Les actions non compatibles avec les droits standard restent bloquees dans l'interface.

### Preparer l'environnement dev

Prérequis :

- Windows 10 ou 11
- WinGet installe et fonctionnel
- Node.js recent
- Rust et Cargo

Installer les dependances :

```powershell
npm install
```

Lancer le frontend seul :

```powershell
npm run dev
```

Lancer l'application desktop :

```powershell
npm run tauri:dev
```

## Build

Compiler une version Tauri optimisee :

```powershell
npm run tauri:build
```

Copier le binaire compile dans le dossier `releases` :

```powershell
Copy-Item `
  "$env:USERPROFILE\.cargo\target\neoget\release\neoget.exe" `
  ".\releases\neoget.exe" `
  -Force
```

Le fichier attendu pour validation est :

```text
releases/neoget.exe
```

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le frontend Vite |
| `npm run build` | Compile TypeScript et genere le bundle web |
| `npm run tauri:dev` | Lance NeoGet en mode desktop developpement |
| `npm run tauri:nowatch` | Lance Tauri sans watcher |
| `npm run tauri:build` | Compile l'application desktop release |
| `npm run launch` | Build frontend puis lance Tauri sans watcher |

## Architecture

```text
NeoGet/
├── src/
│   ├── App.tsx                         Shell, navigation et workflows globaux
│   ├── components/
│   │   ├── SoftwareGrid.tsx            Starter Pack et recherche WinGet
│   │   ├── WindowsToolkitView.tsx      Toolkit Windows integre
│   │   ├── SystemDoctorView.tsx        Diagnostic local
│   │   └── ...                         Panier, palette, toasts, vues metier
│   ├── hooks/                          Theme, panier, installation, statut
│   ├── index.css                       Design system Tailwind
│   └── types.ts                        Contrats UI
├── src-tauri/
│   ├── src/commands.rs                 Commandes WinGet, PowerShell, systeme
│   ├── src/lib.rs                      Enregistrement des commandes Tauri
│   └── tauri.conf.json                 Configuration desktop
├── docs/
│   └── assets/neoget-app.png           Capture utilisee par ce README
├── releases/
│   └── neoget.exe                      Executable de test
├── software.json                       Catalogue Starter Pack
└── package.json                        Scripts frontend et Tauri
```

## Stack

| Couche | Technologie |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS, Framer Motion |
| Desktop | Tauri 2 |
| Systeme | Rust, Tokio, PowerShell, WinGet |
| Build | Vite, Cargo |
| Catalogue | `software.json` et catalogues JSON externes |

## Securite

NeoGet execute les actions sensibles localement depuis Tauri. Les commandes systeme ne quittent pas la machine, les actions administrateur sont signalees, et les operations longues renvoient des messages d'erreur lisibles au lieu de rester silencieuses.

## Roadmap

- Profils reutilisables par type de machine.
- Historique local des installations, mises a jour et suppressions.
- Export enrichi avec versions et statut.
- Packaging installable signe.
- Meilleure edition visuelle des catalogues personnalises.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Installation developpeur](docs/SETUP.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Changelog](docs/CHANGELOG.md)

## Licence

MIT

---

<div align="center">

Construit avec React, Rust, Tauri et WinGet pour garder Windows propre sans ouvrir dix consoles.

</div>
