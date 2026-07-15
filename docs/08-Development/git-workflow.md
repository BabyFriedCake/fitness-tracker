# Git Workflow

Version: v1.0  
Status: Approved

## Branching

Use short-lived branches:

```text
feat/<short-name>
fix/<short-name>
docs/<short-name>
refactor/<short-name>
```

Keep `main` releasable.

## Commits

Use clear, scoped commit messages:

```text
docs: add development workflow
chore: initialize Expo mobile app
db: add initial SQLite migration
feat: create workout template
feat: persist completed workout set
fix: recover expired rest timer
test: cover cancelled session statistics
```

Avoid:

```text
update
changes
fix stuff
```

## Commit discipline

- One commit should represent one understandable step.
- Do not mix formatting of unrelated files with a feature.
- Generated lockfile changes belong with the dependency change.
- Never commit secrets, local databases, build artifacts, or personal exports.

## Pull-request review checklist

- Scope matches the task.
- Product behavior matches Prototype.
- Domain terminology is unchanged.
- Schema changes include migrations and tests.
- Error states are handled.
- Tests were run.
- Documentation is synchronized.
- No speculative dependency or abstraction was added.

## Merge strategy

Use squash merge for focused task branches unless preserving multiple meaningful commits is useful.

The final commit message must describe the delivered behavior.
