## 2026-09-04 - Hoisting Object.entries in In-Memory DB Filters
**Learning:** Calling `Object.entries(filter)` inside `.find()` or `.filter()` callbacks causes $N$ object/array allocations per query, causing heavy GC pressure and slow lookup times ($O(N)$ allocations per search).
**Action:** Always hoist `Object.entries(filter)` outside array iteration loops or fast-path single-property lookups when searching in-memory datasets.
