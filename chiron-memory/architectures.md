# architecture

How the system is put together — layers, boundaries, and how data flows.

## Parsing and statistics are pure TypeScript in lib/, with no React and no server

What: `lib/` holds pure functions — normalize, header match, format detection, parser, emoji/laugh/word analysis, stats, WrappedStats projection — exported through `lib/index.ts`; nothing there imports React, the DOM or Node APIs except the test-only fixture loader · Why: the whole product runs in the browser for privacy reasons, and the other three pieces (upload, Wrapped cards, share card) build against this contract with mock data before it lands · Where: lib/index.ts

## Emoji, laugh and word tallies mutate caller-owned accumulators

What: `collectEmojis`, `collectLaughs` and `collectWords` take the target map or record as an argument and mutate it, rather than returning a fresh structure per message · Why: the statistics engine calls them once per message on chats of 50k messages, where per-message allocation is the difference between meeting and missing the two-second budget · Where: lib/stats.ts (`ingest`), lib/emoji.ts, lib/words.ts, lib/laughs.ts
