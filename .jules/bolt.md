## 2026-09-16 - Deferred User Enrichment & Indexed Lookup in Driver Matching

**Learning:** Unindexed linear searches over `users` during driver matching resulted in $O(D \times U)$ complexity per request when performing eager user enrichment before distance filtering. Filtering nearby drivers by distance first reduces candidate size to $K \ll D$, and indexing users in a `Map` converts enrichment lookups from $O(U)$ linear scans to $O(1)$ constant time operations.

**Action:** Always apply distance/spatial filters before costly record enrichment or join lookups, and index foreign key lookups when querying un-indexed collections.
