# architecture

How the system is put together — layers, boundaries, and how data flows.

## Parsing and statistics are pure TypeScript in lib/, with no React and no server

What: `lib/` holds pure functions — normalize, header match, format detection, parser, emoji/laugh/word analysis, stats, WrappedStats projection — exported through `lib/index.ts`; nothing there imports React, the DOM or Node APIs except the test-only fixture loader · Why: the whole product runs in the browser for privacy reasons, and the other three pieces (upload, Wrapped cards, share card) build against this contract with mock data before it lands · Where: lib/index.ts

## Emoji, laugh and word tallies mutate caller-owned accumulators

What: `collectEmojis`, `collectLaughs` and `collectWords` take the target map or record as an argument and mutate it, rather than returning a fresh structure per message · Why: the statistics engine calls them once per message on chats of 50k messages, where per-message allocation is the difference between meeting and missing the two-second budget · Where: lib/stats.ts (`ingest`), lib/emoji.ts, lib/words.ts, lib/laughs.ts

## The upload flow is one client state machine; only WrappedStats and its narrative cross to /wrapped, in React memory

What: `app/_components/chat-flow.tsx` runs landing → upload → "¿Quién sos vos?" → loading as component state on `/`; the loading screen stores the chosen scope's `WrappedStats` plus its `WrappedNarrative` (`{ stats, narrative }`) in `WrappedSessionProvider` (React context in the root layout) and pushes `/wrapped`, which `router.replace('/')`s when the context is empty. `analyzeExport` runs at upload (errors and participants are needed there); the loading screen only calls the cheap `toWrappedStats`, awaits `templateNarrator.narrate`, and holds for `MIN_LOADING_MS`; the Wrapped's restart button just clears the session, and `/wrapped`'s empty-redirect returns to a fresh landing · Why: the chat must never be persisted or sent anywhere, so no sessionStorage and no server round-trip — a reload losing the result is the intended behaviour, not a bug · Where: app/_components/chat-flow.tsx, app/_components/session.tsx, app/wrapped/page.tsx · Learned: when "lose it on reload" is a privacy requirement, keep state in React memory and make the dependent route redirect on empty rather than error

## Humor layer sits behind an async WrappedNarrator; V1 templates and the V2 LLM share one output type

What: `lib/humor/` turns `WrappedStats` into a JSON-only `WrappedNarrative` (absurd metrics + texts, `source: 'templates' | 'llm'`) through `WrappedNarrator.narrate(stats): Promise<…>`; the loading screen awaits it and the cards read only the narrative · Why: V2 replaces the templates with an LLM that receives the same `WrappedStats` JSON, so the seam is async and data-only from day one — the cards and the loading screen do not change when the source does · Where: lib/humor/types.ts, lib/humor/templates.ts (`templateNarrator`), app/_components/loading-screen.tsx · Learned: when a sync V1 is a placeholder for an async V2, make the interface async now; the placeholder pays nothing and the swap costs nothing

## Wrapped cards are built as pure data in deck.ts, rendered by a dumb component

What: `buildDeck(stats, narrative)` returns ordered card models (gradient, emoji, texts, viz) and decides which cards are omitted, which switch to an `empty` variant, and when the comparison cards appear; `story-card.tsx` only renders · Why: the acceptance rules (no bare zero, no NaN, empty variants, cards gated on participant count) become plain unit tests in the node Vitest environment, with no DOM or React testing library · Where: app/wrapped/deck.ts, app/wrapped/__tests__/deck.test.ts

## The share card draws a ShareSummary adapted from the final card's WrappedSummary

What: the share card draws only a `ShareSummary` (title, representative emoji, exactly three pre-formatted stats, diagnosis, date range). `toShareSummary(finalCard.summary, stats)` builds it from the deck's `FinalCard.summary` (`WrappedSummary`, which has no dates) plus `stats.period`, padding missing highlights from the stats; the final card's "Share my Wrapped" opens `SharePanel` in a dialog outside the stories region. `SAMPLE_SUMMARY` drives the dev-only `/share-preview` page (404 in production, `?fail=1` forces a generation failure, `?emoji=` swaps the emoji) · Why: the image needs the period and exactly three stats, which the final card's summary does not guarantee; keeping the dialog outside the tap/swipe region stops taps on the preview from flipping cards · Where: lib/share-card.ts, app/wrapped/wrapped-screen.tsx, app/wrapped/story-card.tsx, app/share-preview/
