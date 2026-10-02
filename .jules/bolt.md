## 2026-10-02 - Synchronous JSON Database Disk Writes Block Node Event Loop
**Learning:** Synchronous disk writes (`fs.writeFileSync`) coupled with `JSON.stringify` on every DB mutation create severe event loop lag (~7.1ms per write under load), causing high latency for high-frequency operations like driver location tracking.
**Action:** Debounce disk updates using non-blocking asynchronous `fs.writeFile` with fallback synchronous flush on process termination signals.
