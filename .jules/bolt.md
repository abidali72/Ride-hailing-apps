## 2026-09-20 - Geographic Driver Matching Optimization
**Learning:** Linear DB user lookups and trigonometric Haversine distance calculations performed for all online drivers on every ride request create quadratic overhead ($O(N_{\text{drivers}} \cdot N_{\text{users}})$).
**Action:** Always pre-filter geographic coordinates using a conservative bounding box (latitude/longitude delta) before running trigonometric distance functions or hydrating relational user metadata.
