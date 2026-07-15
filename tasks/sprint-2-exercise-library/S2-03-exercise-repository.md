# S2-03 — Exercise SQLite Repository

Execution Prompt: `tasks/prompts/implement-task.md`

## Goal

Implement the SQLite-backed ExerciseRepository with typed row mapping and tested queries.

## Read First

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/06-Database/`
- `docs/08-Development/architecture-rules.md`
- S2-01 and S2-02 outputs

## Scope

Implement:

- SQLite Exercise repository
- Database row mapper
- List query
- Detail query by ID
- Search query
- Muscle-group filter
- Equipment filter
- Combined filters
- Selected-ID lookup
- Repository tests with temporary SQLite

Do not:

- Build UI
- Put SQL outside `src/database/`
- Add global state
- Add fuzzy-search dependencies without approval
- Change domain terminology

## Search Rules

V1 search should support:

- Chinese name substring
- English name substring
- Case-insensitive English matching
- Trimmed input
- Empty input returns the normal filtered list

Define deterministic ordering.

## Acceptance Criteria

- [ ] Repository implements the S2-01 contract.
- [ ] SQL exists only under the database module.
- [ ] Row mapping validates malformed database rows.
- [ ] Search works for Chinese and English names.
- [ ] Muscle group and equipment filters can be combined.
- [ ] Inactive exercises are excluded from normal selection by default.
- [ ] Detail lookup can still return an inactive exercise when explicitly requested for historical compatibility.
- [ ] Temporary SQLite tests cover all queries.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: implement exercise repository
```
