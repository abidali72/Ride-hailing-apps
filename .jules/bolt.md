## 2026-10-05 - Geospatial Pre-filtering and Deferred Lookups for Driver Matching
**Learning:** In memory-based or SQL ride-hailing services, driver-matching algorithms often map and enrich every online driver with trig-heavy distance calculations and linear DB user lookups before applying radius filters.
**Action:** Always pre-filter coordinate-based datasets using bounding box limits (lat/lng diffs based on ~110km/deg) and defer object enrichment or user lookups until after candidates pass spatial bounds.
