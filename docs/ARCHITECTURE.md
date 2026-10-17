# Architecture de NeoGet v2.2

## Vue d'ensemble

NeoGet est basé sur **Tauri 2.0**, alliant la puissance de **Rust** pour le backend et la flexibilité de **React 19** pour le frontend, sans aucune télémétrie ni dépendance cloud.

---

## Composants du Système

### 1. Frontend (React 19 + TypeScript)
- **Framework** : React 19 pour une gestion d'état réactive et performante.
- **Styling** : Tailwind CSS pour un design moderne, cohérent et responsive.
- **Animations** : Framer Motion pour des transitions fluides et un feedback utilisateur riche.
- **Communication** : Utilise `@tauri-apps/api` pour invoquer des commandes Rust (IPC) et écouter les événements d'opérations (`operation-changed`).
- **Réconciliation d'état** : [`src/operationState.ts`](../src/operationState.ts) garantit qu'un événement tardif `queued` ou `running` n'écrase jamais une opération déjà terminée (`success` ou `failed`).

### 2. Backend (Tauri 2.0 + Rust)
- **Runtime** : Rust avec le framework Tauri pour un exécutable léger (~6 Mo) et sécurisé.
- **Orchestration & File d'opérations (`OperationManager`)** : [`src-tauri/src/operations.rs`](../src-tauri/src/operations.rs) centralise les opérations WinGet (`install`, `upgrade`, `uninstall`), les déduplique par `(kind, package_id)` et les exécute séquentiellement via un sémaphore (`Semaphore::new(1)`).
- **Journalisation & Rotation** : [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs) initialise `tauri-plugin-log` vers `%LOCALAPPDATA%\NeoGet\logs\NeoGet.log` avec rotation automatique au-delà de 5 Mo (`NeoGet.log.1`).
- **Permissions** : Utilise le système de `capabilities` de Tauri 2.0 (`src-tauri/capabilities/default.json`) pour restreindre l'accès aux ressources système.

### 3. Moteur Système (WinGet & Toolkit Windows)
- **Exécution WinGet** : Utilise `tokio::process::Command` pour lancer `winget` en arrière-plan (`CREATE_NO_WINDOW`) avec acceptation des licences (`--accept-package-agreements`, `--accept-source-agreements`) et support des modes `silent` et `interactive`.
- **Toolkit Windows** : [`src-tauri/src/commands.rs`](../src-tauri/src/commands.rs) expose les optimisations registre/système réversibles, le nettoyage de caches (Temp, Prefetch, Miniatures, Windows Update, CrashDumps, Corbeille), la gestion des paquets AppX, du démarrage et des tâches planifiées.

---

## Flux de données : File d'Opérations (`OperationManager`)

1. **Frontend** : L'utilisateur lance une action unitaire ou par lot via [`useInstallation.ts`](../src/hooks/useInstallation.ts).
2. **Invoke** : Le frontend appelle `queue_install`, `queue_install_batch`, `queue_upgrade`, `queue_upgrade_batch` ou `queue_uninstall`.
3. **Admission & Déduplication** :
   - `OperationManager::enqueue` vérifie la validité du paquet et rattache toute requête dupliquée en cours au `OperationRecord` existant.
   - Crée un enregistrement `queued` horodaté et émet immédiatement `operation-changed`.
4. **Exécution Séquentielle** :
   - Chaque tâche attend la fin de la précédente et acquiert le permis exclusif du sémaphore.
   - Passe à l'état `running`, exécute la commande `winget`, puis passe à `success` ou `failed` en émettant `operation-changed`.
5. **UI Update** : Le frontend combine l'écoute temps réel (`listen('operation-changed')`) et un rafraîchissement périodique (`list_operations`) tant qu'une opération est active.

---

## Sécurité et Robustesse

- **ACL (Access Control Lists)** : Le dossier `src-tauri/capabilities` définit précisément quelles commandes et quels événements sont autorisés.
- **Exclusion Mutuelle** : Les opérations du Toolkit Windows utilisent `OperationManager::try_exclusive()` pour éviter les exécutions système concurrentes.
- **Gestion des Fenêtres** : Utilise le flag Windows `CREATE_NO_WINDOW` (`0x08000000`) pour masquer les consoles enfants.
- **Privilèges** : Détection des erreurs de privilèges (`0x80070005` / `Access is denied`) et verrouillage explicite des actions nécessitant le mode Administrateur.

---

## Structure du Code Source

```text
src/                              # Frontend React 19 + TypeScript
  ├── App.tsx                     # Shell principal et navigation
  ├── operationState.ts           # Réconciliation déterministe des opérations
  ├── types.ts                    # Contrats TypeScript partagés
  ├── components/                 # Vues et composants UI (Toolkit, Grid, Doctor, etc.)
  └── hooks/                      # Hooks métier (useInstallation, useCart, useSystemStatus)

src-tauri/                        # Backend Tauri 2.0 + Rust
  ├── src/
  │    ├── main.rs                # Point d'entrée binaire
  │    ├── lib.rs                 # Configuration Tauri, logger et handlers IPC
  │    ├── operations.rs          # File d'attente séquentielle et déduplication
  │    └── commands.rs            # Implémentation WinGet, Diagnostic et Toolkit Windows
  └── capabilities/               # Définition des permissions Tauri 2.0
```
