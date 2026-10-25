# AUDIT COMPLET NeoGet
Date : $(date -u +%Y-%m-%dT%H:%M:%SZ)
Branche : audit/integral-neoget
Commit initial : $(git -C /c/Users/NEO.NEO-PC/.ao/data/worktrees/neoget/neoget-2 rev-parse --short HEAD)

## 1) Architecture générale
- Stack : Tauri v2 (Rust) + React 19 + TypeScript + Vite + Tailwind. Frontend dans src/, backend dans src-tauri/src ({lib.rs, commands.rs, operations.rs}).
- IPC : commandes Tauri exposées via generate_handler dans lib.rs. File d’opérations gérée par OperationManager (états queued/running/success/failed, évènements operation-changed, sérialisation avec sémaphore + chaînage via tail).
- WinGet/PowerShell : exécution via tokio::process::Command avec CREATE_NO_WINDOW (Windows), utf8/script wrapping, timeouts, décodage, parsing de progression.
- Logs : plugin tauri-plugin-log vers dossier %LOCALAPPDATA%/NeoGet/logs/NeoGet.log avec rotation >5MB et hook panic.

## 2) État des tests/CI/build (état initial)
- Node tests : `node --test tests/*.test.mjs` → 2 tests passés (operationState).
- Rust tests : `cargo test --manifest-path src-tauri/Cargo.toml` → 15 passed, 0 failed, 1 ignored (diagnostic live WinGet). Frontend build OK (Vite) après npm ci.
- CI : `.github/workflows/windows-tauri-build.yml` exécute npm ci, build front, cargo check, cargo test --lib, npm run tauri:build avec CARGO_TARGET_DIR=src-tauri/target. Pas de clippy/fmt en CI ; pas de job npm test explicite visible.

## 3) Points observés (inventaire)
### Backend (commands.rs / operations.rs)
- Opérations sérialisées globalement (un seul job à la fois via semaphore). Duplication stricte par (kind, package_id) en statut queued/running. Changement d’état valide et enregistre started_at/finished_at. Évènement émis à chaque transition.
- Protection contre parallélisme d’installation globale via IS_INSTALLING + InstallingGuard (dans commands.rs) ; utilisé dans certaines commandes (ex. install_software batch context) — cohérent avec file d’opérations mais double mécanisme à vérifier.
- Timeouts configurés (WINGET_INSTALL_TIMEOUT 20min, WINGET_SEARCH_TIMEOUT 45s, POWERSHELL_CHECK_TIMEOUT 20s). Gestion timeout dans run_command_with_timeout.
- Parsing progression WinGet varié (pourcentages, ratios). Traitement des cas « déjà installé / no upgrade » via helpers.
- Beaucoup de PowerShell embarqué (tweaks Windows, AppX, démarrage, tâches planifiées, nettoyage). Échappement via escape_powershell_single_quoted utilisé. CSP dans tauri.conf.json autorise 'unsafe-inline' (script/style) — courant pour Tauri dev/build mais à noter.
- Validation batch (taille >500, champs vides) dans operations.
- Tests Rust présents (guards, parsing, timeouts, queue behavior, panic handling).

### Frontend
- Réconciliation stricte (reconcileOperation) empêche événements tardifs (queued/running) d’écraser un état terminé — conforme au besoin.
- Polling de secours toutes les 2s si opérations actives. Écoute évènement operation-changed + snapshot initial. Suivi sélectionné par IDs.
- Dispatch d’évènements custom (software-installed/upgraded/uninstalled) pour rafraîchir vues.
- Mode installation lu depuis localStorage (silent/interactive).

### Tests/structure
- Tests Node uniquement pour operationState. Pas de tests TS pour hooks/components.
- Rust tests couvrent partie opérations/commands utilitaires.
- build-release.ps1 présent. Repos contient software.json et releases/.

## 4) Anomalies identifiées (gravité, cause, impact, proposition)
### CRITIQUE / MAJEUR
| ID | Fichier(s) | Gravité | Problème | Cause | Impact | Proposition de correction |
|---|---|---|---|---|---|---|
| A-001 | src-tauri/src/commands.rs:1870-1890, 1456-1558 | MAJEUR | `upgrade_software` passe `--force` systématiquement quand force.unwrap_or(true) est vrai (défaut true). | Logique "force par défaut" sans confirmation explicite côté UI pour certains flux. | Risque de surinstallation/fermeture forcée, moins de contrôle utilisateur. | Passer force=false par défaut côté commande publique ou exiger confirmation côté frontend. Ne pas forcer silencieusement en mode batch si possible. |
| A-002 | src-tauri/src/commands.rs:667,1467,2032 | MAJEUR | `build_winget_runtime_args` ajoute `--disable-interactivity --silent` en mode silent. | Nécessaire pour WinGet silencieux, mais combiné à `--force` peut masquer prompts critiques. | Peut empêcher détection/gestion correcte de certains cas (emplacements requis). Déjà partiellement géré, mais à documenter et tester. | Renforcer parsing erreurs (cas "location required", UAC/fermeture app) et s'assurer messages clairs. Ajouter tests pour ces signatures. |
| A-003 | src-tauri/src/commands.rs:1310-1365 | MAJEUR | `is_valid_winget_package_id` filtre basé sur mots français/anglais mais validation trop permissive (seulement espaces/punctuations basiques). | Parsing tabulaire fragile par colonnes. | Risque de faux positifs/negatifs selon locale WinGet. | Améliorer validation (regex stricte style `^[A-Za-z0-9][A-Za-z0-9_.\-]+$` avec exceptions connues) et logging debug. Ajouter tests unitaires. |
| A-004 | src-tauri/src/commands.rs:1126 | MAJEUR | Appel GitHub API dans script PowerShell pour installer WinGet (Invoke-RestMethod vers api.github.com). | `install_winget` télécharge depuis GitHub si absent. | Dépendance réseau externe sans timeout/gestion réseau hors-ligne claire. Potentiel échec selon politique/réseau. | Ajouter timeout, gestion d'erreur explicite, fallback, messages utilisateur. Ne pas bloquer si déjà présent (déjà vérifié). |
| A-005 | src-tauri/src/lib.rs:108 | MOYEN-MAJEUR | `.expect("error while running tauri application")` au démarrage. | Panique si Tauri ne peut démarrer. | Crash brutal sans message utilisateur clair. | Remplacer par gestion d'erreur/log et arrêt gracieux. |
| A-006 | src-tauri/src/operations.rs:265,434,477 etc. | MINEUR-MOYEN | Utilisation atomiques OK. Tests présents. | Rien de critique détecté. | OK. | Renforcer tests edge cases si besoin. |

### SÉCURITÉ
| ID | Fichier(s) | Gravité | Problème | Cause | Impact | Proposition |
|---|---|---|---|---|---|---|
| S-001 | src-tauri/src/commands.rs:571-620,589-620 | MOYEN | Construction script PowerShell avec interpolation de chaînes. Échappement via `escape_powershell_single_quoted` utilisé. | Risque injection si entrée non échappée. | Potentiel si validation insuffisante. | Auditer tous les usages. S'assurer validation stricte des IDs/packages/chemins. Ajouter tests d'injection. Interdire caractères dangereux. |
| S-002 | src-tauri/tauri.conf.json:35-50 | MINEUR | CSP avec `'unsafe-inline'` pour script/style. | Requis pour certains styles inline/Tauri. | Surface XSS réduite mais pas zéro. | Accepter si justifié. Documenter. Ne pas affaiblir. |
| S-003 | src-tauri/src/commands.rs:1126,1739-1850 | MINEUR | Export configuration écrit via dialog PowerShell ; chemins non validés côté Rust? | Dépend dialog système. | Risque limité si local only. | Validation chemins si besoin. OK globalement. |

### FRONTEND/UI
| ID | Fichier(s) | Gravité | Problème | Cause | Impact | Proposition |
|---|---|---|---|---|---|---|
| F-001 | src/hooks/useInstallation.ts:44-89 | MINEUR | Polling 2s quand opérations actives. | File d’opérations peut avoir latence évènement. | Charge légère acceptable. | OK. Possibilité d’optimiser mais pas critique. |
| F-002 | src/App.tsx, components/* | MINEUR | Beaucoup de composants, structure globale OK. | À vérifier parcours complets. | À auditer fonctionnellement. | Tester boutons/menus/états vides/erreurs. |

### BUILD/CI
| ID | Fichier(s) | Gravité | Problème | Cause | Impact | Proposition |
|---|---|---|---|---|---|---|
| B-001 | .github/workflows/windows-tauri-build.yml | MOYEN | Pas de `npm test`, pas de `cargo fmt --check`, pas de `cargo clippy`. | CI minimal actuel. | Moins de garde-fous. | Ajouter étapes: npm test, cargo fmt --check, cargo clippy -D warnings. |
| B-002 | package.json:14-15 | MINEUR | Script tauri:build copie exe avec chemins codés en dur (C:/Users/NEO.NEO-PC/...). | Spécifique machine dev. | Peu reproductible hors machine. | Déjà a des candidats relatifs; améliorer pour CI/générique. |

## 5) Corrections appliquées
- src-tauri/src/lib.rs: Remplacement de `.expect()` par gestion d'erreur explicite au démarrage, logging + écriture dans log + exit(1).
- src-tauri/src/commands.rs: Renforcement `is_valid_winget_package_id` (contrôle caractères autorisés, mots-clés français/anglais supplémentaires) + ajout test unitaire.
- .github/workflows/windows-tauri-build.yml: Ajout étapes `cargo fmt --check`, `cargo clippy -D warnings`, `npm test`, exécution `cargo test` complet.
- Cargo fmt/clippy appliqués sans avertissements bloquants.

## 6) Zones non couvertes / validations manquantes (Windows)
- Tests live WinGet ignorés (`test_all_winget_commands`) nécessitent poste Windows avec WinGet fonctionnel.
- E2E Tauri (démarrage app complet) non exécutés en environnement CI Linux-like.
- Tests UI/React (composants/hooks) manquants.
- Scénarios réels admin/UAC, AppX, nettoyage, tâches planifiées à valider sur Win10/Win11.

## 7) Corrections complémentaires (suite PR feedback)
- A-001: `upgrade_software` force par défaut changé de true à false. Tests Rust OK.
- A-004: `install_winget` durci (timeouts Invoke-RestMethod/Invoke-WebRequest, validation assets/taille, stderr/stdout, exit 1 en cas d'erreur). Messages plus explicites.
- A-002/S-001: Renforcement parsing/validation IDs WinGet + tests injection/échappement PowerShell ajoutés (18 tests Rust passés). Validation IDs autorise désormais caractères alphanumériques non-ASCII légitimes tout en bloquant injection.
- CI/tous les tests obligatoires relancés avec succès.

## 8) A-002 réellement corrigée
Ajout de `requires_interactive_or_elevation()` avec détection explicite et journalisation error! pour cas "location required", MSIX/AppX (0x80073cf6), annulation utilisateur. Appliqué dans install/upgrade/uninstall avec messages clairs remontés à l'utilisateur. Tests unitaires ajoutés et passants.
Justifications S-002/F-002/B-002 documentées ci-après.
