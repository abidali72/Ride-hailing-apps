## 2026-09-24 - Geospatial Distance Filtering Before DB Lookups in Driver Matching

**Learning:** In an in-memory DB architecture where lookups like `db.findUser()` perform O(N) array scans, mapping over all online drivers to look up user data before filtering by geospatial radius results in an O(N_drivers * N_users) runtime bottleneck (~397ms per request for 2,000 drivers).

**Action:** Always filter online drivers by radius distance first before performing database lookups and object enrichment for matching results.
