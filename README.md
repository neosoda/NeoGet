<div align="center">

# ðŸš€ NeoGet

### *Le Cockpit Windows Ultime pour WinGet, le Nettoyage et l'Optimisation SystÃ¨me*

NeoGet rassemble le gestionnaire de paquets WinGet, le diagnostic systÃ¨me en temps rÃ©el et un toolkit d'optimisation Windows au sein d'une application desktop **Tauri v2** moderne, ultra-rapide et 100 % locale.

<br />

[![Release](https://img.shields.io/badge/Release-v2.3.2-32A7F3?style=for-the-badge&logo=github&logoColor=fff)](releases/NeoGet-Setup-2.3.2-x64.exe)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)](https://react.dev)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-24C8DB?style=for-the-badge&logo=tauri&logoColor=fff)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-backend-000000?style=for-the-badge&logo=rust&logoColor=fff)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![WinGet](https://img.shields.io/badge/WinGet-Native-22D3B6?style=for-the-badge&logo=windows&logoColor=111)](https://learn.microsoft.com/windows/package-manager/winget/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

<p>
  <a href="releases/NeoGet-Setup-2.3.2-x64.exe"><strong>âš¡ TÃ©lÃ©charger l'installateur Windows (.exe)</strong></a>
  Â·
  <a href="docs/SETUP.md"><strong>ðŸ“˜ Guide Dev</strong></a>
  Â·
  <a href="docs/ARCHITECTURE.md"><strong>ðŸ—ï¸ Architecture</strong></a>
  Â·
  <a href="docs/CHANGELOG.md"><strong>ðŸ“ Changelog</strong></a>
</p>

<br />

<img src="docs/assets/neoget-app.png" alt="NeoGet App Screenshot" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />

</div>

---

## âœ¨ Pourquoi NeoGet ?

Configurer ou maintenir un poste Windows propre exige gÃ©nÃ©ralement l'utilisation conjointe de multiples terminaux, de scripts PowerShell Ã©pars, du planificateur de tÃ¢ches et du registre Windows. 

**NeoGet unifie l'intÃ©gralitÃ© de ces flux** au sein d'un tableau de bord unique, Ã©lÃ©gant et sÃ©curisÃ© sans aucune tÃ©lÃ©mÃ©trie ni dÃ©pendance cloud.

| Cas d'usage | Ce que NeoGet apporte |
| --- | --- |
| **ðŸ“¦ Installation initiale** | Catalogue *Starter Pack* structurÃ© par mÃ©tiers, panier multi-sÃ©lection et dÃ©ploiement groupÃ©. |
| **ðŸ” Recherche universelle** | Exploration directe du catalogue officiel WinGet avec ajout en un clic au panier d'installation. |
| **ðŸ”„ Maintenance applicative** | Scanner de versions obsolÃ¨tes et ajouter les mises Ã  jour Ã  une file d'opÃ©rations suivie par le backend. |
| **ðŸ§¹ Nettoyage systÃ¨me** | Analyse et purge ciblÃ©e des caches temporaires, prefetch, miniatures et rÃ©sidus Windows Update. |
| **âš¡ Optimisation & Tweaks** | Toggles instantanÃ©s : menu contextuel classique, masquage des Widgets/Copilot, Game DVR, hibernation et extensions. |
| **ðŸš€ ContrÃ´le du dÃ©marrage** | Audit et activation/dÃ©sactivation des programmes au dÃ©marrage et tÃ¢ches planifiÃ©es non-Microsoft. |
| **ðŸ©º Doctor WinGet** | Diagnostic RAM, Disque, OS & rÃ©initialisation des rÃ©pertoires/sources WinGet corrompus. |

---

## ðŸŽ¨ Vues Principales & FonctionnalitÃ©s

### 1. Starter Pack & Recherche WinGet
- **SÃ©lection rapide** : Outils indispensables catÃ©gorisÃ©s (Navigateurs, Dev, MultimÃ©dia, Bases de donnÃ©es, ProductivitÃ©).
- **Panier dynamique** : PrÃ©paration d'une file d'attente d'installation avec suivi de progression en overlay minimisable.
- **Import / Export JSON** : Sauvegarde et restauration instantanÃ©e de configurations logicielles.
- **File d'opÃ©rations fiable** : Installations, mises Ã  jour et dÃ©sinstallations sont mises en file par le backend. Une mÃªme action sur un mÃªme paquet n'est exÃ©cutÃ©e qu'une fois Ã  la fois.

### 2. Centre de Mises Ã  jour & Inventaire
- **Inventaire local complet** : Listing et filtrage rapide parmi toutes les applications installÃ©es sur la machine hÃ´te.
- **Upgrades intelligents** : Mises Ã  jour individuelles ou groupÃ©es, avec dÃ©tection des paquets sans version connue et mode forcÃ© pour la maintenance complÃ¨te.
- **DÃ©sinstallation sÃ©curisÃ©e** : BoÃ®te de dialogue de confirmation obligatoire pour Ã©viter toute suppression involontaire.

### Suivi des opÃ©rations
- **Ã‰tat unique cÃ´tÃ© backend** : Chaque opÃ©ration passe par `queued`, `running`, `success` ou `failed` avec un identifiant, des horodatages et le dÃ©tail d'erreur utile.
- **ExÃ©cution sÃ©quentielle** : WinGet reÃ§oit une opÃ©ration Ã  la fois afin d'Ã©viter les conflits entre installations, mises Ã  jour et dÃ©sinstallations.
- **Interface synchronisÃ©e** : L'overlay lit l'Ã©tat initial, Ã©coute les Ã©vÃ©nements Tauri et rafraÃ®chit l'Ã©tat pendant qu'une opÃ©ration est active. Il reste cohÃ©rent aprÃ¨s une rÃ©ponse tardive ou un Ã©vÃ©nement manquÃ©.

### 3. Toolkit Windows
- **Explorateur** : Afficher extensions, fichiers cachÃ©s, vue compacte, menu clic-droit classique Windows 10/11.
- **ConfidentialitÃ© & Gaming** : Masquer Widgets, dÃ©sactiver Game DVR, dÃ©sactiver Windows Copilot, rÃ©duire les suggestions.
- **Nettoyeur de caches** : Purge sÃ©curisÃ©e du dossier Temp, Prefetch, Cache Windows Update et miniatures Explorer.
- **Gestionnaire AppX & DÃ©marrage** : DÃ©sinstallation propre des paquets UWP/AppX amovibles et contrÃ´le du dÃ©marrage systÃ¨me.

### 4. System Doctor & Gestion des Sources
- **Capteurs systÃ¨me** : Visualisation en temps rÃ©el de la consommation mÃ©moire RAM et de l'espace disque libre.
- **Restauration WinGet** : Profils de maintenance intÃ©grÃ©s. Les profils rapide et complet mettent Ã  jour les sources, analysent les mises Ã  jour puis les ajoutent Ã  la file. Le profil de rÃ©paration rÃ©initialise les sources WinGet.

---

## ðŸš€ Prise en main rapide

### 1. Installer NeoGet
TÃ©lÃ©chargez l'installateur Windows puis exÃ©cutez-le :

```powershell
.\releases\NeoGet-Setup-2.3.1-x64.exe
```

Le binaire portable est aussi disponible dans `releases\NeoGet-2.3.1-x64.exe`.

> **Note** : Pour appliquer les optimisations systÃ¨me avancÃ©es du Toolkit Windows, exÃ©cutez NeoGet avec les privilÃ¨ges administrateur (`Clic-droit -> ExÃ©cuter en tant qu'administrateur`).

### 2. Environnement de DÃ©veloppement

#### PrÃ©requis
- Windows 10 ou 11
- WinGet fonctionnel
- Node.js (v18+)
- Rust & Cargo (v1.75+)

#### Installation & Lancement
```powershell
# 1. Cloner le dÃ©pÃ´t
git clone https://github.com/neosoda/NeoGet.git
cd NeoGet

# 2. Installer les dÃ©pendances JavaScript
npm install

# 3. Lancer le mode dÃ©veloppement desktop avec Hot-Reload
npm run tauri:dev
```

#### Compilation Release
```powershell
# Compiler le binaire optimisÃ© Tauri v2
npm run tauri:build
```

Les chemins de sortie suivent la configuration Cargo du projet. Consultez `.cargo\config.toml` si le dossier `target` a Ã©tÃ© dÃ©placÃ©.

---

## ðŸ—ï¸ Architecture & Stack Technique

```text
NeoGet/
â”œâ”€â”€ src/                                # Frontend React 19 + TypeScript
â”‚   â”œâ”€â”€ App.tsx                         # Layout shell & gestionnaires globaux
â”‚   â”œâ”€â”€ components/                     # Composants UI (Grid, Toolkit, Doctor, Cart, Palette)
â”‚   â”œâ”€â”€ hooks/                          # Hooks d'Ã©tat (Panier, ThÃ¨me, Status, Installation)
â”‚   â””â”€â”€ index.css                       # Design System Tailwind CSS & Tokens HSL
â”œâ”€â”€ src-tauri/                          # Backend Rust & Tauri v2
â”‚   â”œâ”€â”€ src/commands.rs                 # Invocations systÃ¨me, WinGet & PowerShell
â”‚   â”œâ”€â”€ src/operations.rs               # File, dÃ©duplication et Ã©tat des opÃ©rations WinGet
â”‚   â”œâ”€â”€ src/lib.rs                      # Enregistrement des IPC Handlers & Logger
â”‚   â””â”€â”€ tauri.conf.json                 # Configuration Tauri v2 & CSP
â”œâ”€â”€ releases/                           # Artifacts Release vÃ©rifiÃ©s
â”‚   â”œâ”€â”€ NeoGet-2.3.1-x64.exe            # Binaire portable
â”‚   â”œâ”€â”€ NeoGet-Setup-2.3.1-x64.exe      # Installateur NSIS
â”‚   â””â”€â”€ SHA256SUMS.txt                  # Empreintes SHA-256
â”œâ”€â”€ software.json                       # Catalogue Starter Pack par dÃ©faut
â””â”€â”€ package.json                        # Configuration NPM & scripts de build
```

| Couche | Technologie |
| --- | --- |
| **Interface UI** | React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| **Desktop Runtime** | Tauri 2.0 (Rust) |
| **Moteur SystÃ¨me** | Rust (Tokio async), PowerShell, WinGet CLI |
| **Build System** | Vite, Cargo |

---

## ðŸ›¡ï¸ SÃ©curitÃ© & ConfidentialitÃ©

- **100 % Local** : Aucune donnÃ©e personnelle, statistique ou tÃ©lÃ©mÃ©trie n'est envoyÃ©e vers un serveur tiers.
- **Transparence IPC** : Toutes les commandes exÃ©cutÃ©es passent par les API typÃ©es et sÃ©curisÃ©es de Tauri v2.
- **TraÃ§abilitÃ©** : Les opÃ©rations enregistrent leur type, paquet, commande, durÃ©e et erreur Ã©ventuelle dans les logs locaux de NeoGet.
- **SÃ©curitÃ© UAC** : Les opÃ©rations nÃ©cessitant une Ã©lÃ©vation de privilÃ¨ges sont clairement signalÃ©es dans l'interface et verrouillÃ©es si les droits sont insuffisants.

---

## âœ… VÃ©rification avant publication

```powershell
cargo test --manifest-path src-tauri\Cargo.toml
npm test
npm run build
npm run tauri:build
Get-FileHash .\releases\NeoGet-2.3.1-x64.exe -Algorithm SHA256
```

---

## ðŸ“– Documentation ComplÃ¨te

- ðŸ—ï¸ [Architecture Technique](docs/ARCHITECTURE.md)
- ðŸ’» [Guide de Configuration Dev](docs/SETUP.md)
- ðŸŽ¨ [Design System & UI Tokens](docs/DESIGN_SYSTEM.md)
- ðŸ“ [Journal des Modifications (Changelog)](docs/CHANGELOG.md)

---

## ðŸ“„ Licence

Ce projet est sous licence [MIT](LICENSE).

<br />

<div align="center">

*Fait avec â¤ï¸ avec React, Rust, Tauri et WinGet.*

</div>

