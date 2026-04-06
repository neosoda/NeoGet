# Changelog — NeoGet

Tous les changements importants de ce projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) et le versioning suit [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2026-04-06

### ✨ Nouveautés (Réécriture Majeure)

#### Architecture Moderne (Tauri 2.0 + React 19)
- **Frontend** : Migration complète vers React 19 avec TypeScript.
- **Backend** : Remplacement du moteur Go par un backend Rust ultra-léger via Tauri 2.0.
- **Design** : Nouveau design system basé sur Tailwind CSS avec support natif du Mode Sombre.
- **Animations** : Intégration de Framer Motion pour des transitions fluides et un feedback utilisateur interactif.

#### Système d'Installation Batch
- **Parallélisme sécurisé** : Orchestration des installations via les tâches asynchrones de Rust (Tokio).
- **Suivi en temps réel** : Système d'événements IPC pour remonter la progression détaillée vers l'interface.
- **Robustesse** : Ajout de délais de synchronisation pour garantir la réception des événements sur le frontend.

#### Fonctionnalités WinGet
- **Recherche Globale** : Possibilité de rechercher et d'ajouter n'importe quel logiciel du dépôt WinGet officiel.
- **Auto-Installation WinGet** : Script Rust/PowerShell intégré pour installer WinGet s'il est manquant.
- **Permissions granulaires** : Utilisation du système de `capabilities` de Tauri 2.0 pour une sécurité accrue.

### 🔧 Changements
- **Suppression du Go** : Le dossier `legacy/` (anciennement cœur de l'app) a été supprimé au profit d'une implémentation 100% Rust/JS.
- **Poids de l'exécutable** : Réduction drastique de la taille finale (~6MB).
- **Performance** : Démarrage quasi instantané et consommation mémoire optimisée.

### 🐛 Bug Fixes
- **Correction du blocage "Préparation"** : Résolution du problème d'événements IPC bloqués par l'absence de permissions Tauri 2.0.
- **Race conditions** : Élimination des conflits d'accès lors des installations multiples grâce au modèle d'ownership de Rust.

---

## [1.0.0] — 2026-04-06

### ✨ Nouveautés
- **Architecture modulaire** (4 managers en Go).
- **Tests unitaires** (17 tests, ~85% couverture).
- **Thread-safety** : Utilisation de Mutexes pour protéger l'état de WinGet.
- **Timeouts** : Prévention des blocages lors des appels système.

---

## [0.1.0] — Initial (OpenNinite)

### ✨ Initiales
- Interface Fyne (Go) basique.
- Installation séquentielle via WinGet.
- Catalogue de 50+ logiciels.

---

## Roadmap v2.x

- [ ] **Historique local** : Journal des installations passées.
- [ ] **Auto-updater** : Mise à jour automatique de NeoGet via Tauri.
- [ ] **Import/Export** : Sauvegarde des listes de logiciels favoris.
- [ ] **Internationalisation** : Support multi-langues (FR/EN).
