## 2026-09-03 - Spatial Bounding Box Pre-Filtering and Lazy DB Lookups
**Learning:** Performing expensive operations (such as Haversine trigonometric distance calculations and linear O(U) array searches for user details) over the entire database collection for every search request causes severe performance bottlenecks (~1300ms per call for 2000 drivers).
**Action:** Always pre-filter candidates using cheap spatial bounding box checks (~110km per lat degree) and defer user database lookups until after candidates pass the distance threshold.
