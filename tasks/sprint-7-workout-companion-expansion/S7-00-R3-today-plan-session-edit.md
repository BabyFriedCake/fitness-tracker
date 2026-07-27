# S7-00-R3 Today Plan Session Edit

Status: Completed

## Background

S7-00-R2 added a Today Plan detail page, but the Human Review warning remains:
“编辑此次训练” must edit this occurrence of training, not the source
WorkoutTemplate.

## Product Decision

Opening `/today-plans/[id]` is read-only and must not create a draft session.

When the user taps “编辑此次训练”:

- If the Today Plan has no linked session, create a draft WorkoutSession from
  the source WorkoutTemplate and attach it to the Today Plan.
- If the linked session is draft, enter edit mode.
- If the linked session is in_progress / completed / cancelled, do not allow
  plan configuration edits.

## Scope

- Edit the linked draft WorkoutSession only.
- Support per exercise edits for:
  - target sets
  - target reps min/max
  - rest seconds
- Persist edits through WorkoutSessionRepository.update.
- Keep source WorkoutTemplate unchanged.
- Keep existing WorkoutSet facts unchanged.

## Non-Goals

- Do not modify Database Schema or Migration.
- Do not update WorkoutTemplate.
- Do not implement drag sorting.
- Do not implement exercise add/remove.
- Do not modify Runtime, Snapshot Validation, AI or Voice Coach.

## Acceptance Criteria

- Opening a Today Plan detail page does not create a session.
- “编辑此次训练” creates or reuses a draft session.
- Draft SessionExercise config can be updated.
- WorkoutTemplateRepository.update is not called.
- Non-draft sessions cannot be edited.
- UI does not directly access SQLite.
