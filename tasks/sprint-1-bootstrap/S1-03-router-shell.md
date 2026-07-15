# S1-03 — Build the Expo Router Application Shell

## Goal

Create a minimal, runnable navigation shell with placeholder routes only.

## Read first

- `AGENTS.md`
- `docs/05-Prototype/README.md`
- `docs/05-Prototype/P001-Today.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/05-Prototype/P008-History.md`
- `docs/05-Prototype/P009-Settings.md`
- `docs/07-Design-System/design-system.md`

## Scope

Create placeholder routes for the V1 top-level navigation.

Recommended tabs:

- Today
- Training/Templates
- Exercise Library
- History
- Settings

Placeholders may show only the approved Chinese page name and a development note.

Do not:

- Implement prototype behavior
- Add mock statistics or fake history
- Add final styling
- Create database queries

## Acceptance criteria

- [ ] App opens to Today.
- [ ] All five tabs are reachable.
- [ ] Route files contain no domain or SQL logic.
- [ ] Safe areas and system theme do not make text unreadable.
- [ ] Placeholder copy is Chinese.
- [ ] Navigation works on iOS simulator/device.
- [ ] A navigation smoke test exists where practical.

## Suggested commit

```text
feat: add mobile navigation shell
```
