# S7-00-R1 Today Plan UI Binding

Status: Completed

## Background

S7-00 Figma Product Alignment requires the Today page to show today's selected
training templates as a Today Plan, instead of treating every active template as
today's plan.

S7-00-R0 already introduced the TodayWorkoutPlan domain, schema, migration and
repository. This task binds that foundation into the Today Dashboard UI.

## Scope

- Load TodayWorkoutPlan records for the current local date.
- Show Today Plan cards from today's selected templates.
- Add an “添加计划” action on the Today Plan module.
- Select an active WorkoutTemplate from a modal and add it to today's plan.
- Prevent duplicate template entries through the TodayWorkoutPlan repository.
- Start a Today Plan from the card action.
- Disable completed Today Plan start actions.
- Keep direct SQLite access out of UI.
- Preserve WorkoutSet facts and WorkoutSession runtime behavior.

## Non-Goals

- Do not implement custom exercise creation.
- Do not redesign Exercise Library.
- Do not redesign Workout History calendar.
- Do not redesign Workout Session running / paused / rest screens.
- Do not modify Database Schema or Migration.
- Do not change Snapshot Validation contract.
- Do not implement Camera / Pose Detection / AI.

## Acceptance Criteria

- Today Dashboard uses `todayPlans` for the “训练计划” list.
- “添加计划” opens a modal backed by active WorkoutTemplate records.
- Adding the same template twice for the same local date is blocked by the
  repository and surfaced as a stable user message.
- The card start action creates or reuses a linked WorkoutSession and navigates
  to the workout session screen.
- Completed plan cards show “已完成” and cannot be started again.
- Unit tests cover loading, adding and starting Today Plan entries.

## Validation

- `pnpm test -- today-dashboard`
- `pnpm typecheck`
- `pnpm lint`
