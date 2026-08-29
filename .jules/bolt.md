## 2026-08-29 - Bounding Box Pre-filter & Map Indexing for Spatial Searches
**Learning:** `db.findUser()` performs an $O(M)$ linear scan over the users array for every candidate driver ($O(N)$), leading to $O(N \times M)$ complexity. Combined with expensive Haversine trigonometric calculations for distant drivers, spatial search degrades significantly as active driver counts scale.
**Action:** Always pre-filter candidates using a lat/lng bounding box prior to Haversine distance calculations, and pre-index relational lookups into a `Map` ($O(1)$ lookup) before iterating over large datasets.
