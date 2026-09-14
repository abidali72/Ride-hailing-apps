## 2026-09-14 - Avoid object allocations inside array search callbacks

**Learning:** Re-evaluating `Object.entries()` inside array iteration callbacks (like `Array.prototype.find()` or `filter()`) creates `O(N)` garbage object allocations per query call. In an in-memory DB or frequently queried arrays, hoisting key extractions with a matcher factory reduces execution time by over 90% (~10x speedup).
**Action:** Always extract query criteria keys outside the inner predicate function when matching objects against filters in arrays.
