export const EXERCISE_DATASET_METADATA_SQL = `
ALTER TABLE exercises
ADD COLUMN instruction_steps_json TEXT;

ALTER TABLE exercises
ADD COLUMN source_license TEXT;

ALTER TABLE exercises
ADD COLUMN source_attribution TEXT;
`;
