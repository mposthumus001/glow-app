# `australia-states.geojson` — source & licence

**Source:** [Natural Earth](https://www.naturalearthdata.com) 1:10m Cultural Vectors, "Admin 1 – States, Provinces"
(`ne_10m_admin_1_states_provinces`), via the plain-GeoJSON mirror
[martynafford/natural-earth-geojson](https://github.com/martynafford/natural-earth-geojson)
(`10m/cultural/ne_10m_admin_1_states_provinces.json`).

Checkpoint C's visual review found the previous **1:50m** build of this file
rendered the Australian Capital Territory as a crude, oversized ~20-vertex
blob that didn't resemble the real (compact) Canberra territory. This file
was regenerated from Natural Earth's much higher-detail **1:10m** admin-1
dataset instead — ACT alone now carries **157 vertices** (vs. ~20 before).

**Licence:** Natural Earth data is placed in the **public domain**. From the
[Natural Earth Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/):

> "All versions of Natural Earth raster + vector map data found on this
> website are in the public domain. You may use the maps in any manner,
> including modifying the content and design, copying and distributing them
> to others, and publishing and selling the maps for profit, or including
> them in your own copyrighted work."
>
> "No permission is needed to use Natural Earth. Crediting the authors is not
> required, but is appreciated."

No attribution is legally required; this file is provided anyway as good
practice and to document provenance.

## What was done to produce this file

1. Downloaded the world-wide `ne_10m_admin_1_states_provinces.json` (~60 MB,
   all countries).
2. Filtered to the 11 Natural Earth features where `admin === "Australia"`:
   the 8 states/territories, **Jervis Bay Territory**, and two remote
   islands administered as part of a state but with no `AuStateCode` of
   their own (**Macquarie Island**, ~1,500 km south of Tasmania near
   -54.6°S/158.9°E; **Lord Howe Island**, ~600 km off the NSW coast).
3. Mapped each of the 8 states/territories to its `AuStateCode` via its
   Natural Earth `iso_3166_2` code (e.g. `AU-ACT` → `ACT`), matching the
   existing [`AuStateCode`](../../types.ts) catalog.
4. **Jervis Bay Territory** is folded into the `ACT` `MultiPolygon` as its
   own separate polygon (a federal enclave with no `AuStateCode` of its
   own, administered jointly with the ACT) — **not merged into or
   reshaping the mainland Canberra polygon**, just a second, disconnected
   polygon in the same feature at its own real (and distant) location. The
   camera-framing logic in `../map/stateBounds.ts` already excludes it from
   `fitBounds` targeting via its general islands/exclaves proximity rule.
5. **Macquarie Island** and **Lord Howe Island** are excluded entirely (not
   folded into TAS/NSW). At 1:50m resolution Natural Earth never surfaced
   them as distinct features, so the previous file never included them
   either; folding them in at 1:10m would drag `TAS`/`NSW`'s full bbox (and
   the national Reset-to-Australia bbox) out to implausible sub-Antarctic/
   mid-Pacific extents for two islets that carry no presence data and no
   `AuStateCode` of their own.
6. Normalised every feature to `MultiPolygon` and rounded coordinates to 3
   decimal places (~110 m — plenty for a country/state-scale display map;
   this is not a survey-grade dataset).
7. NSW's polygon already carries a ring "hole" where the ACT enclave sits
   inside it, straight from the source data (Natural Earth's 1:10m admin-1
   polygons don't overlap) — nothing needed constructing by hand.

Result: **8 features, ~15,800 vertices total, ~275 KB** — larger than the
1:50m file it replaces (~2,150 vertices, ~39 KB) but still small enough to
ship as a first-party bundled asset, and necessary for ACT (and the other
smaller territories) to render as a recognisable shape rather than a
simplified blob.

## What this file is for (and isn't)

This is the **authoritative interactive geometry** for the MapLibre Atlas:
state/territory boundary + fill layers, click/tap hit areas, and the
`fitBounds` bounding-box source of truth (see `map/stateBounds.ts`). It is
**not** used for anything requiring legal or survey-grade precision, and it
is independent of whatever basemap tiles (PMTiles) are layered underneath it
for supporting geographic context.
