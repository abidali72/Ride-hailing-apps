## 2026-09-23 - Primary Key Map Indexing for In-Memory Database
**Learning:** `InMemoryDB` array-based `findUser`, `findDriver`, and `findTrip` methods result in O(N) linear scans on every lookup (e.g. inside `findNearbyDrivers`), degrading performance to ~1500ms per driver matching call at scale. Adding a Map index for primary key (`id`) lookups reduces lookup complexity to O(1) and matching response time to ~6.7ms.
**Action:** Always index primary key lookups with Map objects in in-memory database or mocking layers.
