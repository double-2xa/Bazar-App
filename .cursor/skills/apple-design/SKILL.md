---
name: apple-design
description: >-
  Apple's approach to interface design and fluid, physical motion, translated for the web.
  Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet
  interactions, momentum and interruptible transitions, translucent materials and depth,
  typography (optical sizing, tracking, leading), reduced-motion, or the design foundations
  (feedback, spatial consistency, restraint) behind Apple-style interfaces — especially for
  Nice Price Bazar admin and mobile polish without changing functionality.
---

# Apple Design (project)

Source: [emilkowalski/skills — apple-design](https://github.com/emilkowalski/skills/tree/main/skills/apple-design)

## When applying in this repo

- Prefer **visual craft only** unless the user asks for interaction redesign.
- Keep brand colors (`#C8102E`, `#FFD21E`, cream `#FFF8E7`, charcoal).
- Do **not** swap to purple/indigo AI-default themes.
- Preserve all routes, forms, APIs, and business logic.

## Core principles (short)

1. **Response** — feedback on press-down (`:active` / `activeOpacity`), not only on release.
2. **Materials** — translucent chrome with `backdrop-filter`; heavier materials for structure (sidebar), lighter for interactive chips.
3. **Typography** — system font stack; tighten tracking on large headings (`letter-spacing: -0.02em`); body near `0`.
4. **Springs / motion** — critically damped defaults; bounce only after momentum gestures; honor `prefers-reduced-motion`.
5. **Spatial consistency** — enter/exit same path; soft shadows; scroll-edge fades over hard dividers where possible.
6. **Restraint** — simplicity not minimalism; every spacing/timing deliberate.

## Concrete CSS patterns

```css
.btn:active:not(:disabled) {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}

.toolbar {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}

.display {
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-optical-sizing: auto;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .toolbar {
    background: #fff;
    backdrop-filter: none;
  }
}
```

Full skill reference: https://raw.githubusercontent.com/emilkowalski/skills/main/skills/apple-design/SKILL.md
