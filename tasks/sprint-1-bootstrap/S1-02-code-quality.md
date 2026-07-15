# S1-02 — Configure Code Quality and Project Structure

## Goal

Add strict TypeScript, linting, formatting, path aliases, test bootstrap, and the approved `src/` directory structure.

## Read first

- `AGENTS.md`
- `docs/08-Development/development-guide.md`
- `docs/08-Development/coding-style.md`
- `docs/08-Development/testing-strategy.md`

## Scope

Allowed:

- TypeScript configuration
- ESLint and formatter configuration
- Test configuration
- Empty source directories with README or minimal index files when Git requires them
- Root/mobile package scripts

Do not:

- Implement domain entities
- Add production screens
- Add database schema

## Required structure

```text
apps/mobile/
├── app/
└── src/
    ├── components/
    ├── features/
    ├── domain/
    ├── database/
    ├── services/
    ├── state/
    ├── hooks/
    ├── validation/
    ├── constants/
    ├── utils/
    └── test/
```

Configure an alias such as:

```text
@/ → apps/mobile/src/
```

Required scripts:

```text
lint
typecheck
test
format
format:check
```

Use strict TypeScript.

## Acceptance criteria

- [ ] `pnpm --filter mobile typecheck` passes.
- [ ] `pnpm --filter mobile lint` passes.
- [ ] `pnpm --filter mobile test` passes with at least one bootstrap test.
- [ ] `pnpm --filter mobile format:check` passes.
- [ ] Alias imports resolve in TypeScript and test tooling.
- [ ] Route files remain thin.
- [ ] No `any` was introduced to bypass configuration.

## Suggested commit

```text
chore: configure mobile code quality
```
