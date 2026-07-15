# S2-05 — Exercise Search and Filters

Execution Prompt

Before doing anything:

Read and follow:

tasks/prompts/implement-task.md

Implementation MUST stop if this prompt cannot be read.

## Goal

Add Chinese/English search and combinable muscle-group/equipment filters to the Exercise Library.

## Read First

- `AGENTS.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/07-Design-System/components.md`
- `docs/07-Design-System/accessibility.md`
- S2-03 and S2-04 outputs

## Scope

Implement:

- Search input
- Debounced or appropriately controlled local query
- Muscle-group filter chips
- Equipment filter chips
- Combined search/filter behavior
- Clear-filters action
- No-results state
- Tests

Do not:

- Add remote search
- Upload search terms to analytics
- Add a third-party search engine without necessity
- Implement detail or selection flow

## Requirements

- Query state may be transient UI state.
- Results come from the repository/use-case path.
- Empty search shows the filtered browse list.
- Clearing filters restores the full active list.
- Multiple filter dimensions combine predictably.
- Keyboard and large-text behavior remain usable.

## Acceptance Criteria

- [ ] Chinese name search works.
- [ ] English search is case-insensitive.
- [ ] Leading/trailing whitespace is ignored.
- [ ] Muscle group and equipment filters combine correctly.
- [ ] No-results copy is clear and actionable.
- [ ] Clear action resets query and filters.
- [ ] Search/filter behavior has component and repository coverage.
- [ ] lint, typecheck, tests, and format check pass.

## Suggested Commit

```text
feat: add exercise search and filters
```
