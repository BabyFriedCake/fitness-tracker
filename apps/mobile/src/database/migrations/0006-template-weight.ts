export const TEMPLATE_WEIGHT_SQL = `
ALTER TABLE workout_template_exercises
ADD COLUMN weight REAL;
`;
