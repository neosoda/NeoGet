# Design System — NeoGet v2.0

## Philosophie de Design

NeoGet v2.0 repose sur une interface utilisateur moderne, fluide et hautement réactive, conçue pour simplifier l'installation massive de logiciels sur Windows.
- **Minimalisme** : Suppression du superflu pour se concentrer sur l'action.
- **Fluidité** : Animations riches via Framer Motion pour un feedback immédiat.
- **Accessibilité** : Respect des contrastes WCAG 2.1 AA et navigation au clavier.
- **Cohérence** : Utilisation stricte des utilitaires Tailwind CSS.

---

## Design Tokens (Tailwind CSS)

### Palette de Couleurs

#### Couleurs de Marque
- **Primary (Bleu)** : `bg-blue-600` (`#2563EB`) — Actions principales, progression.
- **Accent (Teal)** : `bg-teal-600` (`#0D9488`) — Actions secondaires, recherche WinGet.
- **Orange (Warm)** : `bg-orange-500` (`#F97316`) — Alertes douces, highlights.

#### États de Statut
- **Success** : `text-emerald-500` / `bg-emerald-500`
- **Error** : `text-rose-500` / `bg-rose-500`
- **Warning** : `text-amber-500` / `bg-amber-500`
- **Info** : `text-sky-500` / `bg-sky-500`

#### Fonds et Surfaces
- **Light Mode** :
  - Background : `bg-stone-50` (`#FAFAF9`)
  - Surface : `bg-white`
  - Text : `text-stone-900`
- **Dark Mode** :
  - Background : `bg-stone-950` (`#0C0A09`)
  - Surface : `bg-stone-900`
  - Text : `text-stone-100`

---

## Typographie

Utilisation de la stack native système pour une performance maximale :
- **Headings** : Semibold/Bold, tracking tight (`tracking-tight`).
- **Body** : Regular, line-height relax (`leading-relaxed`).
- **Code** : Monospace pour les IDs de paquets et les logs d'installation.

---

## Animations (Framer Motion)

### Principes
- **Entrée** : Opacité 0 → 1 avec un léger décalage vers le haut (y: 20 → 0).
- **Hover** : Scale 1.02 ou 1.05 pour les cartes.
- **Tap** : Scale 0.95 ou 0.98 pour un feedback tactile.
- **Transitions** : `duration: 0.2` par défaut, `type: "spring"` pour les éléments interactifs.

### Exemple de configuration
```typescript
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

---

## Composants UI

### Cartes de Logiciels (`SoftwareCard`)
- **Structure** : Header (Titre + Badge), Description (2 lignes max), Footer (Package ID + Boutons).
- **Interactivité** : Ombre portée (`shadow-md`) qui s'accentue au hover (`hover:shadow-xl`).
- **Bords** : `rounded-2xl` pour un aspect moderne et organique.

### Barre de Progression (`InstallationOverlay`)
- **Overlay** : Fond flouté (`backdrop-blur-md`) pour maintenir le contexte.
- **Barre** : Animation de remplissage fluide basée sur l'index actuel.
- **Feedback** : Icônes Lucide animées (spinner pour chargement, check pour succès).

### Boutons
- **Primary** : Gradient `from-blue-600 to-blue-500`, texte blanc.
- **Accent** : Gradient `from-teal-600 to-teal-500`, texte blanc.
- **Ghost** : Fond transparent, bordure subtile, idéal pour le panier.

---

## Mode Sombre (Persistence)

- **Détection** : Automatique via `window.matchMedia('(prefers-color-scheme: dark)')`.
- **Persistence** : Stockage du choix utilisateur dans `localStorage`.
- **Implémentation** : Classe `.dark` sur le tag `html` pilotée par React.

---

## Accessibilité

- **Focus** : Anneau de focus visible (`focus-visible:ring-2`) sur tous les éléments interactifs.
- **ARIA** : Utilisation de `aria-label` pour les boutons icon-only.
- **Clavier** : Navigation complète via `Tab`, fermeture des modales via `Esc`.

---

## Versioning
- **Version** : 2.0.0
- **Dernière mise à jour** : 6 avril 2026
- **Framework** : React 19 + Tailwind 3.4
