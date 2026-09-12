## 2026-09-12 - Map Indexing for In-Memory Database Lookups
**Learning:** In-memory array searches with `Object.entries()` create O(N) time complexity per query and heavy garbage collection overhead. Indexing entity IDs and unique fields with ES6 `Map` reduces single-key query time by ~460x (3,184 ms down to ~6.8 ms per 10,000 lookups).
**Action:** Always maintain O(1) Map indexes for primary and secondary keys (`id`, `user_id`, `phone`, `driver_id`) when working with in-memory JSON databases.
