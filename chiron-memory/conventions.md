# convention

A rule the codebase follows — naming, patterns, and where things live.

## Tests live in lib/__tests__ and read fixtures through lib/__fixtures__/load.ts

What: Vitest specs are `lib/**/*.test.ts` (configured in `vitest.config.ts`); export fixtures are real anonymised `.txt` files under `lib/__fixtures__/`, reached only through the typed `loadFixture` helper · Why: the fixture names are a closed union, so a typo in a spec is a compile error rather than a runtime `ENOENT` · Where: lib/__fixtures__/load.ts, vitest.config.ts

## npm test typechecks before running the suite

What: `"test": "tsc --noEmit && vitest run"` · Why: the `WrappedStats` contract is guarded by compile-time assertions (`Equals`/`Expect` in lib/__tests__/wrapped-stats.test.ts) that pin the type's key set — those only bite if `tsc` actually runs in the test gate · Where: package.json

## Underscore-prefixed bindings are exempt from no-unused-vars

What: ESLint's `@typescript-eslint/no-unused-vars` is configured with `varsIgnorePattern: '^_'` · Why: type-level assertions are declared and deliberately never referenced, and they are the mechanism the WrappedStats contract test relies on · Where: eslint.config.mjs
