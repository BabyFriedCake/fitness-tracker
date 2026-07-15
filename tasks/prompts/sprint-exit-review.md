# Sprint Exit Review

## Goal

Review the entire Sprint instead of a single task.

Do NOT implement new features.

Do NOT modify any source code.

Only inspect, validate, and report.

---

# Read

1. AGENTS.md
2. docs/00-Project/roadmap.md
3. docs/04-Architecture/architecture.md
4. docs/06-Database/database-design.md
5. docs/08-Development/development-guide.md

---

# Sprint Review

Review every completed task in this Sprint.

Confirm that all completed tasks satisfy their original Acceptance Criteria.

Report any missing implementation or unexpected changes.

---

# Architecture Review

Check:

- Architecture follows architecture.md
- Domain boundaries are respected
- Route layer only handles navigation
- UI contains no business logic
- SQL exists only inside database module
- Repository layer boundaries are respected
- No dependency direction violations

---

# Code Quality

Run and verify:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

All commands must pass.

---

# Repository Hygiene

Run:

```bash
git status --short
git diff --check
git diff --stat
git clean -nd
```

Check:

- no .DS_Store
- no .idea
- no unexpected .vscode
- no .claude
- no .cursor
- only one AGENTS.md in repository root
- no TODO
- no FIXME
- no debugger
- no merge conflict markers
- no temporary files
- no secrets
- no generated cache
- no demo code

---

# CI Review

Verify:

- GitHub Actions workflow exists
- uses pnpm/action-setup
- uses actions/setup-node
- uses frozen lockfile
- push to main
- pull_request trigger

---

# Database Review

Verify:

- latest migration succeeds
- migrations are idempotent
- fresh database initializes correctly
- SQL stays inside database module
- migration runner is tested
- database errors are mapped

---

# Roadmap Review

Confirm:

roadmap.md matches the current project progress.

---

# Deliverables

Produce a report.

# Sprint Exit Report

## Overall Result

PASS / FAIL

---

## Sprint Summary

Summarize what has been completed.

---

## Architecture

PASS / FAIL

Comments.

---

## Quality

PASS / FAIL

Comments.

---

## Repository Hygiene

PASS / FAIL

Comments.

---

## CI

PASS / FAIL

Comments.

---

## Database

PASS / FAIL

Comments.

---

## Remaining Technical Debt

List remaining issues.

---

## Suggestions

List improvements before the next Sprint.

---

## Ready for Next Sprint

YES / NO

Explain why.
