---
version: "alpha"
name: "Astryx Neutral"
description: "Neutral and minimalist theme from Meta Astryx Design System. Muted aesthetic with system fonts and monochromatic palette."
colors:
  primary: "#15110C"
  secondary: "#4E606F"
  tertiary: "#111112"
  neutral: "#F8F4ED"
  surface: "#FFFFFF"
typography:
  h1:
    fontFamily: Figtree
    fontSize: 2.25rem
    fontWeight: 700
  body-md:
    fontFamily: Figtree
    fontSize: 1rem
    fontWeight: 400
  label-caps:
    fontFamily: Figtree
    fontSize: 0.75rem
    fontWeight: 500
rounded:
  sm: 8px
  md: 12px
  lg: 16px
spacing:
  sm: 1.0rem
  md: 1.5rem
  lg: 2.0rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

Neutral and minimalist theme from Meta Astryx Design System. Muted aesthetic with system fonts and monochromatic palette. Astryx Neutral is the base theme of Meta's design system launched in 2026. It serves as the neutral foundation upon which thematic variations are built, prioritizing readability and accessibility.



## Colors
- **Background:** #F8F4ED (light) / #111112 (dark)
- **Surface:** #FFFFFF (light) / #1F1F22 (dark)
- **Text:** #15110C (light) / #DFE2E5 (dark)
- **Accent:** #15110C (light) / #DFE2E5 (dark)
- **Secondary:** #4E606F
- **Border:** rgba(5,54,89,0.1)


## Typography
- **Heading:** Figtree 600/700
- **Body:** Figtree 400/500
- **Code:** SF Mono
- **Scale:** base 14px (0.875rem), ratio 1.2
- **Weights:** 400, 500, 600, 700


## Layout
- **Spacing scale:** 0/2/4/6/8/12/16/20/24/28/32/36/40/44/48 px
- **Radius:** inner 8px, element 12px, container 16px, page 32px
- **Element sizes:** sm 28px, md 32px, lg 36px


## Elevation & Depth
- Sem sombras pesadas. Profundidade comunicada por borders sutis e diferença de superfície.
- Border padrão: rgba(5,54,89,0.1)


## Shapes

Base corner radius: 8px. See rounded tokens in front matter for the full scale.


## Components
- Buttons com radius 12px e padding consistente
- Cards com surface #FFFFFF e border sutil
- Inputs com height md 32px e radius 8px


## Do's and Don'ts
- ✓ Use contraste alto para texto principal
- ✓ Mantenha hierarquia com peso tipográfico
- ✗ Não adicione cores saturadas
- ✗ Não use sombras dramáticas


## Use Case

Corporate dashboards, productivity interfaces, text-heavy content apps, admin panels, and internal tools.

<!-- Source: https://designmd.app/library/astryx-neutral · designmd.app -->
