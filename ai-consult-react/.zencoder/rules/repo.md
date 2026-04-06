---
description: Repository Information Overview
alwaysApply: true
---

# Landing Page for AI Consulting

## Summary
A multi-site React landing page application for AI consulting services, originally designed in Figma. It includes multiple branded sites (DoganConsult, DoganLab, DoganHub, ShahinAI, SaudiBusinessGate) served from a single codebase with separate entry points and build configurations.

## Structure
- **src/**: Application source code
  - **components/**: React components organized by site/feature
    - **dogan-consult/**: DoganConsult site components
    - **dogan-lab/**: DoganLab site components
    - **dogan-hub/**: DoganHub site components
    - **shahin-ai/**: ShahinAI site components
    - **saudi-business-gate/**: SaudiBusinessGate site components
    - **shared/**: Shared components (ScrollToTop, ConversionAgent, constants)
    - **ui/**: Reusable UI primitives (Radix-based, ~40 components)
    - **figma/**: Figma asset helpers
  - **assets/**: Static images and assets
  - **styles/**: CSS/style files
  - **guidelines/**: Design/brand guidelines
- **build/**: Default build output
- **dist/**: Per-site build outputs (doganconsult, doganlab, doganhub)

## Language & Runtime
**Language**: TypeScript / TSX
**Framework**: React 18
**Build System**: Vite 6.3.5 (with `@vitejs/plugin-react-swc`)
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- **react** / **react-dom**: ^18.3.1
- **react-router-dom**: Client-side routing
- **@radix-ui/react-***: Extensive Radix UI primitive library (~25 components)
- **framer-motion**: Animations
- **lucide-react**: ^0.487.0 (icons)
- **tailwind-merge**, **class-variance-authority**, **clsx**: Utility-first CSS helpers
- **recharts**: ^2.15.2 (charting)
- **embla-carousel-react**: ^8.6.0 (carousel)
- **sonner**: ^2.0.3 (toast notifications)
- **react-hook-form**: ^7.55.0 (form handling)
- **cmdk**: ^1.1.1 (command palette)

**Development Dependencies**:
- **@types/node**: ^20.10.0
- **vite**: 6.3.5
- **@vitejs/plugin-react-swc**: ^3.10.2

## Build & Installation
```bash
npm install
npm run dev              # Start dev server on port 3000
npm run build            # Default build to build/
npm run build:doganconsult  # Build DoganConsult site to dist/doganconsult
npm run build:doganlab      # Build DoganLab site to dist/doganlab
npm run build:doganhub      # Build DoganHub site to dist/doganhub
npm run build:all           # Build all three sites
```

## Main Files & Entry Points
- **index.html** + **src/main.tsx**: Main multi-route app entry (all sites via react-router)
- **doganconsult.html** + **src/entry-doganconsult.tsx**: Standalone DoganConsult entry
- **doganlab.html** + **src/entry-doganlab.tsx**: Standalone DoganLab entry
- **doganhub.html** + **src/entry-doganhub.tsx**: Standalone DoganHub entry
- **src/App.tsx**: Root router with routes for all five sites
- **vite.config.ts**: Default Vite config (dev + default build)
- **vite.sites.config.ts**: Per-site build config (env-driven via `SITE` variable)
