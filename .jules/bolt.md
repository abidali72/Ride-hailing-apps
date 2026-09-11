## 2026-09-11 - Avoid Object.entries() allocations in array iteration callbacks
**Learning:** Calling `Object.entries(filter)` inside `Array.prototype.find()` or `Array.prototype.filter()` callbacks creates intermediate array allocations for every item evaluated in the collection. Extracting `Object.keys(filter)` once before iterating reduced query execution time by ~10x (2093ms -> 208ms for 10k queries over 1k records).
**Action:** When searching or filtering collections against a filter object, always extract the filter keys once outside the inner loop callback.
