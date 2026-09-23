# config

Setup and configuration — env vars, flags, how to run the project.

## The build script pins NODE_ENV=production

What: `"build": "NODE_ENV=production next build"` · Why: when the surrounding shell exports `NODE_ENV=development`, `next build` prerenders `/404` against the dev runtime and fails with "`<Html>` should not be imported outside of pages/_document" — an error that says nothing about the real cause · Where: package.json · Learned: an inherited NODE_ENV can break a Next.js build in a way whose message points somewhere else entirely

## Lint runs the ESLint CLI, not next lint

What: `"lint": "eslint ."` with a flat config built through `@eslint/eslintrc`'s `FlatCompat` over `next/core-web-vitals` and `next/typescript` · Why: `next lint` is deprecated and removed in Next.js 16 · Where: package.json, eslint.config.mjs
