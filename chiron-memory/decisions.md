# decision

A choice made and the reasoning behind it — the path taken over the alternatives.

## WhatsApp export format is sniffed per file, never assumed

What: Platform, clock, seconds, year digits and day/month order are detected from each uploaded file's own header lines (`lib/detect-format.ts`), producing a `ChatFormat` that the parser then applies · Why: the same chat exported from two phones yields two different texts — locale, region and OS all change the header — so any hard-coded format breaks on the first friend with another phone, which is exactly where the viral loop dies · Where: lib/detect-format.ts, lib/header.ts · Learned: a user-supplied text format with no version marker must be treated as evidence to be read, not a spec to be assumed

## Day/month ambiguity resolved by scanning the entire file, not the first lines

What: Platform and clock are settled from the first 50 headers, but the DD/MM vs MM/DD decision scans every header looking for a value above 12; when none exists the configured default (DMY) is applied and an `AMBIGUOUS_DATE_ORDER` warning is returned · Why: a chat can run for months before hitting a day above the 12th, so the proof of the order is often thousands of lines in — deciding from the head of the file would silently mislabel every date · Where: lib/detect-format.ts (`resolveDateOrder`) · Learned: cheap-to-detect and expensive-to-detect properties of a file deserve different scan budgets

## WrappedStats is a projection, not the analysis itself

What: `analyzeChat` produces `ChatAnalysis` (rich, holds message text and every participant's name); `toWrappedStats` projects it onto `WrappedStats`, which carries only aggregates and names one participant in one field — comparisons become shares and ranks instead of leaderboards · Why: `WrappedStats` is the exact JSON V2 sends to an LLM, so it cannot carry message bodies or other people's names; keeping one rich internal type and one narrow external type means the UI is not starved and the payload is still safe · Where: lib/wrapped-stats.ts, lib/types.ts · Learned: when a type doubles as a privacy boundary, make it a projection of a richer type rather than trying to keep the rich type clean

## System messages identified structurally, not by phrase list

What: A header line whose body has no `Name: ` prefix is treated as a system notice; only a handful of notices that contain a colon (subject and description changes) need explicit patterns · Why: a dictionary of Spanish and English notice phrases would need updating with every WhatsApp release and would still mistake user messages like "Ana: added sugar" for notices · Where: lib/system-messages.ts · Learned: prefer the structural invariant a format guarantees over enumerating the strings it happens to produce today

## Errors are returned as typed values, never thrown

What: `parseChat` returns `Result<ParseResult>` with `EMPTY_FILE`, `UNRECOGNIZED_FORMAT` or `TOO_FEW_MESSAGES`, each carrying user-facing Spanish copy; exceptions are reserved for caller bugs such as asking for a participant who is not in the chat · Why: every failure here is something a user did with their own file, and the upload screen needs to switch on the cause to show useful copy rather than a stack trace · Where: lib/errors.ts, lib/parser.ts

## iOS zips are unpacked in the browser with fflate, inflating only .txt entries

What: `decodeChatFile` recognises a zip by its `PK\x03\x04` magic number (not its name), and `unzipSync` runs with a `filter` that inflates only `.txt` entries (skipping `__MACOSX/` forks), preferring `_chat.txt`; the 20 MB limit applies to the upload and again to the unpacked chat · Why: iOS names the zip after the chat and, when exported with media, packs hundreds of MB of photos we must not inflate in a phone's memory; the file can never go to a server, so decompression has to be client-side · Where: lib/intake.ts · Learned: check a size budget both before reading and after decompressing — a small zip can expand past it

## Template variants are picked by a hash of the whole WrappedStats, never by Math.random

What: `seedOf(stats)` is FNV-1a over a key-sorted JSON of the stats; `pick(options, seed, slot)` hashes seed + a per-rule slot name. Each rule family has ≥3 variants; the rule (e.g. busiest hour 0–4 → `needs-sleep`) picks the family, the hash picks the line · Why: the same chat must always give the same Wrapped, yet two people with near-identical profiles should not read identical copy — any change in any count reshuffles the picks. Key-sorting makes two equal objects built in different key orders hash alike · Where: lib/humor/seed.ts, lib/humor/templates.ts · Learned: for "deterministic but varied" output, seed from the full input and salt per decision, so picks do not move in lockstep

## The 3 AM metric is driven by the busiest hour band first, the night share second

What: busiest hour 0–4 → 82–99%; 9–19 → capped at 29%; the twilight hours sit in 30–79% by distance to 3 AM. Zero messages → 0%, never NaN · Why: the acceptance bar ("01:00 → >80%, 14:00 → <30%") has to hold regardless of how flat the histogram is; a pure weighted formula over the night share could not guarantee both bounds · Where: lib/humor/metrics.ts (`awakeAt3amProbability`)
