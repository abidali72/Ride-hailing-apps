## 2025-03-09 - InMemoryDB O(N) linear scans and Object.entries overhead

**Learning:** In-memory mock database services using `Array.prototype.find()` with `Object.entries(filter)` incur O(N) scanning and high GC allocation overhead per query lookup. Maintaining O(1) `Map` index lookup tables for primary/foreign keys (`id`, `user_id`, `phone`) reduces query execution time by over 99.9% while keeping array collections intact.

**Action:** Maintain secondary `Map` indexes for high-frequency key queries when working with mock or in-memory database abstractions.
