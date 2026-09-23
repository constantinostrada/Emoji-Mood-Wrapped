# gotcha

A non-obvious pitfall or trap, learned the hard way.

## Invisible characters must be stripped before any line is matched

What: `normalizeExport` removes the BOM, bidi marks (U+200E/U+200F/U+061C/U+2066-2069) and maps U+202F and U+00A0 to a plain space before anything tries to match a header · Why: iOS wraps timestamps in bidi marks and puts a narrow no-break space before "p. m.", so a regex looking for `\s` and `-` silently matches nothing and the whole file reads as unrecognised · Where: lib/normalize.ts · Learned: with text pasted or exported from a phone, normalise the invisible characters first — a failing regex gives no hint that the space was not a space

## The export's trailing newline glues a blank line onto the last message

What: The parser strips trailing newlines (`/\n+$/`) before splitting into lines · Why: every line that does not start with a date is appended to the previous message, so the file's own final newline turned the last message's text into `"…\n"`, inflating its length and breaking exact-text assertions · Where: lib/parser.ts · Learned: a rule of the form "unmatched lines belong to the previous record" has to account for the file's terminator

## Timestamps are built as local time and never round-tripped through UTC

What: `buildTimestamp` uses the `new Date(y, m, d, …)` local constructor and `dayKey` formats with `getFullYear`/`getMonth`/`getDate`, never `toISOString()` · Why: the export already holds the phone's local wall-clock time; converting it shifts late-night messages into the next day, which is precisely what the "activity by hour" and streak cards read · Where: lib/parser.ts, lib/stats.ts · Learned: wall-clock times with no offset in the source are not instants — treat them as local and leave them alone

## Intl.Segmenter over full message text was the performance bottleneck

What: `collectEmojis` first tests the message for any emoji character, then matches runs of emoji-capable characters with a regex and segments only those runs — not the whole text · Why: segmenting every message end to end cost 233ms of a 535ms budget for 50k messages; run-scanning dropped it to 36ms, total 272ms · Where: lib/emoji.ts · Learned: keep the correct-but-slow primitive as the authority and narrow its input, rather than hand-rolling a faster replacement — the equivalence is then testable (see the corpus test in lib/__tests__/emoji.test.ts)

## Android exports without media can lose the attachment type

What: The legacy untyped marker `<Multimedia omitido>` is classified as `other`, because the file genuinely does not say whether it was a photo or an audio; current exports write typed markers ("imagen omitida", "audio omitido") and those classify correctly · Why: the with-media / without-media parity guarantee only holds for typed markers, so the fixture pair uses them · Where: lib/media.ts, lib/__fixtures__/media-with.txt · Learned: when a format erases information, say so in the data model instead of guessing a plausible value

## .webp counts as a sticker, not an image

What: The extension `.webp` maps to `sticker` in media classification · Why: WhatsApp only uses that container for stickers, so counting it as a photo would inflate the image count of anyone with a sticker habit · Where: lib/media.ts

## TextDecoder silently drops the BOM unless told not to

What: `decodeChatFile` decodes with `new TextDecoder('utf-8', { ignoreBOM: true })`, which (despite the name) keeps the leading U+FEFF · Why: the default decoder strips it, so a `.txt` read in the browser no longer equals the same file read with `readFileSync(…, 'utf8')` in tests, and the zip-vs-txt parity test fails on one invisible character; stripping the BOM is `normalizeExport`'s job, not the intake's · Where: lib/intake.ts · Learned: `ignoreBOM: true` means "don't treat the BOM specially", i.e. keep it — the option name reads backwards
