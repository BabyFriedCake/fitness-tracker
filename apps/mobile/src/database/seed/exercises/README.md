# Exercise Seed Format

Exercise seed files define standard library exercises that are bundled with the app and imported offline after database migrations.

Rules:

- Every row must use a stable `id`.
- `slug` must be unique and stable.
- `nameZh`, optional `nameEn`, muscle group, equipment, type, and status are validated by the Exercise domain validator.
- `sourceName`, `sourceReference`, and `license` are required so each seeded exercise remains traceable.
- Images are not included until licensing is verified.
- Imports are idempotent: importing the same seed again updates the same row by `id` and does not create duplicates.
- Future seed upgrades must keep existing IDs unchanged.

The initial starter dataset is authored for this project and marked as `CC0-1.0` so it can be bundled without a runtime network dependency.
