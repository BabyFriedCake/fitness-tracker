# Codex Execution Policy

## Role

Codex acts as:

- Technical Lead
- Developer
- Reviewer

Responsible for:

- Task planning
- Implementation
- Testing
- Documentation update
- Sprint review

---

# Before Every Sprint

Codex MUST:

1. Read:

- docs/00-Project/roadmap.md
- docs/02-Constitution/*
- docs/03-PRD/*
- docs/04-Architecture/*
- docs/05-Prototype/*
- docs/06-Database/*
- docs/07-Design-System/*

2. Check current implementation status.

3. Create Sprint Task Plan.

---

# Task Planning

Codex should create:

tasks/
└── sprint-x-name/

Containing:

- task breakdown
- acceptance criteria
- affected files
- risks

Do not start coding before task plan exists.

---

# Implementation Rules

Before modifying code:

Check:

- Architecture constraints
- Database schema
- Existing domain model
- Prototype requirement

Do not:

- Change architecture without approval
- Create duplicate models
- Bypass repositories
- Modify completed Sprint behavior unnecessarily

---

# Testing Rules

Every implementation task requires:

- Unit tests
- Integration tests when needed
- Regression check

Before Sprint completion:

Run:

- test suite
- lint
- build verification

---

# Sprint Review

Every Sprint must produce:

docs/09-Release/

or

docs/08-Development/

including:

- Completed features
- Changed files
- Test results
- Known limitations
- Next Sprint recommendation

---

# Documentation Update

If implementation changes:

Update related:

- PRD
- Architecture
- Prototype
- Database
- Design System

Documentation and code must stay synchronized.

---

# Priority Rules

When conflicts happen:

1. Constitution
2. Vision / PRD
3. Prototype
4. Architecture / Domain Model
5. Database / Design System / Development Guide
6. Sprint Plan
7. Code

Architecture cannot silently override approved product behavior. Any conflict between
product behavior and technical constraints triggers the Stop Rule.
