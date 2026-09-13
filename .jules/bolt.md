## 2025-05-18 - In-Memory DB Entity Lookups and Synchronous Disk Writes

**Learning:** In MVP in-memory DB setups, linear array scans with `Object.entries()` inside `.find()` callbacks create millions of temporary array objects, bottlenecking entity lookups. Additionally, synchronous `fs.writeFileSync()` on every DB update causes severe event-loop blocking during rapid mutations.

**Action:** Maintain `Map` indexes (`usersById`, `driversById`, `driversByUserId`, `tripsById`) for primary key $O(1)$ lookups, hoist `Object.keys()` out of search iteration loops, and debounce synchronous disk persistence (`save()`) using a short timer.
