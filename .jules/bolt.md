## 2025-05-18 - Deferred DB lookups in spatial driver matching
**Learning:** In the driver matching pipeline, calling `db.findUser` for every online driver prior to filtering by geographic radius resulted in O(N) database scans (and inner object allocations) for all out-of-range drivers.
**Action:** Always filter dataset elements using fast scalar/distance filters before chaining expensive lookups or nested relational queries.
