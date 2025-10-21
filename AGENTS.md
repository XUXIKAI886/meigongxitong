# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` holds Next.js routes (logo-studio, brand-studio, etc.); keep feature state isolated per folder.
- Shared UI primitives live in `src/components/ui/` and are re-exported via `index.ts` for predictable imports.
- Domain helpers and API clients sit in `src/lib/` with shared contracts in `src/types/index.ts`.
- Static assets belong in `public/`; local uploads are ignored in `.uploads/`, and automation scripts stay under `scripts/`.

## Build, Test, and Development Commands
- `npm install` — sync dependencies after pulling template or schema updates.
- `npm run dev` — start the Turbopack dev server on port 3000 for day-to-day work.
- `npm run build` → `npm run start` — production build followed by a local smoke test.
- `npm run lint` — Next.js + TypeScript ESLint rules; resolve warnings before pushing.

## Coding Style & Naming Conventions
- Write TypeScript function components; add `'use client'` whenever hooks or browser APIs are used.
- Two-space indentation, `PascalCase` component exports, and `kebab-case` file or folder names.
- Compose classes with Tailwind utilities plus `clsx`/`tailwind-merge`; extend helpers in `src/lib/` instead of duplicating fetch logic.

## Testing Guidelines
- No automated runner yet; manually verify each affected generator flow via `npm run dev`.
- When adding critical logic, stub future tests as `*.spec.ts` next to the module and document manual coverage in the PR.
- Run `npm run lint` and spot-check network calls with the fixtures in `src/lib/api-client.ts` before requesting review.

## Commit & Pull Request Guidelines
- Follow the existing `type: summary` style (`feat:`, `fix:`, `update:`, `docs:`); summaries ≤72 characters and bilingual notes only when clarifying.
- PRs should list manual checks (e.g., “Logo Studio template 3 download”) plus any `.env.local` or asset updates; include before/after screenshots for visual work.
- Link tickets or docs, note follow-up tasks, and flag shared UI changes for design validation.

## Environment & Deployment Notes
- Keep secrets in `.env.local`; document new keys in PRs and mirror them in `src/lib/config.ts`.
- Run `node scripts/add-runtime-config.js` after touching environment variables and `node migrate-storage.js` before deploying to sync storage metadata.
