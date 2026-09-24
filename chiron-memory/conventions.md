# convention

A rule the codebase follows — naming, patterns, and where things live.

## Tests live in lib/__tests__ (and app/**/__tests__) and read fixtures through lib/__fixtures__

What: Vitest specs are `lib/**/*.test.ts` and `app/**/*.test.ts` (configured in `vitest.config.ts`, which also maps the `@/` alias); hand-built `WrappedStats` profiles come from `makeStats(overrides)` in `lib/__fixtures__/sample-stats.ts`; export fixtures are real anonymised `.txt` files under `lib/__fixtures__/`, reached only through the typed `loadFixture` helper · Why: the fixture names are a closed union, so a typo in a spec is a compile error rather than a runtime `ENOENT` · Where: lib/__fixtures__/load.ts, vitest.config.ts

## npm test typechecks before running the suite

What: `"test": "tsc --noEmit && vitest run"` · Why: the `WrappedStats` contract is guarded by compile-time assertions (`Equals`/`Expect` in lib/__tests__/wrapped-stats.test.ts) that pin the type's key set — those only bite if `tsc` actually runs in the test gate · Where: package.json

## Underscore-prefixed bindings are exempt from no-unused-vars

What: ESLint's `@typescript-eslint/no-unused-vars` is configured with `varsIgnorePattern: '^_'` · Why: type-level assertions are declared and deliberately never referenced, and they are the mechanism the WrappedStats contract test relies on · Where: eslint.config.mjs

## UI copy is English and owned by the UI; lib/ copy is ignored and codes are switched on

What: `app/_components/copy.ts` maps every `ParseErrorCode`, `IntakeErrorCode` and `WarningCode` to English copy (emoji, title, message, whether to open export help); the Spanish `title`/`message` that `lib/` returns are not rendered. The deliberate Spanish lines are the "¿Quién sos vos?" heading, the per-card disclaimer "Solo entretenimiento. No es un análisis psicológico." and the "IA muy artificial" wink. The English jokes in `lib/humor/` are the one exception to "lib copy is ignored": they are the narrative the V2 LLM will replace, so they live with the narrator, not the UI · Why: the product's specified strings ("Analyze my chat", the loading lines) are English, while `lib/` was written with Spanish copy; switching on codes keeps the engine untouched and the UI consistent · Where: app/_components/copy.ts

## Share card assets are self-hosted under public/fonts and fetched whole

What: fonts and the emoji index live in `public/fonts/` and are loaded through the FontFace API by `loadCardFonts`, which the loading screen warms early; nothing is requested per emoji or with Wrapped data in the URL · Why: a per-emoji image URL would tell the server which emoji the chat's top one is, and a CDN font could arrive late and leave the card in a fallback font · Where: app/_components/share/card-fonts.ts, public/fonts/README.md
