import type { ExerciseId } from '@/domain/exercise';

export const EXERCISE_SELECTION_CONTEXTS = ['template', 'session'] as const;

export type ExerciseSelectionContext =
  (typeof EXERCISE_SELECTION_CONTEXTS)[number];

export type ExerciseSelectionReturnPath =
  | '/'
  | '/templates'
  | '/templates/new'
  | '/templates/[id]'
  | '/templates/[id]/edit'
  | '/exercises'
  | '/history'
  | '/settings';

export type ExerciseSelectionReturnParams = Readonly<Record<string, string>>;

export type ExerciseLibrarySelectionMode =
  | {
      readonly status: 'browse';
    }
  | {
      readonly status: 'selecting';
      readonly context: ExerciseSelectionContext;
      readonly returnTo: ExerciseSelectionReturnPath;
      readonly returnParams: ExerciseSelectionReturnParams;
      readonly alreadySelectedExerciseIds: readonly ExerciseId[];
    }
  | {
      readonly status: 'invalid';
      readonly message: string;
    };

export type ExerciseSelectionRouteParams = {
  readonly mode?: string | readonly string[];
  readonly context?: string | readonly string[];
  readonly returnTo?: string | readonly string[];
  readonly returnParams?: string | readonly string[];
  readonly selectedIds?: string | readonly string[];
};

export type ExerciseSelectionHref = {
  readonly pathname: '/exercises';
  readonly params: {
    readonly mode: 'select';
    readonly context: ExerciseSelectionContext;
    readonly returnTo: ExerciseSelectionReturnPath;
    readonly returnParams?: string;
    readonly selectedIds?: string;
  };
};

export type ExerciseSelectionResultParams = {
  readonly selectedExerciseId: ExerciseId;
  readonly selectionContext: ExerciseSelectionContext;
};

const DEFAULT_TEMPLATE_RETURN_PATH = '/templates';
const DEFAULT_SESSION_RETURN_PATH = '/';
const VALID_RETURN_PATHS = [
  '/',
  '/templates',
  '/templates/new',
  '/templates/[id]',
  '/templates/[id]/edit',
  '/exercises',
  '/history',
  '/settings',
] as const satisfies readonly ExerciseSelectionReturnPath[];

export function parseExerciseLibrarySelectionMode(
  params: ExerciseSelectionRouteParams,
): ExerciseLibrarySelectionMode {
  const mode = firstParamValue(params.mode);

  if (!mode || mode === 'browse') {
    return { status: 'browse' };
  }

  if (mode !== 'select') {
    return {
      status: 'invalid',
      message: '动作选择入口无效，请返回后重试。',
    };
  }

  const context = firstParamValue(params.context);

  if (!isExerciseSelectionContext(context)) {
    return {
      status: 'invalid',
      message: '动作选择来源无效，请返回后重试。',
    };
  }

  return {
    status: 'selecting',
    context,
    returnTo: parseReturnTo(params.returnTo, context),
    returnParams: parseReturnParams(params.returnParams),
    alreadySelectedExerciseIds: parseAlreadySelectedExerciseIds(
      params.selectedIds,
    ),
  };
}

export function createTemplateExerciseSelectionHref(
  options: {
    readonly returnTo?: ExerciseSelectionReturnPath;
    readonly returnParams?: ExerciseSelectionReturnParams;
    readonly alreadySelectedExerciseIds?: readonly ExerciseId[];
  } = {},
): ExerciseSelectionHref {
  return createExerciseSelectionHref({
    context: 'template',
    returnTo: options.returnTo ?? DEFAULT_TEMPLATE_RETURN_PATH,
    returnParams: options.returnParams ?? {},
    alreadySelectedExerciseIds: options.alreadySelectedExerciseIds ?? [],
  });
}

export function createSessionExerciseSelectionHref(
  options: {
    readonly returnTo?: ExerciseSelectionReturnPath;
    readonly returnParams?: ExerciseSelectionReturnParams;
    readonly alreadySelectedExerciseIds?: readonly ExerciseId[];
  } = {},
): ExerciseSelectionHref {
  return createExerciseSelectionHref({
    context: 'session',
    returnTo: options.returnTo ?? DEFAULT_SESSION_RETURN_PATH,
    returnParams: options.returnParams ?? {},
    alreadySelectedExerciseIds: options.alreadySelectedExerciseIds ?? [],
  });
}

export function createExerciseSelectionResultParams(
  context: ExerciseSelectionContext,
  exerciseId: ExerciseId,
): ExerciseSelectionResultParams {
  return {
    selectedExerciseId: exerciseId,
    selectionContext: context,
  };
}

export function isExerciseAlreadySelected(
  mode: ExerciseLibrarySelectionMode,
  exerciseId: ExerciseId,
): boolean {
  return (
    mode.status === 'selecting' &&
    mode.alreadySelectedExerciseIds.includes(exerciseId)
  );
}

function createExerciseSelectionHref(options: {
  readonly context: ExerciseSelectionContext;
  readonly returnTo: ExerciseSelectionReturnPath;
  readonly returnParams: ExerciseSelectionReturnParams;
  readonly alreadySelectedExerciseIds: readonly ExerciseId[];
}): ExerciseSelectionHref {
  const selectedIds = options.alreadySelectedExerciseIds.join(',');
  const returnParams = encodeReturnParams(options.returnParams);

  return {
    pathname: '/exercises',
    params: {
      mode: 'select',
      context: options.context,
      returnTo: options.returnTo,
      ...(returnParams ? { returnParams } : {}),
      ...(selectedIds ? { selectedIds } : {}),
    },
  };
}

function encodeReturnParams(params: ExerciseSelectionReturnParams): string {
  const entries = Object.entries(params).filter(([, value]) => value);

  if (entries.length === 0) {
    return '';
  }

  return new URLSearchParams(entries).toString();
}

function parseReturnTo(
  value: string | readonly string[] | undefined,
  context: ExerciseSelectionContext,
): ExerciseSelectionReturnPath {
  const returnTo = firstParamValue(value);

  if (isExerciseSelectionReturnPath(returnTo)) {
    return returnTo;
  }

  return context === 'template'
    ? DEFAULT_TEMPLATE_RETURN_PATH
    : DEFAULT_SESSION_RETURN_PATH;
}

function parseAlreadySelectedExerciseIds(
  value: string | readonly string[] | undefined,
): readonly ExerciseId[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return rawValues
    .flatMap((rawValue) => rawValue.split(','))
    .map((rawValue) => rawValue.trim())
    .filter(Boolean)
    .map((rawValue) => rawValue as ExerciseId);
}

function parseReturnParams(
  value: string | readonly string[] | undefined,
): ExerciseSelectionReturnParams {
  const rawValue = firstParamValue(value);

  if (!rawValue) {
    return {};
  }

  return Object.fromEntries(new URLSearchParams(rawValue).entries());
}

function firstParamValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0];
}

function isExerciseSelectionContext(
  value: string | undefined,
): value is ExerciseSelectionContext {
  return EXERCISE_SELECTION_CONTEXTS.includes(
    value as ExerciseSelectionContext,
  );
}

function isExerciseSelectionReturnPath(
  value: string | undefined,
): value is ExerciseSelectionReturnPath {
  return VALID_RETURN_PATHS.includes(value as ExerciseSelectionReturnPath);
}
