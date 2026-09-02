## 2026-09-02 - O(1) Map Indexing for In-Memory Database
**Learning:** Linear array searches (`Array.prototype.find`/`filter`) with `Object.entries(filter)` created massive performance bottlenecks ($O(N^2)$ behavior in matching drivers with users and 250k+ array allocations per request).
**Action:** Maintain secondary Map index lookups (`usersById`, `driversByUserId`, etc.) inside the database class for constant-time $O(1)$ query resolution while returning shallow array copies to prevent state mutation.
