# Sprint Exit Report Template

---

# Sprint Information

**Sprint:**

**Status:** PASS / FAIL

**Date:**

**Reviewer:**

---

# Overall Result

Provide a concise summary of the Sprint.

State whether the Sprint objectives have been achieved.

---

# Sprint Summary

Completed tasks:

- [ ]
- [ ]
- [ ]

Not completed:

- [ ]

Repository status:

```bash
git status --short
```

Result:

```
Working tree clean
```

---

# Architecture

**Result:** PASS / FAIL

Review:

- Architecture matches architecture.md
- Domain boundaries respected
- Route layer only handles navigation
- No business logic inside UI
- SQL isolated inside database module
- Dependency direction is correct

Comments:

---

# Quality

**Result:** PASS / FAIL

Validation:

- format:check
- lint
- typecheck
- test

Test summary:

```
Suites:

Tests:

Result:
```

Comments:

---

# Metrics

| Metric                   | Result |
| ------------------------ | ------ |
| Sprint Tasks             |        |
| Format Check             |        |
| Lint                     |        |
| Typecheck                |        |
| Tests                    |        |
| GitHub Actions           |        |
| Architecture Violations  |        |
| Repository Hygiene       |        |
| Database Migrations      |        |
| Remaining Technical Debt |        |

---

# Repository Hygiene

**Result:** PASS / FAIL

Verify:

- Working tree clean
- Single AGENTS.md
- No .DS_Store
- No .idea
- No unexpected .vscode
- No .claude
- No .cursor
- No TODO/FIXME in production code
- No debugger statements
- No merge conflict markers
- No temporary files
- No secrets committed

Comments:

---

# Continuous Integration

**Result:** PASS / FAIL

Verify:

- GitHub Actions workflow
- pnpm/action-setup
- actions/setup-node
- Frozen lockfile
- Push trigger
- Pull Request trigger

Pipeline:

- format
- lint
- typecheck
- test

Comments:

---

# Database

**Result:** PASS / FAIL

Verify:

- Migration runner
- Fresh database initialization
- Idempotent migrations
- Rollback support
- Foreign key enforcement
- SQL isolation
- Error mapping

Comments:

---

# Documentation

**Result:** PASS / FAIL

Verify:

- Roadmap updated
- Architecture synchronized
- Database documentation synchronized
- Development Guide still valid

Comments:

---

# Remaining Technical Debt

List current known technical debt.

Example:

1.
2.
3.

---

# Lessons Learned

What worked well during this Sprint?

What should be improved?

Example:

- Prompt improvements
- Better task decomposition
- Architecture improvements
- CI improvements

---

# Suggestions

Recommendations before the next Sprint.

---

# Ready for Next Sprint

**Result:** YES / NO

Reason:

---

# Reviewer Conclusion

Final assessment of the Sprint.

State whether the project is ready to continue.
