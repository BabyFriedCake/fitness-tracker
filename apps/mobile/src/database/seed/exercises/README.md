# Exercise Seed Format

Exercise seed files define standard library exercises that are bundled with the app and imported offline after database migrations.

Rules:

- Every row must use a stable `id`.
- `slug` must be unique and stable.
- `nameZh`, optional `nameEn`, muscle group, equipment, type, and status are validated by the Exercise domain validator.
- `sourceName`, `sourceReference`, and `license` are required so each seeded exercise remains traceable.
- The bundled Sprint 6 dataset is pinned to upstream revision `7455efae`.
- MIT-covered metadata and instructions are normalized during development.
- Gym Visual images and GIFs are not bundled because reuse requires a separate
  media license; `imageUri` remains null and the UI uses a placeholder.
- Imports are idempotent: importing the same seed again updates the same row by `id` and does not create duplicates.
- Future seed upgrades must keep existing IDs unchanged.

The initial starter dataset is authored for this project and marked as `CC0-1.0` so it can be bundled without a runtime network dependency.

Regenerate the bundled dataset from an explicitly downloaded source file:

```sh
node scripts/build-exercise-dataset.cjs \
  /path/to/exercises.json \
  src/database/seed/exercises/data/exercises-dataset-v7455efae.json
```

The application imports only the generated local JSON and never reads GitHub at
runtime.
