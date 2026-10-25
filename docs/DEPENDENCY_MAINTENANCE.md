# Maintenance des dépendances — NeoGet

Ce document trace la mise à jour de la pile de dépendances (npm + Cargo) du 25 octobre 2026,
les décisions de migration, les écarts de comportement volontairement préservés, et les
limites connues qui restent ouvertes.

## 1. Versions — avant / après

### Frontend (npm)

| Paquet | Avant | Après | Note |
| --- | --- | --- | --- |
| `vite` | 5.4.21 | **8.3.5** | Migration majeure (Rollup → Rolldown, Oxc, Lightning CSS) |
| `@vitejs/plugin-react` | 4.7.0 | **6.1.2** | Exige Vite 8 ; n'utilise plus Babel |
| `typescript` | 5.9.3 | **7.0.2** | Compilateur natif (port Go) |
| `react` / `react-dom` | 19.2.4 | **19.3.1** | |
| `@types/react` / `@types/react-dom` | 19.2.x | **19.3.0** | |
| `@types/node` | 25.5.2 | **24.19.2** | **Épinglé volontairement** — voir §4 |
| `tailwindcss` | 3.4.19 | **4.3.3** | Migration majeure, voir §3 |
| `@tailwindcss/vite` | — | **4.3.3** | Remplace la chaîne PostCSS |
| `framer-motion` | 11.18.2 | **14.6.0** | |
| `lucide-react` | 0.424.0 | **1.61.0** | |
| `postcss` | 8.5.8 | **retiré des dépendances directes** | Plus nécessaire avec Tailwind v4 (reste transitif via Vite) |
| `autoprefixer` | 10.4.27 | **supprimé** | Lightning CSS (intégré à Vite 8) assure le préfixage |
| `@babel/core` | 7.29.0 | **supprimé** | Conséquence de `@vitejs/plugin-react` v6 |
| `@tauri-apps/cli` | 2.12.3 | **2.12.4** | |
| `@tauri-apps/api` | 2.12.4 | 2.12.4 | Déjà à jour |

Arbre de dépendances : **199 → 128 paquets** (−36 %). `npm audit` : **0 vulnérabilité**
(contre 1 modérée sur `postcss-selector-parser`, sans correctif disponible dans la plage
semver de Tailwind v3).

### Backend (Cargo)

| Crate | Avant | Après |
| --- | --- | --- |
| `tauri` | 2.12.4 | **2.12.5** |
| `tauri-build` | 2.7.3 | **2.7.4** |
| `tokio` | 1.53.3 | **1.54.1** |
| `tauri-plugin-log`, `serde`, `serde_json`, `chrono`, `log` | — | inchangés (déjà à jour) |

`src-tauri/Cargo.lock` **était ignoré par Git** : les builds Rust n'étaient ni reproductibles
ni auditable. Le fichier est désormais versionné, et la CI utilise `--locked`.

## 2. Chaîne de compilation — corrections structurelles

- **`vite.config.js` masquait `vite.config.ts`.** `tsc -b` compilait la config Vite à la
  racine du dépôt. Vite résout `vite.config.js` **avant** `vite.config.ts` : la source
  TypeScript n'était donc jamais exécutée. Le fichier compilé utilisait `__dirname`, qui
  n'existe pas en ESM — un piège qui aurait cassé le build avec le chargeur de config natif
  de Vite 8. `tsconfig.node.json` émet désormais vers `node_modules/.tmp/`, et les artefacts
  `vite.config.js` / `vite.config.d.ts` ont été retirés du dépôt.
- **`src/vite-env.d.ts` ajouté.** Les types `vite/client` n'étaient jamais déclarés : les
  imports CSS (`import './index.css'`) n'étaient pas vérifiés. TypeScript 7 les signale
  désormais — le fichier manquant est corrigé à la source.
- **Répertoire de build Cargo rendu portable.** `.cargo/config.toml` pointait vers
  `C:/Users/NEO.NEO-PC/.cargo/target/neoget` : ce chemin ne fonctionnait que sur la machine
  qui l'avait écrit, et les scripts de release le reprenaient en dur. Le répertoire est
  désormais relatif (`target/neoget`, ignoré par Git), le watcher Vite l'exclut explicitement,
  et `scripts/copy-release-exe.mjs` comme `build-release.ps1` sondent les emplacements
  possibles sans aucun chemin de machine codé en dur.
- **Script de copie de l'exécutable** déplacé vers `scripts/copy-release-exe.mjs`, avec une
  liste d'erreurs explicite si aucun binaire n'est trouvé.
- **`minify: 'esbuild'` retiré.** Vite 8 minifie avec Oxc ; `esbuild` n'est plus utilisé par
  Vite et l'option est dépréciée.

## 3. Tailwind CSS v3 → v4

La migration est justifiée par la sécurité : `postcss-selector-parser` (dépendance de
Tailwind v3) est concerné par deux avis de déni de service dont **aucun correctif n'existe
dans la série 6.x**. Tailwind v4 n'a aucune dépendance runtime et supprime la chaîne PostCSS.

Points traités :

- **`@config "../tailwind.config.js"`** : `tailwind.config.js` reste la source de vérité des
  jetons (couleurs, polices, ombres, dégradés). Aucune valeur n'est transcrite, donc aucun
  risque de dérive entre le fichier et le CSS.
- **`@source` explicites** (`source(none)`) : v4 scannait automatiquement tout l'arbre, y
  compris `docs/*.md`. Les sources sont épinglées sur `src/**/*.{ts,tsx}`, `index.html` et
  `software.json`. `@source inline("surface")` force l'émission de l'utilitaire `.surface`
  (une `@utility` n'est générée que si la classe est détectée dans les sources).
- **`@custom-variant dark (&:where(.dark, .dark *))`** : équivalent de `darkMode: 'class'`,
  l'application basculant la classe `.dark` sur `<html>`.
- **`.surface` converti en `@utility`** : en v4, une classe personnalisée ne peut plus être
  appliquée via `@apply` sans être enregistrée comme utilitaire. `.surface-soft` et
  `.surface-strong` restent dans `@layer components` (surchargées par des utilitaires dans le
  markup, comme en v3).
- **Animations déplacées dans le CSS.** La couche de compatibilité `@config` de v4 ignore les
  clés v3 `animation` et `keyframes` : les animations du design system
  (`animate-fade-in`, `animate-slide-up`, `animate-pulse-scale`) et leurs keyframes sont donc
  déclarés en CSS (`@theme` + `@keyframes`). Elles n'étaient pas émises en v3 non plus,
  faute d'usage dans le code — mais en v4 elles sont désormais réellement disponibles au lieu
  d'être silencieusement ignorées.

### 3.1 Compatibilité visuelle préservée

v4 modifie la sémantique de quatre utilitaires **et** réderive la palette par défaut. Le rendu
d'origine est répliqué explicitement plutôt que d'hériter des nouveaux défauts :

| v3 | v4 (défaut) | v3 → v4 appliqué | Raison |
| --- | --- | --- | --- |
| `shadow-sm` (2 px) | `shadow-sm` (3 px, ancien `shadow`) | `shadow-xs` | Renommage de l'échelle |
| `backdrop-blur-sm` (4 px) | `backdrop-blur-sm` (8 px) | `backdrop-blur-xs` | Renommage de l'échelle |
| `border` sans couleur → `gray-200` | `border` sans couleur → `currentColor` | règle `@layer base` restaurant `var(--color-gray-200)` | Changement de défaut |
| `outline-none` | `outline-style: none` | inchangé | Les deux masquent l'anneau natif ; le focus visible est assuré par `focus:shadow-focus` |
| 60 teintes de la palette (voir ci-dessous) | palette re-dérivée | valeurs v3 épinglées dans `tailwind.config.js` | v4 redéfinit la palette par défaut |

La palette v4 n'est pas la palette v3 exprimée différemment : les valeurs sRGB ont changé
(`red-500` passe de `#ef4444` à `#fb2c36`, `amber-500` de `#f59e0b` à `#f99c00`,
`emerald-700` de `#047857` à `#007956`, `teal-700` de `#0f766e` à `#00776e`, `slate-800` de
`#1e293b` à `#1d293d`, `slate-900` de `#0f172a` à `#0f172b`, `red-800` de `#991b1b` à
`#9f0712`, `gray-700` de `#374151` à `#364153`, …). Les **60 teintes de la palette par
défaut** utilisées par l'application sont donc épinglées à leurs valeurs v3 dans
`tailwind.config.js`. Une teinte non listée retombe silencieusement sur sa valeur v4 (rendue
en `lab()` par WebView2) : toute nouvelle teinte utilisée doit y être ajoutée.

**Breaking change associé, plus discret mais critique** : v4 ne convertit plus
automatiquement une couleur hexadécimale pour lui appliquer un modificateur d'opacité. En v3,
`bg-accent/10` produisait `.bg-accent\/10{background-color:#22d3b61a}` ; en v4, une couleur
déclarée en hexadécimal est **silencieusement ignorée** et l'utilitaire n'est pas généré
(`bg-accent/10`, `border-accent/20`, `bg-primary/10`, `bg-error/10`, `bg-success/10`,
`bg-warning/10`, `border-amber-500/30`… disparaissaient du CSS). Toutes les couleurs du
fichier sont donc déclarées via un helper `alpha()` qui produit
`rgb(r g b / <alpha-value>)` : la valeur sRGB exacte de la v3 est conservée **et** les
modificateurs d'opacité redeviennent fonctionnels.

Vérification : comparaison automatique de la valeur sRGB résolue de chaque utilitaire de
couleur entre le build v3 (`origin/main`) et le build v4 — **0 écart** sur les 134 classes
comparées, et les **211 classes de couleur** émises par le build v3 sont toutes présentes
dans le build v4 (à la seule exception de `shadow-sm`, renommé volontairement en
`shadow-xs`).

### 3.2 Bug latent corrigé

`software.json` contient des classes Tailwind (`from-blue-400 to-blue-500`) appliquées à
l'exécution par `SoftwareGrid.tsx` et `CommandPalette.tsx`. Les globs `content` de v3
(`index.html` + `src/**`) n'incluaient pas ce fichier : **les dégradés des cartes logiciel
n'étaient pas générés en CSS**. La migration les restaure.

### 3.3 Impact sur le bundle CSS

| | v3 | v4 |
| --- | --- | --- |
| CSS | 48,5 ko (8,2 ko gzip) | 85,1 ko (13,4 ko gzip) |
| JS | 457,9 ko (132,4 ko gzip) | 510,3 ko (150,7 ko gzip) |

L'écart CSS provient des variables de thème et des enregistrements `@property` que v4 émet,
et non d'un surcroît d'utilitaires : le contrôle croisé classe par classe ne relève **aucune
classe utilisée par l'application qui soit perdue** ; les seules differences sont les deux
utilitaires renommés (`shadow-sm`, `backdrop-blur-sm`) et les classes ajoutées par la
correction de `software.json`. Sur le JS, Vite 8 compense l'alourdissement de
`framer-motion` 14 (+59 ko) et `lucide-react` 1 (+35 ko) par −12 ko (Rolldown).

Pour une application de bureau installée en local, l'écart de 5,5 ko gzip est sans effet.

## 4. Épinglages documentés et limites connues

- **`@types/node` est maintenu en 24.x** (la dernière version publiée est 26.x). Les types
  doivent correspondre à la version de Node exécutée : Node 24 est la LTS en usage, en local
  comme en CI. Passer à 26.x exposerait des API non disponibles à l'exécution.
- **RUSTSEC-2024-0429 (`glib`)** : l'ABI `Iterator` de `glib` est incorrecte avant 0.20.0.
  `glib` n'apparaît **pas** dans le graphe de build Windows (dépendance Linux de la pile GTK
  de Tauri) et n'est pas corrigible ici : `tauri` 2.12 épingle `gtk ^0.18`, qui exige
  `glib ^0.18`, et aucune version 0.18.x corrigée n'existe. Ignoré explicitement en CI,
  avec justification.
- **RUSTSEC-2024-0370 (`proc-macro-error`)** : crate non maintenu, sans vulnérabilité et
  sans version corrigée. Utilisé uniquement à la compilation.
- **`toml` / `toml_edit` / `toml_datetime` / `generic-array`** restent en deçà de leur dernière
  version : ce sont des contraintes transitives (via `cargo_toml` / `tauri-utils`), pas des
  épinglages volontaires.
- **`postcss` reste dans l'arbre** comme dépendance transitive de Vite 8 ; seule la
  dépendance directe a été retirée.
- **Pas de `.gitattributes`** : Git normalise les fins de ligne (LF dans le dépôt, CRLF dans
  les copies de travail Windows). Sans effet sur Node, YAML ou cargo.

## 5. Procédures d'audit

```bash
# Frontend
npm ci
npm audit --audit-level=high

# Backend — cargo-audit est facultatif ; sans l'outil, l'API OSV couvre
# l'ensemble du Cargo.lock (équivalent RustSec) :
#   POST https://api.osv.dev/v1/querybatch
#   {"queries":[{"package":{"name":"<crate>","ecosystem":"crates.io"},"version":"<version>"}]}

# Si cargo-audit est installé :
cargo audit --manifest-path src-tauri/Cargo.toml \
  --ignore RUSTSEC-2024-0429 --ignore RUSTSEC-2024-0370
```

## 6. Checklist de mise à jour

1. `npm outdated` / `cargo update --dry-run` — repérer les écarts.
2. Lire les guides de migration officiels (Vite, Tailwind, plugin-react) avant de modifier
   quoi que ce soit.
3. Migrer la configuration **avant** les dépendances, puis compiler.
4. Vérifier la couverture des classes : extraire les classes utilisées dans `src/**` et
   `software.json`, puis confirmer leur présence dans le CSS généré.
5. Contrôler les utilitaires renommés par Tailwind v4 (`shadow-*`, `blur-*`, `rounded-*`,
   `outline-*`), la couleur de bordure par défaut **et la palette par défaut** (les teintes
   de v4 diffèrent de celles de v3).
6. `npm ci && npm test && npm run build`, puis `cargo fmt --check`, `cargo clippy -D warnings`,
   `cargo test`, `npm run tauri:build`.
7. Comparer le bundle avant/après et justifier tout écart.
