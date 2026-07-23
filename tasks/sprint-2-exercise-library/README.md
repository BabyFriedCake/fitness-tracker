# Sprint 2 — Exercise Library

Version: v1.0  
Status: Completed

## Sprint Goal

Deliver the first complete user-facing feature: a local-first Exercise Library that can import approved seed data, persist it in SQLite, expose it through repositories and use cases, and support browse, search, filters, detail, and selection modes.

## Sprint Deliverable

At the end of Sprint 2, users can:

- Open the 动作库 tab
- Browse standard exercises
- Search by Chinese or English name
- Filter by muscle group and equipment
- Open exercise details
- Select an exercise from Template or Session contexts
- Use the feature entirely offline

## Task Order

1. `S2-01-exercise-domain-and-contracts.md`
2. `S2-02-seed-data-boundary-and-import.md`
3. `S2-03-exercise-repository.md`
4. `S2-04-exercise-list-screen.md`
5. `S2-05-search-and-filters.md`
6. `S2-06-exercise-detail.md`
7. `S2-07-exercise-selection-flow.md`
8. `S2-08-sprint-exit-review.md`

Execute tasks one at a time.

## Non-goals

- User-created exercises
- Video or animation tutorials
- Camera recognition
- Cloud sync
- Template editing beyond selecting exercises
- Workout execution
- AI exercise recommendation

## Branch

Recommended branch:

```bash
git checkout main
git pull origin main
git checkout -b feat/s2-exercise-library
git push -u origin feat/s2-exercise-library
```
