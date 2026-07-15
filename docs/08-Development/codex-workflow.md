# Codex Workflow

Version: v1.0  
Status: Approved

## 1. Task format

Each Codex task should include:

- Goal
- Scope
- Relevant documents
- Files or modules allowed to change
- Acceptance criteria
- Commands to run
- Explicit non-goals

Example:

```text
Goal:
Implement creation of a draft WorkoutSession from a WorkoutTemplate.

Read:
- Constitution
- Domain Model
- P003
- Database schema

Allowed scope:
- workout application use case
- session repositories
- relevant tests

Do not:
- build the workout screen
- change schema
- implement recommendations

Acceptance:
- snapshot is created transactionally
- template changes do not affect the draft
- tests pass
```

## 2. Execution sequence

Codex must:

1. Read `AGENTS.md`.
2. Read task-specific specifications.
3. Inspect existing code and tests.
4. State a short implementation plan.
5. Make the smallest coherent change.
6. Add or update tests.
7. Run validation commands.
8. Review its own diff for scope creep.
9. Report results and limitations.

## 3. Task sizing

Prefer tasks that can be reviewed as one coherent change.

Good:

- Initialize Expo workspace
- Add initial SQLite migration
- Import and validate Exercise seed data
- Create draft Session use case
- Implement complete-set transaction
- Build P005 Rest Timer behavior

Too large:

- Implement the entire app
- Build all screens and database in one task
- Refactor all architecture while adding a feature

## 4. Database tasks

Any database change must update:

- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `docs/06-Database/migrations.md`
- Migration implementation
- Migration tests

No exception for “small” schema changes.

## 5. UI tasks

Any changed behavior must match its Prototype.

Codex must implement:

- Loading
- Empty
- Normal
- Error states
- Visibility rules
- Accessibility labels
- Repeat-tap protection where writes occur

Do not invent animations, text, or navigation.

## 6. Bug workflow

For a bug:

1. Reproduce or express it as a failing test.
2. Identify the violated specification.
3. Make the smallest fix.
4. Add regression coverage.
5. Avoid unrelated cleanup.
6. Update docs only if intended behavior changes.

## 7. Refactoring workflow

A refactor must:

- Preserve behavior
- Have a clear motivation
- Stay within named modules
- Keep tests green
- Avoid renaming approved domain terminology
- Be separated from feature work when practical

## 8. Completion response

Codex reports:

```text
Summary
Files changed
Tests run
Result
Documentation changed
Known limitations
```

Never claim a test passed unless it was actually run.
