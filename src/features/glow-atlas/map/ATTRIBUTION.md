# PMTiles basemap — attribution & hosting notes

This folder's code renders an **optional** `pmtiles://` vector context layer
from whatever archive `NEXT_PUBLIC_ATLAS_PMTILES_URL` points at (see
`.env.example` and `docs/GlowAtlas.md`). No `.pmtiles` archive is committed
to this repository or bundled into the deployment — see the root
`.gitignore` and Amendment 1 of the MapLibre Atlas Replacement plan.

For the interactive states/territories geometry (fills, hit areas,
`fitBounds` source of truth) see `../data/geo/ATTRIBUTION.md` instead — that
dataset is first-party and always renders regardless of PMTiles.

## If you host a Protomaps/OpenStreetMap-derived PMTiles archive

The reference basemap this feature was designed against is a
[Protomaps](https://protomaps.com) build of
[OpenStreetMap](https://www.openstreetmap.org/copyright) data. **OSM data is
licensed under the Open Database License (ODbL)**, which *does* require
attribution. If the archive at your configured URL is OSM-derived (directly
or via Protomaps), keep the on-map attribution visible — `GlowMap.tsx`
renders a compact `AttributionControl` with:

> © OpenStreetMap contributors

Do not remove or hide this control while an OSM-derived PMTiles source is
active. If you host a different, non-OSM dataset, update the
`customAttribution` string in `GlowMap.tsx` to match that dataset's licence
terms instead.

## Building/hosting your own archive (production)

1. Build a `.pmtiles` archive (e.g. with
   [`pmtiles`](https://github.com/protomaps/PMTiles) CLI or
   [Protomaps Basemaps](https://github.com/protomaps/basemaps)) covering
   Australia at a reasonable zoom range for a country/state-scale display
   map — no need for street-level detail.
2. Upload it to object storage/CDN with **HTTP range-request support**
   (required for PMTiles' partial-read access pattern) — e.g. a Supabase
   Storage public bucket or a Cloudflare R2 bucket.
3. Set `NEXT_PUBLIC_ATLAS_PMTILES_URL` to that file's public URL in your
   deployment environment (never commit it to `.env*` files other than as
   documentation in `.env.example`).
4. If the URL is missing, misconfigured, or fails to load, `GlowMap`
   automatically falls back to the local Australia/state GeoJSON basemap and
   shows a subtle "Showing simplified map" status — see `basemapStatus.ts`.
