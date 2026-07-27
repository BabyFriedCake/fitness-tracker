# S7-00-R5 History Calendar Figma Alignment

Status: Completed

## Background

Figma requires the History page to behave like a calendar-first training log:

- users can switch months
- dates are clickable
- completed training days show muscle labels
- the list below shows completed workouts for the selected date

## Scope

- Update History UI interaction and layout.
- Derive calendar data from existing completed WorkoutSession facts.
- Show selected date completed workouts below the calendar.
- Add previous / next month controls.
- Keep summary opening behavior for completed sessions.

## Non-Goals

- Do not modify Database Schema or Migration.
- Do not change WorkoutSession facts.
- Do not add analytics tables.
- Do not add custom muscle classification data.

## Acceptance Criteria

- Month calendar has previous and next controls.
- Calendar days are accessible buttons.
- Clicking a date filters the list below to that date.
- Completed dates show muscle labels.
- Cancelled sessions are not included in date completion markers.
