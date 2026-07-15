# S2-06 — Exercise Detail

Execution Prompt

Before doing anything:

Read and follow:

tasks/prompts/implement-task.md

Implementation MUST stop if this prompt cannot be read.

## Goal

Implement Exercise Detail for browsing standard exercise information and source attribution.

## Read First

- `AGENTS.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/07-Design-System/`
- S2-03 through S2-05 outputs

## Scope

Implement:

- Detail route
- Detail loading/error/not-found states
- Name, muscle group, equipment, description
- Optional image placeholder
- Source/license attribution
- Navigation from list
- Tests

Do not:

- Add videos
- Add user editing
- Add camera analysis
- Add workout-history charts
- Add network image fetching unless already approved and licensed

## Acceptance Criteria

- [ ] Tapping an exercise opens the correct detail.
- [ ] Missing optional fields do not break layout.
- [ ] Not-found and persistence errors are distinct.
- [ ] Inactive historical exercises can still be displayed when explicitly opened.
- [ ] Source/license information is visible or reachable.
- [ ] Route remains thin.
- [ ] Accessibility and large-text behavior are covered.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: add exercise detail
```
