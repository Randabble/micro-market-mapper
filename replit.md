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
- **Algorithm**: Multi-resolution H3 hexagonal grid with geometric-mean Alpha Score + DBSCAN clustering

### Multi-Resolution H3 Grid (v3.1)
Three resolution tiers based on neighborhood density classification:
- **Res 9 (~174m)**: Dense mixed-use areas (Capitol Hill, University District)
- **Res 8 (~460m)**: Urban neighborhoods (Downtown, SLU, Madrona, Ballard, Fremont, etc.)
- **Res 7 (~1.2km)**: Suburban zones (Greenwood, Magnolia, Redmond, Eastgate, etc.)

Grid generation:
1. Generate base res-8 hex set for bounding box
2. For "dense" zones: expand each res-8 hex into 7 res-9 children via `cellToChildren()`
3. For "suburban" zones: merge res-8 hexes into parent res-7 via `cellToParent()`
4. Data uses coordinate-seeded RNG (`coordSeed(lat, lng, salt)`) — each hex's data depends only on its location, making results stable regardless of grid structure changes
5. Raw counts are area-scaled: `interpolateFromZones() * (hexArea / refArea)` to maintain density equivalence across resolutions

### Algorithm v3.1 (Multi-Res H3 + DBSCAN)
The Alpha Score engine identifies "Goldilocks Zones" where parking demand AND residential driveway supply overlap within walking distance:
1. **Demand**: D_i = (citation_count / hex_area) × log(1 + POI_count), normalized 0-100
2. **Supply**: S_i = density-normalized distance-decayed residential sum within 800m, normalized 0-100
3. **Competition**: P_i = density-normalized public parking within 400m, normalized 0-1
4. **Alpha Score**: sqrt(D × S) × (1 - 0.3 × P) — geometric mean prevents false positives
5. **DBSCAN clustering** on hexes above threshold → ranked "Launch Zones"

Supply and competition use brute-force spatial search (not `gridDisk`) for cross-resolution neighbor finding. Each neighbor's contribution is normalized by its area (parcels/km²) to ensure resolution-invariant scoring.

### Water Body Exclusion
Ray-casting point-in-polygon filter excludes hexes over water. Six polygon definitions:
- Lake Washington (full shoreline)
- Puget Sound / Elliott Bay (Burien to Shoreline)
- Lake Union + Ship Canal + Portage Bay
- Salmon Bay / Shilshole Bay
- Mercer Island east channel
- Mercer Island west channel

### Key Files
- `artifacts/api-server/src/lib/gis-data.ts` — H3 hex grid generation, multi-resolution, synthetic data, water filter, tunable parameters
- `artifacts/api-server/src/lib/gis-algorithm.ts` — Scoring engine, spatial neighbor search, DBSCAN, Launch Zones
- `artifacts/api-server/src/routes/gis.ts` — API endpoints (hexes, geojson, launch-zones, summary)
- `artifacts/parkpal-gis/src/components/Map.tsx` — Leaflet hex choropleth map
- `artifacts/parkpal-gis/src/components/Sidebar.tsx` — Launch zone rankings, hex detail, resolution breakdown
- `artifacts/parkpal-gis/src/components/TopBar.tsx` — Layer toggles (Alpha/Demand/Supply/Competition)
- `artifacts/parkpal-gis/src/pages/Dashboard.tsx` — Main layout
- `lib/api-spec/openapi.yaml` — API spec (Orval codegen source); never use em-dashes in description fields

### API Endpoints
- `GET /api/gis/hexes` — All scored hex cells (includes `resolution` field)
- `GET /api/gis/hexes/geojson` — GeoJSON FeatureCollection for map rendering
- `GET /api/gis/hexes/:h3Index` — Single hex detail
- `GET /api/gis/summary` — City-wide summary stats (includes `resolutionBreakdown`)
- `GET /api/gis/launch-zones` — Ranked launch zones from DBSCAN clustering
- `GET /api/gis/launch-zones/:id` — Single launch zone
- `GET /api/gis/launch-zones/:id/hexes` — Hexes in a launch zone

### Critical Notes
- `cachedResult` in gis-algorithm.ts caches computation in-memory; changes to gis-data.ts require API server restart
- api-client-react dist must be rebuilt (`pnpm --filter @workspace/api-client-react exec tsc -p tsconfig.json`) when OpenAPI spec changes
- Zone density assignments in ZONE_CENTERS[] control which neighborhoods get which resolution
