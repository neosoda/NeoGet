# Guide de Configuration pour le Développement

## Prérequis Système

Pour développer NeoGet, vous devez disposer des outils suivants :

1.  **Node.js** : Version 18 ou supérieure.
    *   [Lien de téléchargement Node.js](https://nodejs.org/)
2.  **Rust** : Le langage utilisé pour le backend Tauri.
    *   [Lien d'installation de Rust](https://www.rust-lang.org/tools/install)
3.  **Microsoft Visual Studio C++ Build Tools** : Requis par Rust sur Windows.
    *   [Lien Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
4.  **WinGet** : Déjà présent sur la plupart des installations modernes de Windows 10/11.

---

## Installation Rapide

1.  **Cloner le dépôt** :
    ```bash
    git clone https://github.com/votre-org/neoget.git
    cd neoget
    ```

2.  **Installer les dépendances Frontend** :
    ```bash
    npm install
    ```

---

## Commandes de Développement

### Démarrer en Mode Développement (Hot-Reload)
Cette commande lance le serveur de dev Vite pour le frontend et compile/lance le backend Tauri en mode debug.
```bash
npm run tauri:dev
```

### Compiler pour la Production (Release)
Cette commande effectue le build final de l'application (bundle React + compilation Rust optimisée).
```bash
npm run tauri:build
```
L'exécutable final se trouvera dans : `src-tauri/target/release/neoget.exe`.

---

## Configuration de Tauri 2.0

### Permissions (Capabilities)
Les permissions sont gérées dans `src-tauri/capabilities/default.json`. Si vous ajoutez de nouvelles fonctionnalités (accès fichiers, dialogue système), vous devez les déclarer ici pour qu'elles fonctionnent en production.

### Schémas de Configuration
Les schémas sont générés automatiquement par Tauri dans `src-tauri/gen/schemas`. Ils ne doivent pas être modifiés manuellement.

---

## Astuces de Debugging

-   **Frontend** : Utilisez les outils de développement classiques (F12) dans la fenêtre de l'application Tauri pour inspecter les éléments React.
-   **Backend** : Les `println!` de Rust s'affichent directement dans le terminal où vous avez lancé `npm run tauri:dev`.
-   **Tauri API** : Assurez-vous d'importer les APIs depuis `@tauri-apps/api/...` (Tauri 2.0 utilise des imports modularisés).

---

## Problèmes Courants

### Erreur de compilation Rust (Linker)
Assurez-vous que les outils de build Visual Studio sont installés et à jour.

### WinGet non reconnu
NeoGet tente de détecter WinGet au démarrage. Si vous lancez l'application dans un terminal en mode Administrateur, WinGet sera utilisé avec les privilèges élevés nécessaires.
