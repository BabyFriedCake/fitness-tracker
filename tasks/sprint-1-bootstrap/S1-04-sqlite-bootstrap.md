# S1-04 — Bootstrap SQLite and Migration Runner

## Goal

Install Expo SQLite and implement a tested database-opening and migration foundation.

## Read first

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/database-design.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/migrations.md`
- `docs/08-Development/architecture-rules.md`
- `docs/08-Development/testing-strategy.md`

## Scope

Implement:

- Database constants
- Opening the application database
- Foreign-key enforcement
- Migration table and ordered migration runner
- Initial migration based on the approved schema
- Temporary-database migration tests
- A minimal application bootstrap provider or service

Do not:

- Build repositories for every feature yet
- Import the full exercise dataset yet
- Add screen queries
- Change approved schema without updating docs

## Requirements

- Migrations run in order.
- Each migration records its version only after success.
- Migration failure rolls back.
- Startup can distinguish migration failure from normal loading.
- SQL stays under `src/database/`.
- Foreign keys are enabled for each opened connection.
- Initial migration matches `docs/06-Database/schema.md`.

## Acceptance criteria

- [ ] A fresh database reaches the latest schema.
- [ ] Running migrations again is safe.
- [ ] A simulated failed migration does not record success.
- [ ] Required tables and indexes exist.
- [ ] Typecheck, lint, and tests pass.
- [ ] No React component contains SQL.
- [ ] Database errors are mapped to an application-safe error type.

## Suggested commit

```text
db: add SQLite bootstrap and initial migration
```
