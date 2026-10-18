<div align="center">

# 🚀 NeoGet

### *Le gestionnaire WinGet et toolkit d'optimisation pour Windows*

NeoGet rassemble le gestionnaire de paquets WinGet, le diagnostic système en temps réel et un ensemble d'optimisations Windows au sein d'une application desktop **Tauri v2** rapide, moderne et 100 % locale.

<br />

[![Release](https://img.shields.io/badge/Release-v2.3.3-32A7F3?style=for-the-badge&logo=github&logoColor=fff)](releases/NeoGet-Setup-2.3.3-x64.exe)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-24C8DB?style=for-the-badge&logo=tauri&logoColor=fff)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-backend-000000?style=for-the-badge&logo=rust&logoColor=fff)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![WinGet](https://img.shields.io/badge/WinGet-Native-22D3B6?style=for-the-badge&logo=windows&logoColor=111)](https://learn.microsoft.com/windows/package-manager/winget/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

<p>
  <a href="releases/NeoGet-Setup-2.3.3-x64.exe"><strong>⚡ Télécharger l'installateur Windows (.exe)</strong></a>
  ·
  <a href="docs/SETUP.md"><strong>📖 Guide Dev</strong></a>
  ·
  <a href="docs/ARCHITECTURE.md"><strong>🏗️ Architecture</strong></a>
  ·
  <a href="docs/CHANGELOG.md"><strong>📋 Changelog</strong></a>
</p>

<br />

<img src="docs/assets/neoget-app.png" alt="NeoGet App Screenshot" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />

</div>

---

## ✨ Fonctionnalités clés

Configurer ou maintenir un poste Windows propre nécessite souvent plusieurs outils distincts : terminaux, scripts PowerShell, planificateur de tâches et éditeur de registre.

**NeoGet réunit ces flux** dans une interface sobre, rapide et sécurisée, sans télémétrie ni dépendance cloud.

| Domaine | Fonctionnalité |
| --- | --- |
| **📦 Installation initiale** | Catalogue *Starter Pack* catégorisé, panier multi-sélection et installation groupée séquentielle. |
| **🔍 Recherche universelle** | Exploration directe du catalogue officiel WinGet avec ajout au panier en un clic. |
| **🔄 Maintenance applicative** | Analyse des versions obsolètes et ajout des mises à jour à une file d'attente orchestrée par le backend. |
| **🧹 Nettoyage système** | Analyse et purge ciblée des caches temporaires, Prefetch, miniatures et résidus Windows Update. |
| **⚡ Optimisations Windows** | Ajustements rapides réversibles : menu contextuel classique, masquage Copilot/Widgets, Game DVR, etc. |
| **🚀 Contrôle du démarrage** | Audit et gestion des programmes au démarrage et tâches planifiées non-Microsoft. |
| **🩺 System Doctor** | Diagnostic RAM, disque, état OS et profils de réparation des sources WinGet. |

---

## 🎨 Vues principales

### 1. Starter Pack & Recherche WinGet
- **Sélection rapide** : Outils indispensables catégorisés (Navigateurs, Développement, Multimédia, Bases de données, Productivité).
- **Panier dynamique** : Préparation d'une file d'attente d'installation avec suivi de progression en overlay minimisable.
- **Import / Export JSON** : Sauvegarde et restauration de configurations logicielles.
- **File d'opérations fiable** : Les installations, mises à jour et désinstallations sont gérées séquentiellement par le backend avec déduplication stricte.

### 2. Centre de mises à jour & Logiciels installés
- **Inventaire local complet** : Liste et filtrage rapide de toutes les applications installées sur la machine.
- **Mises à jour intelligentes** : Mises à jour individuelles ou par lot, avec détection des paquets inconnus et mode forcé.
- **Désinstallation sécurisée** : Confirmation explicite pour éviter toute suppression involontaire.

### 3. Toolkit Windows
- **Explorateur** : Afficher les extensions de fichiers, éléments cachés, vue compacte et menu contextuel classique.
- **Confidentialité & Performances** : Masquer les Widgets, désactiver Game DVR, désactiver Windows Copilot, limiter les suggestions.
- **Nettoyeur de caches** : Purge sécurisée du dossier Temp, Prefetch, cache Windows Update et miniatures Explorer.
- **Gestionnaire AppX & Démarrage** : Désinstallation des paquets UWP/AppX amovibles et contrôle des éléments au démarrage.

### 4. System Doctor & Sources
- **Capteurs système** : Visualisation en temps réel de la consommation mémoire RAM et de l'espace disque.
- **Maintenance WinGet** : Mise à jour des sources, réinitialisation forcée, nettoyage de cache et réparation.

---

## 🚀 Prise en main

### 1. Téléchargement et installation

Téléchargez l'installateur Windows officiel :

- **Installateur NSIS** : [`releases/NeoGet-Setup-2.3.3-x64.exe`](releases/NeoGet-Setup-2.3.3-x64.exe)
- **Version portable** : [`releases/NeoGet-2.3.3-x64.exe`](releases/NeoGet-2.3.3-x64.exe)

> **Note** : Pour appliquer les optimisations système avancées du Toolkit Windows, lancez NeoGet avec les privilèges administrateur (`Clic droit -> Exécuter en tant qu'administrateur`).

### 2. Développement local

#### Prérequis
- Windows 10 ou Windows 11
- WinGet installé et fonctionnel
- Node.js (v20 ou v22 LTS)
- Rust & Cargo (stable)

#### Installation & Lancement
```powershell
# 1. Cloner le dépôt
git clone https://github.com/neosoda/NeoGet.git
cd NeoGet

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement avec Hot-Reload
npm run tauri:dev
```

#### Compilation Release
```powershell
# Compiler le frontend et l'application Tauri v2
npm run tauri:build
```

---

## 🏗️ Architecture & Stack technique

```text
NeoGet/
├── src/                                # Frontend React 19 + TypeScript
│   ├── App.tsx                         # Shell principal et navigation
│   ├── components/                     # Vues UI (Grid, Toolkit, Doctor, Cart, Palette, Settings)
│   ├── hooks/                          # Hooks d'état (Panier, Thème, Statut, Installation)
│   ├── operationState.ts               # Réconciliation d'état de la file d'opérations
│   └── index.css                       # Styles Tailwind CSS et design system
├── src-tauri/                          # Backend Rust & Tauri v2
│   ├── src/commands.rs                 # Commandes IPC, exécution WinGet et PowerShell
│   ├── src/operations.rs               # Orchestration, déduplication et file d'attente séquentielle
│   ├── src/lib.rs                      # Enregistrement des commandes et journalisation
│   └── tauri.conf.json                 # Configuration Tauri v2
├── releases/                           # Binaires exécutables et empreintes SHA-256
│   ├── NeoGet-2.3.3-x64.exe
│   ├── NeoGet-Setup-2.3.3-x64.exe
│   └── SHA256SUMS.txt
├── software.json                       # Catalogue Starter Pack par défaut
└── package.json                        # Scripts et dépendances NPM
```

---

## 🛡️ Sécurité & Confidentialité

- **100 % Local** : Aucune donnée personnelle, statistique ou télémétrie n'est collectée ou transmise.
- **IPC typée et sécurisée** : Toutes les commandes système passent par les contrats d'interface de Tauri v2.
- **Traçabilité locale** : Les opérations sont tracées avec horodatage et code de retour dans `%LOCALAPPDATA%\NeoGet\logs\NeoGet.log`.
- **Contrôle des privilèges** : Les actions nécessitant une élévation de privilèges sont clairement signalées.

---

## 🧪 Tests et qualité

```powershell
cargo test --manifest-path src-tauri\Cargo.toml --lib
npm test
npm run build
```

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).

<br />

<div align="center">

*Conçu avec React, Rust, Tauri et WinGet.*

</div>
