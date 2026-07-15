# AGENTS.md

Version: v1.0  
Status: Approved

## Mission

Build Fitness Tracker strictly according to the repository specifications.

The goal is not to generate code quickly. The goal is to implement a reliable, local-first strength-training product without changing approved product behavior.

## Required reading order

Before changing code, read:

1. `docs/02-Constitution/constitution.md`
2. `docs/03-PRD/PRD.md`
3. `docs/04-Architecture/architecture.md`
4. `docs/04-Architecture/domain-model.md`
5. The relevant file in `docs/05-Prototype/`
6. `docs/06-Database/`
7. `docs/07-Design-System/`
8. `docs/08-Development/`

Do not read every file for every task. Read all documents that govern the task.

## Stop rule

Stop before implementation when any of these are true:

- The requested behavior conflicts with the Constitution.
- The relevant Prototype is missing or ambiguous.
- A database change is required but database documents are not updated.
- The task expands beyond its stated scope.
- The acceptance criteria cannot be tested.
- An approved product decision would need to be changed.

Report the conflict instead of making a silent decision.

## Golden rules

- Specification before implementation.
- Keep a single source of truth.
- Do not create duplicate product documents.
- Do not modify historical workout data through template changes.
- `WorkoutSet` is the primary training fact.
- Recommendations never overwrite user data.
- Persist every completed set immediately.
- Keep the app usable without a network connection.
- Prefer simple, explicit code over clever abstractions.
- Do not introduce dependencies without a concrete need.

## Scope control

Unless the task explicitly requires it, do not:

- Add new screens or features.
- Change navigation behavior.
- Change database schema.
- Refactor unrelated modules.
- Introduce cloud services, authentication, analytics vendors, or subscriptions.
- Implement V2 features.
- Rename domain concepts.
- Add speculative shared packages.

## Documentation requirements

Update the governing document in the same change when:

- UI behavior changes: update Prototype.
- Domain behavior changes: update Domain Model.
- Database structure changes: update schema, dictionary, and migrations.
- Visual component behavior changes: update Design System.
- Development rules change: update `docs/08-Development/`.

## Implementation requirements

- Use TypeScript strict mode.
- Keep domain rules independent from screens.
- Access SQLite through repositories or data-access modules.
- Keep SQL out of React components.
- Keep navigation out of domain logic.
- Validate external and user-provided data.
- Handle loading, empty, success, and error states.
- Prevent duplicate writes from repeated taps.
- Make time-based behavior recoverable from persisted timestamps.
- Add or update tests for changed behavior.

## Validation before completion

Run the commands defined by the project for:

- Type checking
- Linting
- Unit tests
- Component/integration tests
- Database migration tests

If a command cannot run, state exactly why.

## Completion report

At the end of a task, report:

- What changed
- Files changed
- Tests run and results
- Documents updated
- Known limitations
- Any follow-up required
