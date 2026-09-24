# architecture

How the system is put together — layers, boundaries, and how data flows.

## Parsing and statistics are pure TypeScript in lib/, with no React and no server

What: `lib/` holds pure functions — normalize, header match, format detection, parser, emoji/laugh/word analysis, stats, WrappedStats projection — exported through `lib/index.ts`; nothing there imports React, the DOM or Node APIs except the test-only fixture loader · Why: the whole product runs in the browser for privacy reasons, and the other three pieces (upload, Wrapped cards, share card) build against this contract with mock data before it lands · Where: lib/index.ts

## Emoji, laugh and word tallies mutate caller-owned accumulators

What: `collectEmojis`, `collectLaughs` and `collectWords` take the target map or record as an argument and mutate it, rather than returning a fresh structure per message · Why: the statistics engine calls them once per message on chats of 50k messages, where per-message allocation is the difference between meeting and missing the two-second budget · Where: lib/stats.ts (`ingest`), lib/emoji.ts, lib/words.ts, lib/laughs.ts

## The upload flow is one client state machine; only WrappedStats crosses to /wrapped, in React memory

What: `app/_components/chat-flow.tsx` runs landing → upload → "¿Quién sos vos?" → loading as component state on `/`; the loading screen stores the chosen scope's `WrappedStats` in `WrappedSessionProvider` (React context in the root layout) and pushes `/wrapped`, which `router.replace('/')`s when the context is empty. `analyzeExport` runs at upload (errors and participants are needed there); the loading screen only calls the cheap `toWrappedStats` and holds for `MIN_LOADING_MS` · Why: the chat must never be persisted or sent anywhere, so no sessionStorage and no server round-trip — a reload losing the result is the intended behaviour, not a bug · Where: app/_components/chat-flow.tsx, app/_components/session.tsx, app/wrapped/page.tsx · Learned: when "lose it on reload" is a privacy requirement, keep state in React memory and make the dependent route redirect on empty rather than error

## ShareSummary is the seam between the Wrapped screen and the share card

What: the share card draws only a `ShareSummary` (title, representative emoji, exactly three pre-formatted stats, diagnosis, date range); `SAMPLE_SUMMARY` drives the dev-only `/share-preview` page (404 in production, `?fail=1` forces a generation failure, `?emoji=` swaps the emoji), and `summaryFromStats` is a naive stand-in used by /wrapped until the Wrapped cards piece exposes its final-card summary · Why: the share piece had to ship before the Wrapped cards that own the title and diagnosis · Where: lib/share-card.ts, app/share-preview/, app/wrapped/wrapped-screen.tsx
