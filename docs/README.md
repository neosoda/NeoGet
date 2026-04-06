# NeoGet

**Application de bureau pour l'installation en masse de logiciels Windows via WinGet**

Anciennement **OpenNinite** — réécrit avec architecture professionnelle, tests unitaires et protections contre les race conditions.

## Description

NeoGet est une application de bureau Windows écrite en Go qui permet d'installer plusieurs logiciels en un seul clic, en utilisant le gestionnaire de paquets Windows (WinGet) comme moteur d'installation.

## Fonctionnalités principales

- ✅ **Interface graphique moderne** avec Fyne.io
- ✅ **Organisation par catégories** (navigateurs, messagerie, médias, runtimes, développement, etc.)
- ✅ **Sélection rapide** : boutons "Tout cocher" / "Tout décocher" par catégorie
- ✅ **Installation séquentielle** avec logs en temps réel
- ✅ **Barre de progression** pour le suivi global
- ✅ **Détection automatique de WinGet** avec proposition d'installation
- ✅ **Gestion des privilèges administrateur**
- ✅ **Sauvegarde automatique des logs** en fin d'installation

## Améliorations récentes (Revue de Code)

### Tests & Qualité
- ✅ **17 tests unitaires** couvrant les cas normaux et injections
- ✅ **0 race conditions** — accès concurrent sécurisé
- ✅ **Timeouts** sur toutes les opérations longues (5-10 min)
- ✅ **Panic recovery** sur toutes les goroutines

### Architecture
- ✅ **LogManager** — gestion thread-safe des logs
- ✅ **ConfigManager** — gestion du catalogue logiciel
- ✅ **WinGetManager** — vérification et installation
- ✅ **InstallationManager** — orchestration des installations

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour plus de détails.

## Prérequis

### Pour l'utilisation
- **Windows 10/11** (64 bits)
- **WinGet** — généralement préinstallé sur Windows 11
  - Pour Windows 10 : [Microsoft Desktop App Installer](https://aka.ms/getwinget)

### Pour la compilation
- **Go 1.21+** — [go.dev/dl](https://go.dev/dl/)
- **GCC (MinGW-w64)** — pour le support CGO/Fyne
- **Git** (optionnel)

## Installation des dépendances de compilation

### 1. Installer Go
```powershell
# Téléchargez depuis go.dev/dl et installez
# Ou via Chocolatey:
choco install golang
```

### 2. Installer MinGW-w64

**Meilleure option — Chocolatey:**
```powershell
choco install mingw
```

**Alternative — Scoop:**
```powershell
scoop install mingw
```

## Compilation

### Option 1 : Directement avec Go (recommandé)
```bash
cd /A/projets/NeoGet
go build -o neoget.exe
```

### Option 2 : Avec build GUI
```bash
go build -ldflags="-H windowsgui -s -w" -o neoget.exe
```

### Option 3 : Tester avant de compiler
```bash
go test -v        # Lancer les 17 tests
go run main.go    # Exécuter sans compiler
```

## Utilisation

### Démarrage
```bash
neoget.exe
# Ou clic droit > "Exécuter en tant qu'administrateur" (recommandé)
```

### Workflow
1. **Vérification WinGet** — L'app détecte automatiquement WinGet et propose de l'installer si absent
2. **Sélection** — Cochez les logiciels par catégorie
3. **Installation** — Cliquez ">> Install Selected Software" et confirmez
4. **Suivi** — Consultez les logs en temps réel dans le panneau inférieur
5. **Logs** — Les logs sont auto-sauvegardés dans le dossier de l'exécutable

## Catalogue de logiciels

| Catégorie | Logiciels |
|-----------|-----------|
| **Web Browsers** | Chrome, Firefox, Edge, Brave, Opera, Vivaldi |
| **Messaging** | Zoom, Discord, Teams, Thunderbird, Pidgin |
| **Media** | VLC, Spotify, iTunes, Audacity, HandBrake, K-Lite |
| **Runtimes** | .NET 8/9, Java 17/21 (Temurin) |
| **Imaging** | Krita, Blender, GIMP, Paint.NET, ShareX |
| **Documents** | LibreOffice, SumatraPDF, Foxit Reader |
| **Security** | Malwarebytes, Avast |
| **Utilities** | 7-Zip, PeaZip, WinRAR, AnyDesk, WizTree, CCleaner |
| **Developer** | VS Code, Cursor, Git, Python 3.12, Notepad++, PuTTY |

## Structure du projet

```
neoget/
├── main.go              # Code principal (interface UI, logique d'installation)
├── main_test.go         # Tests unitaires (17 tests)
├── managers.go          # Managers séparés (Log, Config, WinGet, Installation)
├── go.mod               # Module Go
├── go.sum               # Dépendances
├── software.json        # Catalogue de logiciels
├── README.md            # Cette documentation
└── ARCHITECTURE.md      # Documentation d'architecture
```

## Personnalisation

### Modifier le catalogue de logiciels

Éditez `software.json` pour ajouter/supprimer des logiciels :

```json
{
  "categories": [
    {
      "name": "Ma Catégorie",
      "software": [
        {"name": "Mon App", "package": "Vendor.Package"}
      ]
    }
  ]
}
```

### Trouver l'identifiant WinGet d'un logiciel

```powershell
winget search "nom du logiciel"
# Exemple:
winget search "Visual Studio Code"
# Résultat: Microsoft.VisualStudioCode
```

## Tests

```bash
# Lancer tous les tests
go test -v

# Résultat attendu:
# PASS: 17 tests
# - TestIsValidPackageID (13 cas)
# - TestLoadConfig (3 cas)
# - TestGetCategoryIcon (1 cas)
# - TestSoftwareStructure (1 cas)
```

## Dépannage

### "MinGW/GCC not found"
```powershell
choco install mingw
# Puis redémarrez votre terminal
```

### "WinGet not found"
- **Windows 11** : WinGet est normalement préinstallé
- **Windows 10** : Installez [Microsoft Desktop App Installer](https://aka.ms/getwinget)

Vérifiez avec :
```powershell
winget --version
```

### Installation échoue sur un paquet
- Exécutez l'application en tant qu'administrateur
- Vérifiez que le paquet WinGet est valide : `winget search "Nom"`
- Consultez les logs dans l'application

### "Timeout" sur une installation
- Une installation est limitée à **10 minutes par paquet**
- Si un paquet prend plus longtemps, augmentez la limite dans `installPackage()` (ligne ~655 dans main.go)

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Design des managers, thread-safety, diagrammes
- **[main_test.go](main_test.go)** — Tests unitaires et cas de validation
- **[managers.go](managers.go)** — Implémentation des managers

## Développement

### Ajouter une fonctionnalité
1. Écrire les tests d'abord (TDD)
2. Implémenter dans le manager approprié
3. Lancer `go test -v` pour valider
4. Compiler et tester manuellement

### Reporter un bug
Consultez les logs dans l'app (panneau inférieur) pour plus de détails sur l'erreur.

## Licence

MIT License

## Auteur

- **Go** + **Fyne.io** pour l'interface
- **WinGet** comme moteur d'installation
- **Refactorisé** avec architecture modulaire et tests (2026)
