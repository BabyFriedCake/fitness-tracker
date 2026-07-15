# S2-01 — Exercise Domain and Contracts

Execution Prompt: `tasks/prompts/implement-task.md`

## Goal

Implement the Exercise domain model and repository contracts required by the Exercise Library without adding database queries or UI.

## Read First

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `docs/08-Development/architecture-rules.md`
- `docs/08-Development/testing-strategy.md`

## Scope

Allowed:

- Exercise entity/value types
- Muscle group and equipment value definitions
- Repository interfaces
- Exercise query/filter types
- Domain validation
- Pure tests

Do not:

- Add SQL
- Import seed data
- Build UI
- Add navigation
- Implement repositories
- Change schema

## Requirements

Define stable concepts matching the approved domain language:

- `Exercise`
- `ExerciseId`
- `MuscleGroup`
- `Equipment`
- `ExerciseStatus`
- `ExerciseSearchQuery`
- `ExerciseFilters`
- `ExerciseRepository`

The domain layer must not import Expo, React Native, SQLite, or route code.

## Acceptance Criteria

- [ ] Exercise types match the Domain Model and Prototype terminology.
- [ ] Search/filter contracts support Chinese name, English name, muscle group, and equipment.
- [ ] Repository interface supports list, detail, search, filters, and selected-id lookup.
- [ ] Invalid imported/domain data can be rejected through explicit validation.
- [ ] Unit tests cover valid and invalid Exercise construction.
- [ ] No SQL or UI was added.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: define exercise domain contracts
```
