# S2-07 — Exercise Selection Flow

Execution Prompt: `tasks/prompts/implement-task.md`

## Goal

Support selecting an Exercise from Template and Session contexts while preserving browse mode.

## Read First

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/05-Prototype/P003-Start-Workout.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/08-Development/architecture-rules.md`
- Sprint 2 existing outputs

## Scope

Implement:

- Explicit browse vs selection context
- Selection result contract
- Already-selected ID handling
- Add/select action
- Cancel action
- Navigation tests
- Minimal integration placeholders for future Template/Session callers

Do not:

- Build template editor
- Build workout session editor
- Persist TemplateExercise or SessionExercise
- Implement duplicate-resolution business rules beyond the approved “already selected” state

## Requirements

- Browse mode does not accidentally mutate callers.
- Selection mode shows an explicit action.
- Already-selected exercises cannot be selected again.
- Selection result uses stable Exercise ID.
- Invalid or missing selection context fails safely.
- Route/navigation state is validated.

## Acceptance Criteria

- [ ] Browse mode remains unchanged.
- [ ] Selection mode returns a stable Exercise ID.
- [ ] Already-selected exercises are visibly disabled.
- [ ] Cancel returns without a selection.
- [ ] No TemplateExercise or SessionExercise persistence is introduced.
- [ ] Navigation/context tests cover browse, template, and session modes.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: add exercise selection flow
```
