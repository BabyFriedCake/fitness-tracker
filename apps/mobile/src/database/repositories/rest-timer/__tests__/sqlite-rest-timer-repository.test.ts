/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import {
  RestTimerPersistenceError,
  createSqliteRestTimerRepository,
} from '@/database/repositories/rest-timer';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type { DatabaseConnection, DatabaseValue } from '@/database/types';
import type { ExerciseId } from '@/domain/exercise';
import {
  RestTimerTransitionError,
  type InProgressWorkoutSession,
  type RestTimer,
  type RestTimerId,
  type SessionExerciseId,
  type WorkoutSessionId,
} from '@/domain/workout-session';
import {
  ActiveRestTimerExistsError,
  RestTimerOperationStatusError,
  extendRestTimer,
  pauseRestTimer,
  startRestTimer,
} from '@/features/workout-session/application/workout-session-rest-timer';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const TIMER_STARTED_AT = '2026-07-17T01:10:00.000Z';
const TIMER_ENDED_AT = '2026-07-17T01:11:30.000Z';
const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;

type TestSqliteProcess = {
  readonly stdin: {
    readonly write: (source: string) => void;
    readonly end: () => void;
  };
  readonly stdout: {
    readonly setEncoding: (encoding: string) => void;
    readonly on: (event: 'data', listener: (chunk: string) => void) => void;
  };
  readonly on: {
    (event: 'error', listener: (error: Error) => void): void;
    (
      event: 'exit',
      listener: (code: number | null, signal: string | null) => void,
    ): void;
  };
};

const { spawn } = jest.requireActual('node:child_process') as {
  readonly spawn: (
    command: string,
    args: readonly string[],
    options: { readonly stdio: 'pipe' },
  ) => TestSqliteProcess;
};
const { mkdtempSync, rmSync } = jest.requireActual('node:fs') as {
  readonly mkdtempSync: (prefix: string) => string;
  readonly rmSync: (
    path: string,
    options: { readonly force: boolean; readonly recursive: boolean },
  ) => void;
};
const { tmpdir } = jest.requireActual('node:os') as {
  readonly tmpdir: () => string;
};
const { join } = jest.requireActual('node:path') as {
  readonly join: (...paths: readonly string[]) => string;
};

describe('SQLite RestTimerRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', { useNewConnection: true });
    await enableForeignKeys(database);
    await runMigrations(database);
    await insertExercise(database);
    await createSqliteWorkoutSessionRepository(database).save(
      buildInProgressSession(),
    );
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('starts and restores all persisted fields with current session position', async () => {
    const repository = createSqliteRestTimerRepository(database);
    const timer = buildRunningTimer();

    const result = await repository.startIfNoActiveTimer({
      timer,
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });

    expect(result).toEqual({ status: 'started', timer });
    await expect(repository.findBySessionId(SESSION_ID)).resolves.toEqual(
      timer,
    );
    await expect(
      createSqliteWorkoutSessionRepository(database).findById(SESSION_ID),
    ).resolves.toEqual(
      expect.objectContaining({
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        updatedAt: TIMER_STARTED_AT,
      }),
    );
  });

  it('keeps one active timer and allows a terminal timer to be replaced', async () => {
    const repository = createSqliteRestTimerRepository(database);
    const first = buildRunningTimer();
    await repository.startIfNoActiveTimer({
      timer: first,
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });
    const activeCandidate = buildRunningTimer({
      id: 'rest-timer-2' as RestTimerId,
      createdAt: '2026-07-17T01:11:00.000Z',
      updatedAt: '2026-07-17T01:11:00.000Z',
      startedAt: '2026-07-17T01:11:00.000Z',
      targetEndAt: '2026-07-17T01:12:30.000Z',
    });

    await expect(
      repository.startIfNoActiveTimer({
        timer: activeCandidate,
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 3,
        expectedSessionUpdatedAt: TIMER_STARTED_AT,
        sessionUpdatedAt: '2026-07-17T01:11:00.000Z',
      }),
    ).resolves.toEqual({ status: 'active_timer_exists', activeTimer: first });

    const completed: RestTimer = {
      ...first,
      status: 'completed',
      updatedAt: TIMER_ENDED_AT,
    };
    await expect(
      repository.update(completed, 'running', first.updatedAt),
    ).resolves.toEqual(completed);
    const replacement = buildRunningTimer({
      id: 'rest-timer-2' as RestTimerId,
      createdAt: TIMER_ENDED_AT,
      updatedAt: TIMER_ENDED_AT,
      startedAt: TIMER_ENDED_AT,
      targetEndAt: '2026-07-17T01:13:00.000Z',
    });
    await expect(
      repository.startIfNoActiveTimer({
        timer: replacement,
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 3,
        expectedSessionUpdatedAt: TIMER_STARTED_AT,
        sessionUpdatedAt: TIMER_ENDED_AT,
      }),
    ).resolves.toEqual({ status: 'started', timer: replacement });
  });

  it('rolls back a timer claim when the session position cannot be updated', async () => {
    const repository = createSqliteRestTimerRepository(database);

    await expect(
      repository.startIfNoActiveTimer({
        timer: buildRunningTimer(),
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        expectedSessionUpdatedAt: 'stale-version',
        sessionUpdatedAt: TIMER_STARTED_AT,
      }),
    ).resolves.toEqual({ status: 'session_conflict' });
    await expect(repository.findBySessionId(SESSION_ID)).resolves.toBeNull();
  });

  it('rejects a non-running timer at the start persistence boundary', async () => {
    const repository = createSqliteRestTimerRepository(database);

    await expect(
      repository.startIfNoActiveTimer({
        timer: { ...buildRunningTimer(), status: 'completed' },
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        expectedSessionUpdatedAt: STARTED_AT,
        sessionUpdatedAt: TIMER_STARTED_AT,
      }),
    ).rejects.toBeInstanceOf(RestTimerPersistenceError);
    await expect(repository.findBySessionId(SESSION_ID)).resolves.toBeNull();
  });

  it('atomically completes only an expired running timer', async () => {
    const repository = createSqliteRestTimerRepository(database);
    const timer = buildRunningTimer();
    await repository.startIfNoActiveTimer({
      timer,
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });

    await expect(
      repository.completeIfExpired(SESSION_ID, '2026-07-17T01:11:00.000Z'),
    ).resolves.toBeNull();
    await expect(
      repository.completeIfExpired(SESSION_ID, TIMER_ENDED_AT),
    ).resolves.toEqual({
      ...timer,
      status: 'completed',
      updatedAt: TIMER_ENDED_AT,
    });
  });

  it('atomically replaces an expired running timer without a recovery query', async () => {
    const restTimerRepository = createSqliteRestTimerRepository(database);
    await restTimerRepository.startIfNoActiveTimer({
      timer: buildRunningTimer(),
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });
    const repositories = {
      workoutSessionRepository: createSqliteWorkoutSessionRepository(database),
      restTimerRepository,
    };

    const replacement = await startRestTimer(
      repositories,
      buildStartInput({
        startedAt: TIMER_ENDED_AT,
        previousSetNumber: 2,
        nextSetNumber: 3,
      }),
      { createRestTimerId: () => 'rest-timer-2' },
    );

    expect(replacement).toEqual(
      expect.objectContaining({
        id: 'rest-timer-2',
        status: 'running',
        startedAt: TIMER_ENDED_AT,
      }),
    );
    await expect(
      restTimerRepository.findBySessionId(SESSION_ID),
    ).resolves.toEqual(replacement);
    const rows = await database.getAllAsync<{ readonly id: string }>(
      'SELECT id FROM rest_timer_states WHERE session_id = ?;',
      SESSION_ID,
    );
    expect(rows).toEqual([{ id: 'rest-timer-2' }]);
  });

  it('still blocks a new timer while the persisted running timer is unexpired', async () => {
    const restTimerRepository = createSqliteRestTimerRepository(database);
    const existing = buildRunningTimer();
    await restTimerRepository.startIfNoActiveTimer({
      timer: existing,
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });

    await expect(
      startRestTimer(
        {
          workoutSessionRepository:
            createSqliteWorkoutSessionRepository(database),
          restTimerRepository,
        },
        buildStartInput({ startedAt: '2026-07-17T01:11:00.000Z' }),
        { createRestTimerId: () => 'rest-timer-2' },
      ),
    ).rejects.toBeInstanceOf(ActiveRestTimerExistsError);
    await expect(
      restTimerRepository.findBySessionId(SESSION_ID),
    ).resolves.toEqual(existing);
  });

  it('synchronizes an expired running timer before rejecting pause', async () => {
    const repository = createSqliteRestTimerRepository(database);
    await repository.startIfNoActiveTimer({
      timer: buildRunningTimer(),
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });

    await expect(
      pauseRestTimer(repository, {
        sessionId: SESSION_ID,
        now: TIMER_ENDED_AT,
      }),
    ).rejects.toBeInstanceOf(RestTimerTransitionError);
    await expect(repository.findBySessionId(SESSION_ID)).resolves.toEqual(
      expect.objectContaining({
        status: 'completed',
        updatedAt: TIMER_ENDED_AT,
      }),
    );
  });

  it('synchronizes an expired running timer before rejecting extension', async () => {
    const repository = createSqliteRestTimerRepository(database);
    await repository.startIfNoActiveTimer({
      timer: buildRunningTimer(),
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      expectedSessionUpdatedAt: STARTED_AT,
      sessionUpdatedAt: TIMER_STARTED_AT,
    });

    await expect(
      extendRestTimer(repository, {
        sessionId: SESSION_ID,
        now: TIMER_ENDED_AT,
        additionalSeconds: 30,
      }),
    ).rejects.toBeInstanceOf(RestTimerOperationStatusError);
    await expect(repository.findBySessionId(SESSION_ID)).resolves.toEqual(
      expect.objectContaining({
        status: 'completed',
        updatedAt: TIMER_ENDED_AT,
      }),
    );
  });
});

describe('SQLite RestTimerRepository file concurrency', () => {
  it('allows only one concurrent application start', async () => {
    const directory = mkdtempSync(
      join(tmpdir(), 'fitness-tracker-rest-timer-'),
    );
    const databasePath = join(directory, 'concurrent.sqlite');
    const transactionStartBarrier = new AsyncBarrier(2);
    const connectionA = new FileSqliteConnection(
      databasePath,
      transactionStartBarrier,
    );
    const connectionB = new FileSqliteConnection(
      databasePath,
      transactionStartBarrier,
    );

    try {
      await Promise.all([
        connectionA.execAsync('PRAGMA busy_timeout = 1000;'),
        connectionB.execAsync('PRAGMA busy_timeout = 1000;'),
      ]);
      await enableForeignKeys(connectionA);
      await enableForeignKeys(connectionB);
      await runMigrations(connectionA);
      await insertExercise(connectionA);
      await createSqliteWorkoutSessionRepository(connectionA).save(
        buildInProgressSession(),
      );

      const repositoriesA = {
        workoutSessionRepository:
          createSqliteWorkoutSessionRepository(connectionA),
        restTimerRepository: createSqliteRestTimerRepository(connectionA),
      };
      const repositoriesB = {
        workoutSessionRepository:
          createSqliteWorkoutSessionRepository(connectionB),
        restTimerRepository: createSqliteRestTimerRepository(connectionB),
      };
      const results = await Promise.allSettled([
        startRestTimer(repositoriesA, buildStartInput(), {
          createRestTimerId: () => 'rest-timer-concurrent-1',
        }),
        startRestTimer(repositoriesB, buildStartInput(), {
          createRestTimerId: () => 'rest-timer-concurrent-2',
        }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(
        results.find((result) => result.status === 'rejected'),
      ).toMatchObject({
        status: 'rejected',
        reason: expect.any(ActiveRestTimerExistsError),
      });
      const rows = await connectionA.getAllAsync<{
        readonly status: string;
      }>(
        `SELECT status FROM rest_timer_states WHERE status IN ('running', 'paused');`,
      );
      expect(rows).toHaveLength(1);
    } finally {
      await Promise.allSettled([
        connectionA.closeAsync(),
        connectionB.closeAsync(),
      ]);
      rmSync(directory, { force: true, recursive: true });
    }
  }, 10_000);
});

class AsyncBarrier {
  private arrived = 0;
  private readonly released: Promise<void>;
  private release: () => void = () => undefined;

  constructor(private readonly participants: number) {
    this.released = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  async wait(): Promise<void> {
    if (this.arrived < this.participants) {
      this.arrived += 1;
      if (this.arrived === this.participants) {
        this.release();
      }
    }
    await this.released;
  }
}

type PendingSqliteCommand = {
  readonly marker: string;
  readonly output: string[];
  readonly resolve: (output: readonly string[]) => void;
  readonly reject: (error: Error) => void;
};

class FileSqliteConnection implements DatabaseConnection {
  private readonly sqliteProcess: TestSqliteProcess;
  private readonly exited: Promise<void>;
  private pendingCommand: PendingSqliteCommand | undefined;
  private outputBuffer = '';
  private commandSequence = 0;
  private commandQueue: Promise<void> = Promise.resolve();
  private isClosed = false;

  constructor(
    databasePath: string,
    private readonly transactionStartBarrier?: AsyncBarrier,
  ) {
    this.sqliteProcess = spawn(
      'sh',
      ['-c', 'exec sqlite3 -json "$1" 2>&1', 'sqlite-test', databasePath],
      { stdio: 'pipe' },
    );
    this.sqliteProcess.stdout.setEncoding('utf8');
    this.sqliteProcess.stdout.on('data', (chunk: string) => {
      this.consumeOutput(chunk);
    });
    this.sqliteProcess.on('error', (error) => {
      this.rejectPendingCommand(error);
    });
    this.exited = new Promise((resolve) => {
      this.sqliteProcess.on('exit', (code, signal) => {
        if (!this.isClosed) {
          this.rejectPendingCommand(
            new Error(
              `sqlite3 exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
            ),
          );
        }
        resolve();
      });
    });
  }

  async execAsync(source: string): Promise<void> {
    await this.enqueue(async () => {
      await this.sendCommand(source);
    });
  }

  async runAsync(source: string, ...params: DatabaseValue[]): Promise<unknown> {
    return this.enqueue(async () => {
      const output = await this.sendCommand(
        `${bindSqlParameters(source, params)}\nSELECT changes() AS changes, last_insert_rowid() AS lastInsertRowId;`,
      );
      return parseSqliteRows<{
        readonly changes: number;
        readonly lastInsertRowId: number;
      }>(output)[0];
    });
  }

  async getFirstAsync<T>(
    source: string,
    ...params: DatabaseValue[]
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(
    source: string,
    ...params: DatabaseValue[]
  ): Promise<T[]> {
    return this.enqueue(async () =>
      parseSqliteRows<T>(
        await this.sendCommand(bindSqlParameters(source, params)),
      ),
    );
  }

  async withExclusiveTransactionAsync(
    task: (transaction: DatabaseConnection) => Promise<void>,
  ): Promise<void> {
    let transactionStarted = false;

    try {
      await this.transactionStartBarrier?.wait();
      await this.execAsync('BEGIN IMMEDIATE;');
      transactionStarted = true;
      await task(this);
      await this.execAsync('COMMIT;');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        try {
          await this.execAsync('ROLLBACK;');
        } catch {
          // Preserve the transaction or operation error.
        }
      }
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    await this.commandQueue;
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    this.sqliteProcess.stdin.end();
    await this.exited;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.commandQueue.then(operation);
    this.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private sendCommand(source: string): Promise<readonly string[]> {
    if (this.isClosed) {
      return Promise.reject(new Error('sqlite3 connection is closed.'));
    }
    if (this.pendingCommand) {
      return Promise.reject(new Error('sqlite3 command is already pending.'));
    }

    this.commandSequence += 1;
    const marker = `__SQLITE_COMMAND_${this.commandSequence}__`;

    return new Promise((resolve, reject) => {
      this.pendingCommand = { marker, output: [], resolve, reject };
      this.sqliteProcess.stdin.write(`${source.trim()}\n.print ${marker}\n`);
    });
  }

  private consumeOutput(chunk: string): void {
    this.outputBuffer += chunk;
    let lineEnd = this.outputBuffer.indexOf('\n');

    while (lineEnd >= 0) {
      const line = this.outputBuffer.slice(0, lineEnd).replace(/\r$/, '');
      this.outputBuffer = this.outputBuffer.slice(lineEnd + 1);
      this.consumeOutputLine(line);
      lineEnd = this.outputBuffer.indexOf('\n');
    }
  }

  private consumeOutputLine(line: string): void {
    const pending = this.pendingCommand;

    if (!pending) {
      return;
    }
    if (line !== pending.marker) {
      pending.output.push(line);
      return;
    }

    this.pendingCommand = undefined;
    const sqliteError = pending.output.find((outputLine) =>
      /^(?:Error:|Parse error|Runtime error)/.test(outputLine),
    );

    if (sqliteError) {
      pending.reject(new Error(pending.output.join('\n')));
      return;
    }
    pending.resolve(pending.output);
  }

  private rejectPendingCommand(error: Error): void {
    const pending = this.pendingCommand;
    this.pendingCommand = undefined;
    pending?.reject(error);
  }
}

function bindSqlParameters(
  source: string,
  params: readonly DatabaseValue[],
): string {
  let parameterIndex = 0;
  const boundSource = source.replace(/\?/g, () => {
    const parameter = params[parameterIndex];
    parameterIndex += 1;

    if (parameter === undefined) {
      throw new Error('Missing SQLite test parameter.');
    }
    return toSqlLiteral(parameter);
  });

  if (parameterIndex !== params.length) {
    throw new Error('Unused SQLite test parameter.');
  }
  return boundSource;
}

function toSqlLiteral(value: DatabaseValue): string {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('SQLite test numbers must be finite.');
    }
    return String(value);
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  return `X'${Array.from(value, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')}'`;
}

function parseSqliteRows<T>(output: readonly string[]): T[] {
  const json = output.join('\n').trim();
  return json ? (JSON.parse(json) as T[]) : [];
}

function buildInProgressSession(): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    sessionExercises: [
      {
        id: SESSION_EXERCISE_ID,
        sessionId: SESSION_ID,
        sourceExerciseId: 'exercise-bench' as ExerciseId,
        exerciseNameSnapshot: '杠铃卧推',
        position: 1,
        isEnabled: true,
        isSkipped: false,
        isCompleted: false,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        currentRestSeconds: 90,
        sets: [],
      },
    ],
    startedAt: STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: STARTED_AT,
  };
}

function buildRunningTimer(overrides: Partial<RestTimer> = {}): RestTimer {
  return {
    id: 'rest-timer-1' as RestTimerId,
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    previousSetNumber: 1,
    nextSetNumber: 2,
    originalDurationSeconds: 90,
    startedAt: TIMER_STARTED_AT,
    targetEndAt: TIMER_ENDED_AT,
    status: 'running',
    createdAt: TIMER_STARTED_AT,
    updatedAt: TIMER_STARTED_AT,
    ...overrides,
  };
}

function buildStartInput(
  overrides: Partial<Parameters<typeof startRestTimer>[1]> = {},
): Parameters<typeof startRestTimer>[1] {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    durationSeconds: 90,
    startedAt: TIMER_STARTED_AT,
    previousSetNumber: 1,
    nextSetNumber: 2,
    ...overrides,
  };
}

async function insertExercise(database: DatabaseConnection): Promise<void> {
  await database.runAsync(
    `
    INSERT INTO exercises (
      id, slug, name_zh, exercise_type, primary_muscle_group, equipment,
      is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    'exercise-bench',
    'exercise-bench',
    '杠铃卧推',
    'strength',
    'chest',
    'barbell',
    1,
    CREATED_AT,
    CREATED_AT,
  );
}
