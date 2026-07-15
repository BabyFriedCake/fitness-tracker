# S1-01 — Initialize pnpm Workspace and Expo App

## Goal

Initialize the repository as a pnpm workspace and create the Expo mobile application at `apps/mobile/`.

## Read first

- `AGENTS.md`
- `docs/08-Development/development-guide.md`
- `docs/08-Development/coding-style.md`
- `docs/08-Development/git-workflow.md`

## Scope

Allowed:

- Root `package.json`
- Root `pnpm-workspace.yaml`
- `apps/mobile/`
- Root and mobile `.gitignore` updates
- Lockfile

Do not:

- Implement product screens
- Add SQLite yet
- Add Zustand, forms, or domain dependencies yet
- Change product documentation

## Required outcome

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

Create the mobile app using the current stable Expo default template with Expo Router and TypeScript.

The root package must be private.

Suggested root scripts:

```json
{
  "scripts": {
    "mobile": "pnpm --filter mobile",
    "start": "pnpm --filter mobile start",
    "ios": "pnpm --filter mobile ios",
    "android": "pnpm --filter mobile android",
    "web": "pnpm --filter mobile web"
  }
}
```

Use the actual generated mobile package name in filters if it differs.

## Acceptance criteria

- [ ] `pnpm install` succeeds from repository root.
- [ ] Exactly one lockfile exists: `pnpm-lock.yaml`.
- [ ] `pnpm start` starts the Expo project.
- [ ] The generated app uses TypeScript.
- [ ] Expo Router is present and launches.
- [ ] No product feature code was added.
- [ ] Generated sample content is reduced only when necessary; do not redesign the app yet.

## Validation

Run:

```bash
pnpm install
pnpm start
```

Also report the selected Expo SDK, React Native, React, Node, and pnpm versions.

## Suggested commit

```text
chore: initialize Expo mobile workspace
```
