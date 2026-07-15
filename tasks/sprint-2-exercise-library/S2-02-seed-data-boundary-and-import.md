# S2-02 — Exercise Seed Data Boundary and Import

Execution Prompt

Before doing anything:

Read and follow:

tasks/prompts/implement-task.md

Implementation MUST stop if this prompt cannot be read.

## Goal

Define and implement a repeatable, licensed, validated seed-data import process for standard exercises.

## Read First

- `AGENTS.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `docs/06-Database/migrations.md`
- `docs/08-Development/development-guide.md`
- `docs/08-Development/testing-strategy.md`
- S2-01 output

## Scope

Allowed:

- Seed file format
- Seed validation schemas
- Import service
- Database migration or bootstrap hook if approved schema already supports Exercise
- License/source metadata
- Tests

Do not:

- Scrape websites
- Download external datasets during app startup
- Add unverified images
- Build list UI
- Implement search UI
- Invent exercise data with uncertain licensing

## Requirements

Seed import must:

- Be deterministic
- Use stable Exercise IDs
- Be idempotent
- Validate every row before persistence
- Preserve source/license attribution
- Avoid replacing user/history references
- Support future seed version upgrades
- Run offline after installation

Use a small approved starter dataset if a full licensed dataset is not yet available. Mark the starter dataset clearly.

## Acceptance Criteria

- [ ] Seed format is documented in code or adjacent README.
- [ ] Invalid rows fail with actionable validation errors.
- [ ] Importing twice does not duplicate exercises.
- [ ] Stable IDs remain unchanged across imports.
- [ ] Source/license fields are persisted or otherwise traceable.
- [ ] Tests cover fresh import, repeated import, invalid data, and update behavior.
- [ ] No runtime network dependency exists.
- [ ] Database docs are updated only if schema behavior changes.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: add validated exercise seed import
```
