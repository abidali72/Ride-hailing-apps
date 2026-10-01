## 2025-05-18 - Early Distance Filtering in Driver Matching
**Learning:** `db.findUser()` performs an O(N) array search on every driver when matching. When querying `findNearbyDrivers`, mapping user details onto drivers before distance filtering results in O(N_drivers * N_users) user lookups and intermediate object allocations, even for drivers out of range.
**Action:** Filter drivers by geographic distance first before performing database lookups for user details (`name`, `phone`, `rating`).
