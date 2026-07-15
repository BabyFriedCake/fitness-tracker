# Coding Style

Version: v1.0  
Status: Approved

## TypeScript

- Enable strict mode.
- Avoid `any`; use `unknown` and validate.
- Export explicit public types.
- Prefer discriminated unions for state machines.
- Use exhaustive checks for domain statuses.
- Use `readonly` where mutation is not intended.
- Do not use non-null assertions to hide unclear state.

## Naming

- React components: `PascalCase`
- Hooks: `useSomething`
- Functions and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` only for true constants
- Files: `kebab-case.ts` or `PascalCase.tsx` consistently by category
- Domain entities use approved names:
  `Exercise`, `WorkoutTemplate`, `WorkoutSession`, `SessionExercise`, `WorkoutSet`, `RestTimer`

Do not invent synonyms such as `TrainingRun`, `WorkoutLogEntry`, or `RoutineSession`.

## Functions

- Keep functions focused on one responsibility.
- Prefer pure domain functions.
- Avoid boolean parameter lists; use option objects or explicit functions.
- Return typed results for expected failures.
- Throw only for truly exceptional states or at clear boundaries.

## React

- Components render UI; they do not contain SQL or core calculations.
- Keep route components thin.
- Derive view data with selectors or presentation mappers.
- Avoid unnecessary effects.
- Do not copy durable SQLite data into a global store without a clear reason.
- Memoize only after measuring a render problem.

## Components

- Shared components must have a proven reuse case.
- Feature components remain inside their feature.
- Avoid files that combine screen, database, and domain logic.
- A file approaching 300 lines should be reviewed for separation; this is a review signal, not an automatic split rule.

## Domain logic

Domain functions must be deterministic where practical.

Examples:

- Completion-rate calculation
- Volume calculation
- Progression recommendation
- Session status transitions
- Rest-timer remaining-time calculation

These functions must be unit tested without React Native.

## Validation

Validate at boundaries:

- Form submission
- Database row mapping
- Imported exercise data
- Data export/import
- Navigation parameters

Use Zod schemas where runtime input can be malformed.

## Comments

Write comments for:

- Business reasons
- Non-obvious constraints
- Workarounds with references

Do not write comments that merely restate the code.

## Imports

- Use configured path aliases for application modules.
- Do not deep-import private React Native internals.
- Avoid circular feature dependencies.
- Keep import ordering consistent through lint tooling.

## Formatting and linting

Formatting and linting are automated.

Do not debate formatting in reviews. Change the configuration through an explicit task if necessary.
