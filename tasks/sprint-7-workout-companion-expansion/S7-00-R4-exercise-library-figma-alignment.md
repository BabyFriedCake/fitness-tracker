# S7-00-R4 Exercise Library Figma Alignment

Status: Completed

## Background

The current Exercise Library still uses a generic filter form and list rows.
Figma requires a layout closer to XunJi:

- left muscle group rail
- top search bar with add button
- equipment chips above results
- image-based exercise card grid

## Scope

- Update Exercise Library UI layout only.
- Keep existing Exercise domain, repository and filters.
- Preserve selection mode behavior for template/session flows.
- Show exercise image when available, with a stable placeholder fallback.
- Add “+” action affordance for custom exercise, but do not implement custom
  exercise creation in V1.

## Non-Goals

- Do not add custom Exercise domain/schema/repository.
- Do not modify Database Schema or Migration.
- Do not change exercise import pipeline.
- Do not change WorkoutTemplate or TodayPlan flows.

## Acceptance Criteria

- Left rail renders muscle group categories.
- Equipment chips render above the exercise grid.
- Search remains accessible as “搜索动作”.
- Exercise results render as two-column image cards.
- Custom exercise plus action shows stable unsupported copy.
- Selecting exercises from template/session flows still works.
