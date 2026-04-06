# Guide de contribution — NeoGet

Merci de votre intérêt pour NeoGet ! Ce document décrit comment contribuer au projet.

## Avant de commencer

- Consultez [README.md](README.md) pour la description du projet
- Consultez [ARCHITECTURE.md](ARCHITECTURE.md) pour comprendre le design
- Exécutez `go test -v` pour vérifier que les tests passent

## Flux de contribution

### 1. Fork & Clone

```bash
# Fork le repo sur GitHub
# Puis clone votre fork
git clone https://github.com/VOTRE_USER/neoget.git
cd neoget
```

### 2. Créer une branche

```bash
# Pour une feature
git checkout -b feature/description-courte

# Pour un bugfix
git checkout -b fix/description-courte

# Exemples:
git checkout -b feature/add-retry-logic
git checkout -b fix/timeout-hang
```

### 3. Développer avec TDD

**Important**: Suivez la discipline Test-Driven Development (TDD).

```bash
# 1. Écrire les tests d'abord
# Éditer main_test.go ou managers_test.go
go test -v  # ❌ Les tests échouent (RED)

# 2. Implémenter le code
# Éditer main.go ou managers.go
go test -v  # ✅ Les tests passent (GREEN)

# 3. Refactorer si nécessaire
# Optimiser le code
go test -v  # ✅ Toujours vert
```

### 4. Commits

```bash
# Commit avec messages clairs
git add .
git commit -m "feature: add retry logic with exponential backoff

- Implémente 3 tentatives avec backoff
- Logs chaque tentative
- Tests: TestRetryLogic (4 cas)"

# Format attendu:
# <type>(<scope>): <description>
# <blank line>
# <body>

# Types: feature, fix, refactor, test, docs, style, chore
# Scope: ui, winstall, config, logging, etc.
```

### 5. Tester avant de pusher

```bash
# Tests unitaires
go test -v

# Build
go build -o neoget.exe

# Tests manuels (UI)
./neoget.exe
```

### 6. Push & Pull Request

```bash
git push origin feature/description-courte
```

Puis créez une Pull Request sur GitHub avec:
- **Titre**: Même format que commit (`feature: description`)
- **Description**:
  ```markdown
  ## Résumé
  - Ajoute la fonctionnalité X
  - Élimine le problème Y
  
  ## Test plan
  - [ ] Tests unitaires passent (`go test -v`)
  - [ ] Build réussit (`go build`)
  - [ ] Manuel: ...
  
  ## Checklist
  - [ ] Tests ajoutés/modifiés
  - [ ] Aucune race condition
  - [ ] Panic recovery sur goroutines
  - [ ] Timeouts sur exec.Command
  - [ ] Documentation mise à jour
  ```

---

## Standards de code

### Style

```bash
# Format automatique
go fmt ./...

# Lint
go vet ./...

# Optionnel (si disponible)
golangci-lint run
```

### Conventions

**Noms:**
```go
// Variables
logMgr, configMgr, wingetMgr        // camelCase
isInstalling, wingetReady           // Booléens avec Is/Can/Should

// Fonctions
func InstallPackage()               // PascalCase (exported)
func installPackage()               // camelCase (private)

// Constantes
const DefaultTimeout = 5 * time.Minute
```

**Commentaires:**
```go
// Method comment: Explain WHAT and WHY, not HOW
// ✅ Bons
func (wm *WinGetManager) IsReady() bool {
    // Check cache to avoid repeated exec calls
    ...
}

// ❌ Mauvais
func (wm *WinGetManager) IsReady() bool {
    // Return wm.ready
    ...
}
```

**Thread-safety:**
```go
// ✅ Protéger avec mutex
type Manager struct {
    mu    sync.Mutex  // protects: state
    state SomeType
}

// ✅ Documenter clairement
// setReady safely updates the ready flag
func (m *Manager) setReady(ready bool) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.ready = ready
}
```

---

## Ajout de fonctionnalités

### Template pour une nouvelle feature

**1. Tests d'abord** (`main_test.go` ou nouveau fichier `feature_test.go`):
```go
func TestMyFeature(t *testing.T) {
    // Arrange
    input := ...
    
    // Act
    result := MyFunction(input)
    
    // Assert
    if result != expected {
        t.Errorf("got %v, want %v", result, expected)
    }
}
```

**2. Implémentation** (`main.go` ou `managers.go`):
```go
func MyFunction(input string) string {
    // Implémentation simple
    return result
}
```

**3. Intégration UI** (si nécessaire dans `main.go:createUI()`):
```go
myButton := widget.NewButtonWithIcon("Label", theme.Icon, func() {
    go func() {
        defer func() {
            if r := recover(); r != nil {
                a.appendLog(fmt.Sprintf("[ERROR] %v\n", r))
            }
        }()
        // Appeler la feature
    }()
})
```

**4. Tests** (vérifier couverture):
```bash
go test -v -cover
```

---

## Bugfix workflow

### Signaler un bug

Si tu trouves un bug:
1. Vérifier qu'il n'est pas déjà rapporté (Issues)
2. Créer une issue avec:
   - Description du bug
   - Étapes pour reproduire
   - Résultat attendu vs réel
   - Logs (panel bas de NeoGet)

### Fixer un bug

```bash
# 1. Créer un test qui reproduit le bug
go test -v  # ❌ Fail (le bug est reproduit)

# 2. Fixer le code
# 3. Vérifier que le test passe
go test -v  # ✅ Pass

# 4. Committer avec message clair
git commit -m "fix: prevent race condition on wingetReady

Adds mutex protection to setWingetReady/isWingetReady methods.
Fixes issue #123.

Tests: TestWinGetConcurrency (new)"
```

---

## Review checklist

Avant de merger, vérifier:

- ✅ Tests: `go test -v` passe
- ✅ Build: `go build -o neoget.exe` réussit
- ✅ Format: `go fmt ./...` n'a rien à changer
- ✅ Lint: `go vet ./...` sans warnings
- ✅ Thread-safety: Mutex sur tout état partagé
- ✅ Timeouts: exec.Command a un contexte
- ✅ Panic recovery: Toutes les goroutines protégées
- ✅ Documentation: ARCHITECTURE.md à jour si changement architecture
- ✅ Pas de code mort: Aucune fonction/variable inutile

---

## Maintainers

Contact les mainteneurs via:
- Issues GitHub
- Pull requests
- Discussion

---

## Licence

Le code que vous contribuez doit respecter la licence MIT existante.

Merci de contribuer ! 🙏
