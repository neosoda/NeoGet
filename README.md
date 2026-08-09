<div align="center">

# 🚀 NeoGet

### *Le Cockpit Windows Ultime pour WinGet, le Nettoyage et l'Optimisation Système*

NeoGet rassemble le gestionnaire de paquets WinGet, le diagnostic système en temps réel et un toolkit d'optimisation Windows au sein d'une application desktop **Tauri v2** moderne, ultra-rapide et 100 % locale.

<br />

[![Release](https://img.shields.io/badge/Release-v2.1.0-32A7F3?style=for-the-badge&logo=github&logoColor=fff)](releases/neoget.exe)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-24C8DB?style=for-the-badge&logo=tauri&logoColor=fff)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-backend-000000?style=for-the-badge&logo=rust&logoColor=fff)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![WinGet](https://img.shields.io/badge/WinGet-Native-22D3B6?style=for-the-badge&logo=windows&logoColor=111)](https://learn.microsoft.com/windows/package-manager/winget/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

<p>
  <a href="releases/neoget.exe"><strong>⚡ Télécharger l'Exécutable (.exe)</strong></a>
  ·
  <a href="docs/SETUP.md"><strong>📘 Guide Dev</strong></a>
  ·
  <a href="docs/ARCHITECTURE.md"><strong>🏗️ Architecture</strong></a>
  ·
  <a href="docs/CHANGELOG.md"><strong>📝 Changelog</strong></a>
</p>

<br />

<img src="docs/assets/neoget-app.png" alt="NeoGet App Screenshot" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />

</div>

---

## ✨ Pourquoi NeoGet ?

Configurer ou maintenir un poste Windows propre exige généralement l'utilisation conjointe de multiples terminaux, de scripts PowerShell épars, du planificateur de tâches et du registre Windows. 

**NeoGet unifie l'intégralité de ces flux** au sein d'un tableau de bord unique, élégant et sécurisé sans aucune télémétrie ni dépendance cloud.

| Cas d'usage | Ce que NeoGet apporte |
| --- | --- |
| **📦 Installation initiale** | Catalogue *Starter Pack* structuré par métiers, panier multi-sélection et déploiement groupé. |
| **🔍 Recherche universelle** | Exploration directe du catalogue officiel WinGet avec ajout en un clic au panier d'installation. |
| **🔄 Maintenance applicative** | Scanner de versions obsolètes, mises à jour individuelles ou globales non bloquantes (`winget upgrade --all`). |
| **🧹 Nettoyage système** | Analyse et purge ciblée des caches temporaires, prefetch, miniatures et résidus Windows Update. |
| **⚡ Optimisation & Tweaks** | Toggles instantanés : menu contextuel classique, masquage des Widgets/Copilot, Game DVR, hibernation et extensions. |
| **🚀 Contrôle du démarrage** | Audit et activation/désactivation des programmes au démarrage et tâches planifiées non-Microsoft. |
| **🩺 Doctor WinGet** | Diagnostic RAM, Disque, OS & réinitialisation des répertoires/sources WinGet corrompus. |

---

## 🎨 Vues Principales & Fonctionnalités

### 1. Starter Pack & Recherche WinGet
- **Sélection rapide** : Outils indispensables catégorisés (Navigateurs, Dev, Multimédia, Bases de données, Productivité).
- **Panier dynamique** : Préparation d'une file d'attente d'installation avec suivi de progression en overlay minimisable.
- **Import / Export JSON** : Sauvegarde et restauration instantanée de configurations logicielles.

### 2. Centre de Mises à jour & Inventaire
- **Inventaire local complet** : Listing et filtrage rapide parmi toutes les applications installées sur la machine hôte.
- **Upgrades intelligents** : Support des drapeaux `--include-unknown`, `--force`, `--silent` et `--interactive`.
- **Désinstallation sécurisée** : Boîte de dialogue de confirmation obligatoire pour éviter toute suppression involontaire.

### 3. Toolkit Windows
- **Explorateur** : Afficher extensions, fichiers cachés, vue compacte, menu clic-droit classique Windows 10/11.
- **Confidentialité & Gaming** : Masquer Widgets, désactiver Game DVR, désactiver Windows Copilot, réduire les suggestions.
- **Nettoyeur de caches** : Purge sécurisée du dossier Temp, Prefetch, Cache Windows Update et miniatures Explorer.
- **Gestionnaire AppX & Démarrage** : Désinstallation propre des paquets UWP/AppX amovibles et contrôle du démarrage système.

### 4. System Doctor & Gestion des Sources
- **Capteurs système** : Visualisation en temps réel de la consommation mémoire RAM et de l'espace disque libre.
- **Restauration WinGet** : Profils de maintenance intégrés (`fast-upgrade`, `repair-sources`, `full-maintenance`).

---

## 🚀 Prise en main rapide

### 1. Télécharger l'Exécutable Autonome
L'application compilée en version Release ne requiert aucune installation lourde :

```powershell
.\releases\neoget.exe
```

> **Note** : Pour appliquer les optimisations système avancées du Toolkit Windows, exécutez NeoGet avec les privilèges administrateur (`Clic-droit -> Exécuter en tant qu'administrateur`).

### 2. Environnement de Développement

#### Prérequis
- Windows 10 ou 11
- WinGet fonctionnel
- Node.js (v18+)
- Rust & Cargo (v1.75+)

#### Installation & Lancement
```powershell
# 1. Cloner le dépôt
git clone https://github.com/neosoda/NeoGet.git
cd NeoGet

# 2. Installer les dépendances JavaScript
npm install

# 3. Lancer le mode développement desktop avec Hot-Reload
npm run tauri:dev
```

#### Compilation Release
```powershell
# Compiler le binaire optimisé Tauri v2
npm run tauri:build
```

---

## 🏗️ Architecture & Stack Technique

```text
NeoGet/
├── src/                                # Frontend React 19 + TypeScript
│   ├── App.tsx                         # Layout shell & gestionnaires globaux
│   ├── components/                     # Composants UI (Grid, Toolkit, Doctor, Cart, Palette)
│   ├── hooks/                          # Hooks d'état (Panier, Thème, Status, Installation)
│   └── index.css                       # Design System Tailwind CSS & Tokens HSL
├── src-tauri/                          # Backend Rust & Tauri v2
│   ├── src/commands.rs                 # Invocations système, WinGet & PowerShell
│   ├── src/lib.rs                      # Enregistrement des IPC Handlers & Logger
│   └── tauri.conf.json                 # Configuration Tauri v2 & CSP
├── releases/                           # Exécutable Release prêt à l'emploi
│   └── neoget.exe                      # Binary autonome
├── software.json                       # Catalogue Starter Pack par défaut
└── package.json                        # Configuration NPM & scripts de build
```

| Couche | Technologie |
| --- | --- |
| **Interface UI** | React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| **Desktop Runtime** | Tauri 2.0 (Rust) |
| **Moteur Système** | Rust (Tokio async), PowerShell, WinGet CLI |
| **Build System** | Vite, Cargo |

---

## 🛡️ Sécurité & Confidentialité

- **100 % Local** : Aucune donnée personnelle, statistique ou télémétrie n'est envoyée vers un serveur tiers.
- **Transparence IPC** : Toutes les commandes exécutées passent par les API typées et sécurisées de Tauri v2.
- **Sécurité UAC** : Les opérations nécessitant une élévation de privilèges sont clairement signalées dans l'interface et verrouillées si les droits sont insuffisants.

---

## 📖 Documentation Complète

- 🏗️ [Architecture Technique](docs/ARCHITECTURE.md)
- 💻 [Guide de Configuration Dev](docs/SETUP.md)
- 🎨 [Design System & UI Tokens](docs/DESIGN_SYSTEM.md)
- 📝 [Journal des Modifications (Changelog)](docs/CHANGELOG.md)

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).

<br />

<div align="center">

*Fait avec ❤️ avec React, Rust, Tauri et WinGet.*

</div>
