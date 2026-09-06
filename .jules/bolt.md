## 2026-09-06 - In-Memory DB Array Scan Bottleneck in Matching Engine
**Learning:** `InMemoryDB` methods (`findUser`, `findDriver`, `findTrip`) previously performed $O(N)$ linear array scans on every request and matching query. In driver matching loops, performing $O(N)$ lookups per online driver caused extreme CPU overhead (>100ms per search for 1,000 drivers).
**Action:** Always maintain Map indexes on primary keys (`id`, `user_id`) for in-memory DB implementations to maintain $O(1)$ lookup speeds during high-frequency server routes and matching algorithms.
