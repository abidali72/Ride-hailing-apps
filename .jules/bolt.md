## 2026-09-17 - InMemoryDB Persistence Debouncing and Lookup Indexing
**Learning:** In-memory databases that persist state by calling `fs.writeFileSync` on every write operation cause severe I/O bottlenecks and event-loop lag during high-frequency requests (e.g. driver GPS location updates).
**Action:** Always debounce synchronous file persist calls with a scheduled write timer and process termination flush, and maintain O(1) Map indices for primary key lookups.
