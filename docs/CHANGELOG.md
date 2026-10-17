# Changelog — NeoGet

Tous les changements importants de ce projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) et le versioning suit [Semantic Versioning](https://semver.org/).

## [2.3.0] — 2026-10-17

### ✨ Nouveautés
- **Toolkit Windows Étendu (19 optimisations)** :
  - **Explorateur** : Ouvrir sur Ce PC (`launch_to_this_pc`), Historique du presse-papiers Win+V (`clipboard_history`).
  - **Interface** : Alignement barre des tâches à gauche (`taskbar_left_align`), Bouton Fin de tâche au clic droit (`taskbar_end_task`).
  - **Apparence** : Mode sombre natif Windows et applications (`dark_mode`).
  - **Gaming** : Désactivation de la précision du pointeur pour mouvement 1:1 (`disable_mouse_acceleration`).
  - **Confidentialité** : Désactivation des suggestions web Bing dans la recherche Démarrer (`disable_bing_search`).
  - **Performance** : Accélération d'affichage des menus et suppression des délais Explorer (`speed_up_menus`).
  - **Système** : Activation automatique du pavé numérique au démarrage (`numlock_on_boot`).
- **Nettoyage CrashDumps** : Nouvelle cible de nettoyage pour les fichiers de vidage mémoire locaux des applications plantées (`%LOCALAPPDATA%\CrashDumps`).
- **Sécurité et Contrôle d'Intégrité** : Whitelists strictes Rust pour les identifiants d'optimisation et de nettoyage.
- **Sécurisation Export JSON** : Encodage hexadécimal UTF-8 avant injection dans les dialogues PowerShell.
- **Portabilité du Pipeline** : Résolution dynamique de `%USERPROFILE%` / `$env:USERPROFILE` dans les scripts de build et de release.
- **Intégration Sentinel SDD** : Spécification complète et traçabilité des critères d'acceptation, des tâches et des preuves de vérification.

---

## [2.2.0] — 2026-08-09

### ✨ Nouveautés
- **Installateur Windows Officiel NSIS** : Génération automatique de l'installateur autonome `NeoGet-Setup-2.2.0-x64.exe` avec intégration dans le menu Démarrer Windows, raccourcis et désinstallateur propre.
- **Pipeline de Release One-Click (`build-release.ps1`)** : Script PowerShell fail-fast automatisant les vérifications, tests, builds, génération d'installateur et hachage SHA-256 (`SHA256SUMS.txt`).
- **Gestion des Logs & Rotation** : Migration du dossier de logs vers `%LOCALAPPDATA%\NeoGet\logs\NeoGet.log` avec rotation automatique (> 5 Mo -> `.1`).
- **Écran À Propos** : Section dédiée dans l'interface affichant dynamiquement la version 2.2.0, l'éditeur et la licence MIT.

---

## [2.1.0] — 2026-05-30

### ✨ Nouveautés
- **WinGet non bloquant** : upgrade global via `winget upgrade --all` depuis l'interface.
- **Arguments intelligents** : gestion UI des options `--include-unknown` et `--force`, plus mode `silent`/`interactive`.
- **Sources WinGet** : actions dédiées `source update`, `source reset --force`, suppression `msstore`, restauration des sources.
- **Maintenance guidée** : profils rapides (`fast-upgrade`, `repair-sources`, `full-maintenance`).
- **Ops système WinGet** : nettoyage du cache DiagOutputDir et accès direct à Delivery Optimization.

### 🔧 Changements
- Les commandes install/upgrade/uninstall utilisent maintenant les options runtime cohérentes avec le mode d’exécution utilisateur.
- Le flux "Tout mettre à jour" remplace la boucle applicative par un appel `winget` global plus rapide.

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
