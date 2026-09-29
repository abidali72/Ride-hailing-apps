## 2026-09-29 - Pre-Extracting Search Keys and Bounding Box Pre-filtering in In-Memory DBs

**Learning:** In-memory collection searching using `Object.entries(filter)` inside iteration predicates (e.g. `Array.prototype.find` / `filter`) creates temporary key-value array tuples on every record inspection, causing massive garbage collection pressure and reducing lookup throughput by over 10x. Additionally, performing expensive Haversine trigonometric distance calculations (`Math.sin`, `Math.cos`, `Math.atan2`) and user enrichment on all candidates without pre-filtering candidates via a fast latitude/longitude bounding box wastes CPU cycles on out-of-range records.

**Action:**
1. Always extract query filter keys (`Object.keys(filter)`) outside array iteration callbacks when implementing in-memory data structures or search helpers.
2. For spatial/location queries, pre-filter candidate sets using a fast bounding-box margin (~111km per latitude degree) before invoking Haversine calculations and performing secondary lookups.
