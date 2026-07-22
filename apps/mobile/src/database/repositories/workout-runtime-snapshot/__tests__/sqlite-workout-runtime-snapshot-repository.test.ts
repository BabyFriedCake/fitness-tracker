/// <reference types="jest" />

import initSqlJs from 'sql.js/dist/sql-asm.js';

import type { ExerciseId } from '@/domain/exercise';
import type {
  SessionExerciseId,
  WorkoutSessionId,
  WorkoutSetId,
} from '@/domain/workout-session';
import {
  createSqliteWorkoutRuntimeSnapshotRepository,
  type WorkoutRuntimeSnapshotStorage,
} from '@/database/repositories/workout-runtime-snapshot/sqlite-workout-runtime-snapshot-repository';
import type { WorkoutRuntimeSnapshot } from '@/features/workout-session/application/workout-runtime-engine';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const UPDATED_AT = '2026-07-20T01:20:00.000Z';

describe('SQLite WorkoutRuntimeSnapshotRepository', () => {
  it('saves, loads and replaces a runtime snapshot', async () => {
    const storage = createMemoryStorage();
    const repository = createSqliteWorkoutRuntimeSnapshotRepository(storage);
    const running = buildSnapshot('running');

    await repository.save(running);
    await expect(repository.load(SESSION_ID)).resolves.toEqual(running);

    const paused = buildSnapshot('paused');
    await repository.save(paused);
    await expect(repository.load(SESSION_ID)).resolves.toEqual(paused);
  });

  it('clears a persisted runtime snapshot', async () => {
    const repository = createSqliteWorkoutRuntimeSnapshotRepository(
      createMemoryStorage(),
    );
    await repository.save(buildSnapshot('running'));

    await repository.clear(SESSION_ID);

    await expect(repository.load(SESSION_ID)).resolves.toBeNull();
  });

  it('does not restore malformed persisted data', async () => {
    const storage = createMemoryStorage();
    const repository = createSqliteWorkoutRuntimeSnapshotRepository(storage);
    await storage.setItem(
      `workout-runtime:${SESSION_ID}`,
      '{"status":"running"}',
    );

    await expect(repository.load(SESSION_ID)).resolves.toBeNull();
  });

  it.each(['running', 'paused'] as const)(
    'persists a %s snapshot after closing and reopening SQLite storage',
    async (status) => {
      const firstStorage = await createRealSqliteStorage();
      const firstRepository =
        createSqliteWorkoutRuntimeSnapshotRepository(firstStorage);
      const snapshot = buildSnapshot(status);

      await expect(firstRepository.save(snapshot)).resolves.toEqual({
        success: true,
      });
      const persistedDatabase = await firstStorage.close();

      const secondStorage = await createRealSqliteStorage(persistedDatabase);
      const secondRepository =
        createSqliteWorkoutRuntimeSnapshotRepository(secondStorage);

      await expect(secondRepository.load(SESSION_ID)).resolves.toEqual(
        snapshot,
      );
      await secondStorage.close();
    },
  );

  it('returns a persistence failure without replacing the previous value', async () => {
    const previousSnapshot = JSON.stringify(buildSnapshot('running'));
    const storage: WorkoutRuntimeSnapshotStorage = {
      getItem: async () => previousSnapshot,
      setItem: async () => {
        throw new Error('disk unavailable');
      },
      removeItem: async () => undefined,
    };
    const repository = createSqliteWorkoutRuntimeSnapshotRepository(storage);

    await expect(repository.save(buildSnapshot('paused'))).resolves.toEqual({
      success: false,
      reason: 'snapshot_persist_failed',
      error: new Error('disk unavailable'),
    });
    await expect(repository.load(SESSION_ID)).resolves.toEqual(
      buildSnapshot('running'),
    );
  });
});

function buildSnapshot(
  status: Extract<WorkoutRuntimeSnapshot['status'], 'running' | 'paused'>,
): WorkoutRuntimeSnapshot {
  const currentExercise = {
    id: 'session-exercise-bench' as SessionExerciseId,
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
    sets: [
      {
        id: 'set-1' as WorkoutSetId,
        sessionExerciseId: 'session-exercise-bench' as SessionExerciseId,
        setNumber: 1,
        setType: 'normal' as const,
        actualReps: 8,
        weight: 80,
        isCompleted: true,
        isExtraSet: false,
        completedAt: UPDATED_AT,
      },
    ],
  };

  return {
    sessionId: SESSION_ID,
    status,
    currentExercise,
    currentExerciseIndex: 0,
    currentSessionExerciseId: currentExercise.id,
    currentSet: 2,
    currentSetNumber: 2,
    orderedExercises: [currentExercise],
    completedSetCount: 1,
    completedSets: 1,
    totalTargetSetCount: 3,
    targetSets: 3,
    restTimerStatus: status,
    updatedAt: UPDATED_AT,
  };
}

function createMemoryStorage(): WorkoutRuntimeSnapshotStorage {
  const values = new Map<string, string>();

  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

type RealSqliteStorage = WorkoutRuntimeSnapshotStorage & {
  readonly close: () => Promise<Uint8Array>;
};

async function createRealSqliteStorage(
  persistedDatabase?: Uint8Array,
): Promise<RealSqliteStorage> {
  const SQL = await initSqlJs();
  const database = persistedDatabase
    ? new SQL.Database(persistedDatabase)
    : new SQL.Database();

  database.run(
    'CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
  );

  return {
    getItem: async (key) => {
      const result = database.exec(
        'SELECT value FROM storage WHERE key = ? LIMIT 1;',
        [key],
      );
      return result[0]?.values[0]?.[0]?.toString() ?? null;
    },
    setItem: async (key, value) => {
      database.run(
        'INSERT INTO storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
        [key, value],
      );
    },
    removeItem: async (key) => {
      database.run('DELETE FROM storage WHERE key = ?;', [key]);
    },
    close: async () => {
      const persisted = database.export();
      database.close();
      return persisted;
    },
  };
}
