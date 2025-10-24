# Atlas UI – Web App

This application is a multilingual Next.js 14 frontend configured with Tailwind CSS, `next-intl`, and right-to-left (RTL) support. It ships with starter UI primitives, a responsive layout, and a locale switcher that is prepared for the future addition of Berber/Tamazight.

## Features

- **Next.js 14 App Router** with TypeScript and strict mode enabled.
- **Internationalisation via `next-intl`** for Arabic (`ar`) and French (`fr`), with scaffolding for additional locales.
- **RTL awareness** powered by HTML `dir` attributes and the `tailwindcss-rtl` plugin.
- **Shared UI primitives** (`Button`, `Card`, `Typography`) and an application shell layout component.
- **Locale-aware middleware** that prefixes routes with the active locale and keeps navigation consistent.

## Getting started

Install the workspace dependencies from the monorepo root:

```bash
pnpm install
```

Run the development server from the project root or the `apps/web` directory:

```bash
pnpm dev
# or
cd apps/web && pnpm dev
```

Navigate to [http://localhost:3000/fr](http://localhost:3000/fr) or [http://localhost:3000/ar](http://localhost:3000/ar) to see the locale-aware experience.

## Project structure

```
apps/web/
  src/
    app/[locale]/        # Locale-aware routes, layouts, and error boundaries
    components/          # Layout primitives, UI elements, locale switcher
    i18n/                # Localisation config, message catalogues, helpers
    lib/                 # Shared utilities (fonts, class helpers, etc.)
```

## Available scripts

- `pnpm dev` – Run the Next.js development server.
- `pnpm build` – Generate a production build.
- `pnpm start` – Start the production server.
- `pnpm lint` – Run ESLint with the project configuration.
