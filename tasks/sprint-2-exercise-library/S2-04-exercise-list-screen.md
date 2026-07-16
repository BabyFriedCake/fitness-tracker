# S2-04 — Exercise Library List Screen

Execution Prompt

Before doing anything:

Read and follow:

tasks/prompts/implement-task.md

Implementation MUST stop if this prompt cannot be read.

## Goal

Replace the 动作库 placeholder with the first real Exercise Library browse screen.

## Read First

- `AGENTS.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/07-Design-System/design-system.md`
- `docs/07-Design-System/components.md`
- `docs/07-Design-System/content-style.md`
- S2-01 through S2-03 outputs

## Scope

Implement:

- Screen loading state
- Normal list state
- Empty state
- Persistence/error state
- Virtualized exercise list
- Exercise row
- Basic browse mode
- Application use case/hook connecting screen to repository

Do not:

- Implement search/filter behavior yet
- Implement detail screen
- Implement selection return behavior
- Add final imagery
- Add mock exercises

## Requirements

- Route file stays thin.
- UI reads through application/use-case boundary.
- No SQL in React components.
- Chinese placeholder and error copy follow Content Style.
- Exercise rows show approved minimal fields: name, muscle group, equipment.
- Use stable Exercise ID as list key.

## Acceptance Criteria

- [ ] 动作库 tab displays persisted seed exercises.
- [ ] Loading, empty, normal, and error states are test-covered.
- [ ] List remains usable with a large dataset.
- [ ] Route contains no repository or SQL logic.
- [ ] No fake data is used.
- [ ] Accessibility labels identify exercise name and attributes.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: build exercise library list
```
