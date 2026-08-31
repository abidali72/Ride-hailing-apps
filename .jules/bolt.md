## 2026-08-31 - InMemoryDB Map Indexing for Primary Key Lookups
**Learning:** The custom JSON-based `InMemoryDB` previously performed O(N) linear array scans for all `id` and `user_id` lookups. Since API routes and driver matching frequently perform nested entity lookups in loops, replacing single-key lookups with O(1) Map indexes (`_usersById`, `_driversById`, `_driversByUserId`, `_tripsById`) yields >4x performance improvements.
**Action:** Maintain internal Map indexes on `InMemoryDB` write operations (`addUser`, `addDriver`, `addTrip`, `updateUser`, etc.) and rebuild them on DB load.
