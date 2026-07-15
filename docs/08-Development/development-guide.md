# Fitness Tracker Development Guide

Version: v1.0  
Status: Approved  
Owner: Tech Lead

## 1. Goal

Define the implementation baseline for the Fitness Tracker mobile app.

The application is local-first, iPhone-first, and designed for reliable strength-training data entry.

## 2. Approved stack

- React Native with Expo
- TypeScript
- Expo Router
- `expo-sqlite`
- Zustand for short-lived application and workflow state
- React Hook Form for forms
- Zod for runtime validation
- React Native Testing Library and Jest-compatible test tooling
- Expo local notifications for rest reminders

Use the latest stable versions that are mutually compatible at project initialization. Do not use prerelease packages without an approved reason.

## 3. Package manager

Use `pnpm`.

The repository must contain one lockfile:

```text
pnpm-lock.yaml
```

Do not mix npm, Yarn, Bun, and pnpm lockfiles.

## 4. Initial repository layout

```text
fitness-tracker/
├── apps/
│   └── mobile/
├── docs/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

Do not create reusable packages until genuine cross-application reuse exists.

## 5. Mobile application layout

```text
apps/mobile/
├── app/                    # Expo Router routes only
├── src/
│   ├── components/         # Shared presentation components
│   ├── features/           # Feature modules
│   ├── domain/             # Entities, value objects, rules
│   ├── database/           # SQLite setup, migrations, repositories
│   ├── services/           # Notifications, clock, export
│   ├── state/              # Zustand stores for transient workflow state
│   ├── hooks/
│   ├── validation/
│   ├── constants/
│   ├── utils/
│   └── test/
├── assets/
├── app.json
├── package.json
└── tsconfig.json
```

`app/` must remain thin. Route files assemble feature screens and navigation; they do not contain domain rules or SQL.

## 6. Feature layout

Example:

```text
src/features/workout/
├── screens/
├── components/
├── hooks/
├── application/
├── types/
└── __tests__/
```

Responsibilities:

- `screens`: screen composition
- `components`: feature-specific presentation
- `application`: use cases and orchestration
- `hooks`: UI-facing hooks
- `types`: feature-only view models
- `__tests__`: feature tests

## 7. Architecture boundaries

```text
UI / Routes
    ↓
Application Use Cases
    ↓
Domain Rules
    ↓
Repository Interfaces
    ↓
SQLite Implementations
```

Rules:

- UI may call application use cases.
- Application may use domain rules and repository interfaces.
- Domain code must not import Expo, React Native, SQLite, or navigation.
- Database implementations may depend on SQLite.
- Database code must not decide product behavior.
- Cross-layer shortcuts are prohibited.

## 8. State ownership

### SQLite

Use for durable facts and recoverable workflow state:

- Templates
- Sessions
- Session exercises
- Completed sets
- Rest timer timestamps
- Daily status
- User settings

### Zustand

Use for short-lived UI state:

- Current unsaved input
- Sheet/modal state
- Temporary screen selection
- Optimistic progress during a single interaction

Do not make Zustand the authoritative store for workout history.

### Component state

Use for isolated presentation state that does not need cross-screen access.

## 9. Time handling

- Persist timestamps in UTC ISO 8601 format.
- Display using the device locale and timezone.
- Rest timers use a target end timestamp.
- Do not persist a timer by decrementing and saving every second.
- Inject a clock abstraction into timer rules for testing.
- Handle clock changes and expired timers without negative values.

## 10. Database access

- All schema changes require a numbered migration.
- Enable foreign-key enforcement.
- Use transactions for Session creation, set completion, and workout completion.
- Use parameterized queries.
- Never build SQL with interpolated user values.
- Keep repository return types mapped to domain/application types.
- Completed set insertion must be idempotent or guarded against duplicate taps.

## 11. Error handling

Classify errors:

- Validation error
- Persistence error
- Recovery error
- Permission error
- Unexpected error

User messages explain:

1. What failed
2. Whether data is safe
3. What the user can do

Never display raw SQL, stack traces, or opaque “unknown error” messages to users.

## 12. Offline behavior

All V1 core workflows must function offline:

- Browse exercises
- Manage templates
- Start and complete workouts
- Run and recover rest timers
- View history and statistics
- Change settings

No V1 screen may require an API response to become usable.

## 13. Accessibility

- Minimum interactive target: 44×44 pt
- Primary workout buttons: at least 52 pt high
- Support Dynamic Type
- Provide meaningful accessibility labels
- Do not communicate status by color alone
- Respect reduced-motion settings
- Ensure the keyboard does not obscure workout actions

## 14. Performance targets

Targets are development goals, not guarantees:

- Local-first screens should become interactive quickly.
- Workout set completion should feel immediate.
- Long history lists must use virtualized lists.
- Avoid recalculating all historical statistics on every render.
- Measure before introducing caches.

## 15. Dependency policy

A new dependency must:

- Solve a current approved requirement
- Be actively maintained
- Support the chosen Expo/React Native version
- Have an acceptable license
- Not duplicate an existing capability
- Be documented in the pull request or task report

## 16. Security and privacy

- Store training data locally by default.
- Do not add telemetry vendors in V1 without explicit approval.
- Do not send exercise search terms or workout details remotely.
- Never commit secrets.
- Use platform-secure storage only if future secrets are introduced.
- Data export must be user initiated.

## 17. Definition of ready

A coding task is ready when:

- Relevant Prototype exists and is Review/Approved
- Domain behavior is defined
- Database impact is understood
- Acceptance criteria are testable
- Scope is bounded

## 18. Definition of done

A task is done when:

- Behavior matches the specification
- Type checking and linting pass
- Relevant tests pass
- Error and empty states are handled
- Documents are updated when required
- No unrelated changes are included
