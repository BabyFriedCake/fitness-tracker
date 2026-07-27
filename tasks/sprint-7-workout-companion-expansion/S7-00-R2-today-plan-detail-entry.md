# S7-00-R2 Today Plan Detail Entry

Status: Completed

## Background

Figma requires tapping a Today Plan card body to open the selected plan for
today, while the start button begins the workout. The card body must not open
the source WorkoutTemplate edit flow.

## Scope

- Add a Today Plan detail route.
- Load TodayWorkoutPlan by id through Application / Repository boundaries.
- Display the selected plan snapshot and exercises.
- Provide a start action from the detail screen.
- Keep source WorkoutTemplate immutable from Today Plan detail.
- Keep WorkoutSet history immutable.

## Non-Goals

- Do not implement template editing.
- Do not implement full per-set draft editing UI.
- Do not modify Database Schema or Migration.
- Do not modify WorkoutSession Runtime or Snapshot Validation.
- Do not implement custom exercises.

## Acceptance Criteria

- Tapping the Today Plan card body opens `/today-plans/[id]`.
- The detail page shows the plan title, metrics and exercise list.
- The detail page has a start button that creates or reuses the linked session.
- The source WorkoutTemplate is not updated by opening or starting the plan.
- UI does not directly access SQLite.
