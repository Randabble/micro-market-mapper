# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **GIS**: h3-js (hexagonal grid), Leaflet (map rendering)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## ParkPal GIS Application

### Architecture
- **Frontend**: React + Vite + Leaflet dark map (CartoDB dark basemap), Tailwind CSS dark theme
- **Backend**: Express API serving pre-computed GIS data (no database needed)
- **Algorithm**: H3 hexagonal grid (resolution 8, ~460m cells) with geometric-mean Alpha Score + DBSCAN clustering

### Algorithm v3 (H3 + DBSCAN)
The Alpha Score engine identifies "Goldilocks Zones" where parking demand AND residential driveway supply overlap within walking distance:
1. **Demand**: D_i = (citation_count / hex_area) × log(1 + POI_count), normalized 0-100
2. **Supply**: S_i = distance-decayed residential parcel sum within 800m, normalized 0-100
3. **Competition**: P_i = public parking within 400m / area, normalized 0-1
4. **Alpha Score**: sqrt(D × S) × (1 - 0.3 × P) — geometric mean prevents false positives
5. **DBSCAN clustering** on hexes above threshold → ranked "Launch Zones"

### Key Files
- `artifacts/api-server/src/lib/gis-data.ts` — H3 hex grid generation, synthetic data, tunable parameters
- `artifacts/api-server/src/lib/gis-algorithm.ts` — Scoring engine, DBSCAN, Launch Zones
- `artifacts/api-server/src/routes/gis.ts` — API endpoints (hexes, geojson, launch-zones, summary)
- `artifacts/parkpal-gis/src/components/Map.tsx` — Leaflet hex choropleth map
- `artifacts/parkpal-gis/src/components/Sidebar.tsx` — Launch zone rankings, hex detail
- `artifacts/parkpal-gis/src/components/TopBar.tsx` — Layer toggles (Alpha/Demand/Supply/Competition)
- `artifacts/parkpal-gis/src/pages/Dashboard.tsx` — Main layout
- `lib/api-spec/openapi.yaml` — API spec (Orval codegen source)

### API Endpoints
- `GET /api/gis/hexes` — All scored hex cells
- `GET /api/gis/hexes/geojson` — GeoJSON FeatureCollection for map rendering
- `GET /api/gis/hexes/:h3Index` — Single hex detail
- `GET /api/gis/summary` — City-wide summary stats
- `GET /api/gis/launch-zones` — Ranked launch zones from DBSCAN clustering
- `GET /api/gis/launch-zones/:id` — Single launch zone
- `GET /api/gis/launch-zones/:id/hexes` — Hexes in a launch zone
