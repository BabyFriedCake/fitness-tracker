# Testing Strategy

Version: v1.0  
Status: Approved

## 1. Testing goals

Protect the product rules most likely to cause data loss or misleading training results.

Priority order:

1. Completed-set persistence
2. Template/Session separation
3. Workout recovery
4. Rest-timer correctness
5. Statistics and recommendation calculations
6. Critical user flows
7. Presentation details

## 2. Test layers

### Static checks

- TypeScript type checking
- Linting
- Formatting verification

### Unit tests

Test pure domain rules:

- Volume
- Completion rate
- Personal records
- Progression recommendation
- Session status transitions
- Timer remaining-time calculation
- Weight and repetition validation

### Repository and migration tests

Use a temporary SQLite database to test:

- Initial schema
- Migrations in order
- Foreign keys
- Transactions
- Snapshot creation
- Duplicate-set prevention
- Cancelled-session exclusion
- Historical correction flags
- Querying the last valid performance

### Component tests

Use React Native Testing Library for:

- Loading, empty, normal, and error states
- Buttons and form validation
- Visibility rules
- Accessibility labels
- Repeated taps
- Large text where practical

### Feature integration tests

Test use cases across UI-facing orchestration and repositories:

- Create template
- Create draft Session
- Start Session
- Complete set and start timer
- Recover Session
- Complete workout
- View updated history

### End-to-end tests

Add after the core app is stable.

Minimum E2E flow:

```text
Onboarding
→ Create template
→ Start workout
→ Complete sets
→ Rest
→ Finish workout
→ Verify history
```

Choose the E2E framework during implementation based on current Expo compatibility; do not block early domain development on it.

## 3. Critical test matrix

### Template and history

- Editing a template does not change a completed Session.
- Archiving a template does not hide history.
- Session exercise snapshots remain readable after action-library updates.

### Workout sets

- One tap creates one Set.
- Repeated taps do not create duplicates.
- A successful Set remains after app restart.
- A failed write keeps user input available for retry.

### Cancellation

- Cancelled Session retains completed Sets.
- Cancelled data does not enter official volume, PR, or completion statistics.

### Historical correction

- Editing a historical Set marks it edited.
- PR and statistics recalculate.
- Soft-deleted Sets are excluded.

### Timer

- Timer remains correct after backgrounding.
- Pausing freezes the remaining duration.
- Extending changes the target end.
- Expired timers never show a negative number.
- Notification failure does not lose workout state.

## 4. Test data

Use builders/factories with readable defaults:

- `buildExercise`
- `buildTemplate`
- `buildSession`
- `buildSessionExercise`
- `buildWorkoutSet`

Tests must override only values relevant to the scenario.

## 5. Test naming

Use behavior-oriented names:

```text
it('keeps completed session data unchanged when its source template is edited')
```

Avoid vague names such as:

```text
it('works')
```

## 6. Mocking policy

- Prefer real domain functions.
- Prefer temporary SQLite over mocking repository internals.
- Mock platform boundaries: clock, notifications, file sharing, system permissions.
- Avoid mocking implementation details of React components.

## 7. Completion gate

A task cannot be marked complete when:

- A changed domain rule lacks unit tests.
- A schema change lacks migration tests.
- A critical screen lacks error-state coverage.
- Tests are skipped without a documented reason.
