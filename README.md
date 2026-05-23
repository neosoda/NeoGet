# NeoGet

**L'installateur Windows qui transforme une machine fraîche en poste prêt à travailler.**

NeoGet réunit le catalogue WinGet, une interface moderne et des actions groupées dans une app Tauri légère. On cherche, on choisit, on installe, on met à jour, on désinstalle. Sans terminal, sans copier-coller de commandes, sans perdre le fil.

```text
Frontend  React 19 + TypeScript + Tailwind CSS
Desktop   Tauri 2 + Rust
Package   Microsoft WinGet
Build     Vite + Cargo
Sortie    releases/neoget.exe (~5.7 MiB)
```

## Pourquoi NeoGet ?

Installer un nouveau PC Windows devrait prendre quelques minutes, pas un après-midi. NeoGet sert de cockpit simple pour les tâches que l'on répète tout le temps :

- préparer une installation Windows avec un Starter Pack d'outils essentiels ;
- rechercher n'importe quel paquet disponible sur WinGet ;
- installer plusieurs logiciels en une seule file d'attente ;
- voir les applications déjà installées ;
- détecter les mises à jour disponibles ;
- lancer une désinstallation propre ;
- exporter ou importer une configuration de logiciels.

## Aperçu

NeoGet propose une navigation claire par vues :

| Vue | Rôle |
| --- | --- |
| Starter Pack | Catalogue sélectionné pour démarrer vite après une installation Windows |
| Recherche WinGet | Recherche globale dans les dépôts WinGet officiels |
| Mises à jour | Détection et mise à jour des logiciels obsolètes |
| Mes Logiciels | Inventaire des applications installées et désinstallation |
| System Doctor | Diagnostic rapide de l'environnement Windows et WinGet |
| Paramètres | Sources, catalogue personnalisé et réglages |

## Démarrage rapide

### Utiliser l'application

```powershell
.\releases\neoget.exe
```

WinGet doit être disponible sur la machine. NeoGet peut aider à diagnostiquer l'état de WinGet depuis l'onglet System Doctor.

### Lancer en développement

```powershell
npm install
npm run tauri:dev
```

### Compiler l'exécutable

```powershell
npm run build
cd src-tauri
cargo build --release
```

L'exécutable compilé est ensuite copié dans :

```text
releases/neoget.exe
```

## Scripts utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance uniquement le frontend Vite |
| `npm run build` | Compile TypeScript et génère le frontend production |
| `npm run tauri:dev` | Lance l'app desktop en développement |
| `npm run tauri:nowatch` | Lance Tauri sans watcher |
| `npm run tauri:build` | Build Tauri complet selon la configuration locale |
| `cargo test` | Lance les tests Rust depuis `src-tauri` |

## Architecture

```text
NeoGet/
├── src/                  Interface React
│   ├── App.tsx           Shell principal, navigation et workflows
│   ├── components/       Vues, cartes, overlay d'installation, toasts
│   ├── hooks/            Panier, installation, thème, statut système
│   └── types.ts          Contrats TypeScript partagés côté UI
├── src-tauri/            Backend desktop Rust/Tauri
│   ├── src/commands.rs   Commandes WinGet, parsing, install/update/uninstall
│   ├── src/lib.rs        Configuration Tauri et plugins
│   └── tauri.conf.json   Fenêtre, sécurité, build desktop
├── software.json         Catalogue Starter Pack
├── docs/                 Documentation technique
└── releases/             Exécutable prêt à lancer
```

Le frontend reste concentré sur l'expérience utilisateur. Le backend Rust exécute les commandes système, applique les timeouts, parse les sorties WinGet et renvoie des données propres à l'interface.

## Points forts

- Interface desktop fluide avec React, Tailwind et Framer Motion.
- File d'installation groupée avec suivi de progression.
- Recherche WinGet globale avec normalisation des résultats.
- Inventaire des logiciels installés et centre de mises à jour.
- Panier d'installation, import/export de configuration et notifications.
- Diagnostic WinGet intégré pour repérer vite les soucis de sources ou de droits.
- Exécutable Windows autonome, sans serveur local à lancer.

## Qualité et sécurité

NeoGet garde une surface simple :

- les actions système passent par des commandes Tauri déclarées ;
- les installations sont protégées contre les exécutions concurrentes ;
- les processus WinGet ont des timeouts ;
- les erreurs de privilèges sont reformulées pour l'utilisateur ;
- les sorties WinGet localisées sont parsées avec tolérance.

Avant une livraison, vérifiez au minimum :

```powershell
npm run build
cd src-tauri
cargo test
cargo build --release
```

## Roadmap

- Historique local des installations, mises à jour et désinstallations.
- Profils réutilisables pour préparer différents types de machines.
- Export plus riche avec versions, sources et statut d'installation.
- Meilleure expérience de catalogue personnalisé.
- Signature et packaging installable lorsque la distribution sera stabilisée.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Installation développeur](docs/SETUP.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Changelog](docs/CHANGELOG.md)

## Licence

MIT

---

Construit avec React, Rust, Tauri et une obsession raisonnable pour les installations propres.
