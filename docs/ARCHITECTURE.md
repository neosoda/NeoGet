# Architecture de NeoGet v2.0

## Vue d'ensemble

NeoGet est passé d'une architecture monolithique en Go/Fyne à une stack moderne basée sur **Tauri 2.0**, alliant la puissance de **Rust** pour le backend et la flexibilité de **React 19** pour le frontend.

---

## Composants du Système

### 1. Frontend (React 19 + TypeScript)
- **Framework** : React 19 pour une gestion d'état réactive et performante.
- **Styling** : Tailwind CSS pour un design moderne, cohérent et responsive.
- **Animations** : Framer Motion pour des transitions fluides et un feedback utilisateur riche.
- **Communication** : Utilise `@tauri-apps/api` pour invoquer des commandes Rust (IPC) et écouter les événements de progression.

### 2. Backend (Tauri 2.0 + Rust)
- **Runtime** : Rust avec le framework Tauri pour un exécutable léger (~6MB) et sécurisé.
- **Orchestration** : Gère le cycle de vie de l'application et expose des commandes asynchrones au frontend.
- **Permissions** : Utilise le système de `capabilities` de Tauri 2.0 pour restreindre l'accès aux ressources système.

### 3. Logique d'Installation (WinGet Integration)
- **Exécution** : Utilise `tokio::process::Command` pour lancer l'exécutable `winget` en arrière-plan.
- **Paramètres** : Force l'acceptation des licences et l'installation silencieuse (`--silent`, `--force`, `--accept-package-agreements`).
- **Isolation** : Chaque installation est isolée dans sa propre tâche asynchrone, émettant des événements de progression en temps réel.

---

## Flux de données : Installation en Lot (Batch)

1. **Frontend** : L'utilisateur sélectionne plusieurs logiciels et clique sur "Tout installer".
2. **Invoke** : Le frontend appelle la commande Rust `install_software_batch(items)`.
3. **Rust Threading** : 
   - La commande lance immédiatement une tâche en arrière-plan via `tauri::async_runtime::spawn`.
   - La fonction `install_software_batch` retourne immédiatement un succès au frontend pour débloquer l'UI.
4. **Events** : 
   - La tâche Rust boucle sur les éléments.
   - Avant chaque installation, elle émet un événement `installation-progress` via `app.emit`.
   - Elle attend la fin de l'exécution de `winget` (await).
   - Une fois terminé, elle émet un événement final de succès ou d'erreur.
5. **UI Update** : Le frontend écoute via `listen('installation-progress')` et met à jour l'overlay en temps réel.

---

## Sécurité et Robustesse

- **ACL (Access Control Lists)** : Le dossier `src-tauri/capabilities` définit précisément quelles commandes et quels événements sont autorisés.
- **Délai de Synchronisation** : Un délai de 500ms est injecté au démarrage du batch pour garantir que les écouteurs d'événements du frontend sont actifs.
- **Gestion des Fenêtres** : Utilise des flags Windows (`CREATE_NO_WINDOW`) pour masquer les fenêtres de console WinGet, offrant une expérience intégrée et propre.
- **Privilèges** : Détection intelligente des erreurs de privilèges (0x80070005) pour informer l'utilisateur de la nécessité du mode Administrateur.

---

## Structure du Code Source

```
src/                      # Frontend
  ├── App.tsx             # Gestion de l'état global et orchestration
  ├── components/         # Composants UI atomiques
  └── software.json       # Catalogue de base (Starter Pack)

src-tauri/                # Backend
  ├── src/
  │    ├── main.rs        # Point d'entrée
  │    ├── lib.rs         # Configuration du runtime Tauri
  │    └── commands.rs    # Implémentation des commandes Rust
  └── capabilities/       # Définition des permissions Tauri 2.0
```

---

## RoadMap Technique
- [ ] **Tauri Plugins** : Migrer la gestion du système de fichiers vers les plugins officiels Tauri v2.
- [ ] **Logging** : Implémenter `tauri-plugin-log` pour un débogage unifié entre Rust et JS.
- [ ] **Tests** : Ajouter des tests d'intégration via `tauri-action`.
