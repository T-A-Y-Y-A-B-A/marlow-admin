# Marlow Admin

Admin dashboard for a subscription business: revenue, subscriber health and user management.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and Three.js. No UI kit and no chart library: the charts, the 3D view, the globe and every component are written for this project.

## Features

- **Overview**: animated KPI cards with sparklines; a 3D revenue skyline (WebGL, 12 months × 5 regions: drag to orbit, hover a bar for its figure, toggle regions from the legend); a daily revenue chart (30D / 90D / 12M against the previous period, hover or arrow keys to inspect); an activity feed; newest users; a draggable globe of subscribers by region; CSV export.
- **Command bar**: press `⌘K` / `Ctrl+K` anywhere to jump to a page, add a user, switch theme, or find a person by name.
- **Users**: search (accent-insensitive, press `/` to focus), filter by status, role and plan, sortable columns, pagination, and add / edit / delete in modal dialogs with validation. The workspace's last owner can't be demoted or removed.
- **Settings**: profile (updates the sidebar and top bar live), theme (light / dark / system), reduce motion, email notification toggles, and a reset for the sample data.
- Responsive from 360px up. The sidebar becomes a drawer on small screens, and the table becomes a card list.
- Keyboard and screen-reader friendly: native `<dialog>` focus handling, skip link, labelled controls, `aria-sort`, live regions for toasts and chart values.

## Design

Bricolage Grotesque for headings and figures, Instrument Sans for text, JetBrains Mono for labels. The palette is near-black (or cream in light mode) with an acid-lime accent and four supporting series colours. Three.js is loaded on demand after the page paints, and the 3D view and globe pause when they're off screen or when "Reduce motion" is on.

## Data

There's no backend. `src/lib/api.ts` is a mock API with network-like latency that persists to `localStorage`, so changes survive a reload. Swap those functions for `fetch` calls to plug in a real API. The sample data in `src/lib/data.ts` comes from fixed seeds, so every load shows the same numbers.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for search, filters, sorting, validation, pagination
npm run lint
npm run build && npm start
```

Requires Node 20.9+. `npm test` uses Node's built-in test runner and needs Node 22.18+ (TypeScript type stripping).

## Project structure

```
src/
  app/                 routes: / (overview), /users, /settings
  components/
    ui/                Button, Field, Select, Switch, Badge, Avatar, Card, Dialog, Toast, Icon, CountUp
    shell/             AppShell (top bar, drawer, theme), Sidebar, CommandPalette
    dashboard/         StatCard, RevenueSkyline (3D), RevenueChart, Globe, RegionsCard, ActivityCard, NewestUsers, ExportButton
    users/             UsersView, UserForm
    settings/          SettingsView
  lib/
    users.ts           user types + pure query/validation logic (tested)
    api.ts             mock API
    data.ts            seeded sample data and derived stats
    settings.ts        settings store (useSyncExternalStore + localStorage)
    commands.ts        hand-off from the command bar to pages
    format.ts          number, currency and date helpers
```

## Deploying

Import the repository into Vercel. It detects Next.js with no configuration. Every route is pre-rendered as static HTML.
