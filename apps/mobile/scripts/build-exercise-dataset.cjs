const fs = require('node:fs');
const path = require('node:path');

const DATASET_SOURCE_NAME = 'hasaneyldrm/exercises-dataset';
const DATASET_SOURCE_LICENSE = 'MIT';
const DATASET_SOURCE_REVISION = '7455efae41b330c265e7cd4b78dfa848e7ce5ebd';
const DATASET_SOURCE_REFERENCE = `https://github.com/hasaneyldrm/exercises-dataset/tree/${DATASET_SOURCE_REVISION}`;

const MUSCLE_BY_CATEGORY = {
  back: 'back',
  cardio: 'cardio',
  chest: 'chest',
  'lower arms': 'arms',
  'lower legs': 'legs',
  neck: 'neck',
  shoulders: 'shoulders',
  'upper arms': 'arms',
  'upper legs': 'legs',
  waist: 'core',
};

function mapExerciseDataset(sourceRows) {
  if (!Array.isArray(sourceRows)) {
    throw new Error('Exercise dataset must be an array.');
  }

  const seenIds = new Set();
  const seenSlugs = new Set();

  return sourceRows.map((row, index) => {
    assertSourceRow(row, index);

    const id = `exercise-hased-${row.id}`;
    const slug = `${slugify(row.name)}-${row.id}`;

    if (seenIds.has(id) || seenSlugs.has(slug)) {
      throw new Error(`Duplicate exercise dataset identity at row ${index}.`);
    }
    seenIds.add(id);
    seenSlugs.add(slug);

    const primaryMuscleGroup = MUSCLE_BY_CATEGORY[row.category];
    if (!primaryMuscleGroup) {
      throw new Error(`Unsupported exercise category: ${row.category}.`);
    }

    const instructionSteps = pickInstructionSteps(row.instruction_steps);
    const secondaryMuscleGroups = mapSecondaryMuscles(
      row.secondary_muscles,
      primaryMuscleGroup,
    );
    const timestamp = normalizeTimestamp(row.created_at);

    return {
      id,
      slug,
      nameZh: row.name.trim(),
      nameEn: row.name.trim(),
      type: row.category === 'cardio' ? 'cardio' : 'strength',
      primaryMuscleGroup,
      secondaryMuscleGroups,
      equipment: mapEquipment(row.equipment),
      description:
        normalizeText(row.instructions?.zh) ??
        normalizeText(row.instructions?.en) ??
        null,
      instructionSteps,
      imageUri: null,
      sourceName: DATASET_SOURCE_NAME,
      sourceReference: DATASET_SOURCE_REFERENCE,
      license: DATASET_SOURCE_LICENSE,
      attribution: `Exercise metadata from ${DATASET_SOURCE_NAME}`,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

function assertSourceRow(row, index) {
  if (
    !row ||
    typeof row !== 'object' ||
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.category !== 'string' ||
    typeof row.equipment !== 'string'
  ) {
    throw new Error(`Invalid exercise dataset row at index ${index}.`);
  }
}

function pickInstructionSteps(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const entries = ['zh', 'en'].flatMap((locale) => {
    const steps = value[locale];
    if (!Array.isArray(steps)) {
      return [];
    }

    const normalized = steps
      .filter((step) => typeof step === 'string')
      .map((step) => step.trim())
      .filter(Boolean);

    return normalized.length > 0 ? [[locale, normalized]] : [];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function mapSecondaryMuscles(values, primaryMuscleGroup) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter((value) => typeof value === 'string')
        .map(classifyMuscle)
        .filter((value) => value !== null && value !== primaryMuscleGroup),
    ),
  ];
}

function classifyMuscle(value) {
  const normalized = value.toLowerCase();

  if (/chest|pectoral/.test(normalized)) return 'chest';
  if (/back|lat|trap|rhomboid|spine/.test(normalized)) return 'back';
  if (/shoulder|deltoid/.test(normalized)) return 'shoulders';
  if (/arm|bicep|tricep|forearm|wrist|brachialis/.test(normalized)) {
    return 'arms';
  }
  if (
    /leg|quad|hamstring|glute|calf|calves|hip|adductor|abductor|thigh|foot|ankle/.test(
      normalized,
    )
  ) {
    return 'legs';
  }
  if (/abs|core|waist|oblique|serratus/.test(normalized)) return 'core';
  if (/cardio|heart/.test(normalized)) return 'cardio';
  if (/neck/.test(normalized)) return 'neck';

  return null;
}

function mapEquipment(value) {
  const normalized = value.toLowerCase();

  if (normalized === 'body weight') return 'bodyweight';
  if (normalized === 'cable') return 'cable';
  if (normalized === 'dumbbell') return 'dumbbell';
  if (normalized === 'kettlebell') return 'kettlebell';
  if (normalized.includes('band')) return 'band';
  if (/bike|elliptical|stepmill|skierg|ergometer/.test(normalized)) {
    return 'cardio_machine';
  }
  if (/barbell|trap bar/.test(normalized)) return 'barbell';
  if (/machine|assisted/.test(normalized)) return 'machine';

  return 'other';
}

function normalizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTimestamp(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid exercise dataset timestamp: ${value}.`);
  }

  return new Date(parsed).toISOString();
}

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'exercise';
}

function writeDataset(sourcePath, outputPath) {
  const sourceRows = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const normalizedRows = mapExerciseDataset(sourceRows);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(normalizedRows, null, 2)}\n`,
    'utf8',
  );

  return normalizedRows.length;
}

if (require.main === module) {
  const [, , sourcePath, outputPath] = process.argv;
  if (!sourcePath || !outputPath) {
    throw new Error(
      'Usage: node build-exercise-dataset.cjs <source.json> <output.json>',
    );
  }

  const count = writeDataset(sourcePath, outputPath);
  process.stdout.write(`Wrote ${count} exercises to ${outputPath}.\n`);
}

module.exports = {
  DATASET_SOURCE_LICENSE,
  DATASET_SOURCE_NAME,
  DATASET_SOURCE_REFERENCE,
  DATASET_SOURCE_REVISION,
  mapExerciseDataset,
  writeDataset,
};
