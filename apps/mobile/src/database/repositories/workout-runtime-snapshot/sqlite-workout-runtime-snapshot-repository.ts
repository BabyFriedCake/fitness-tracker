import { SQLiteStorage } from 'expo-sqlite/kv-store';

import type { WorkoutSessionId } from '@/domain/workout-session';
import {
  isValidWorkoutRuntimeSnapshot,
  type WorkoutRuntimeSnapshotRepository,
  type WorkoutRuntimeSnapshotSaveResult,
} from '@/features/workout-session/application/workout-runtime-snapshot-repository';
const WORKOUT_RUNTIME_SNAPSHOT_DATABASE_NAME =
  'fitness-tracker-workout-runtime-snapshots.db';
const WORKOUT_RUNTIME_SNAPSHOT_KEY_PREFIX = 'workout-runtime:';

export type WorkoutRuntimeSnapshotStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
};

const sharedStorage = new SQLiteStorage(WORKOUT_RUNTIME_SNAPSHOT_DATABASE_NAME);

export class WorkoutRuntimeSnapshotPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkoutRuntimeSnapshotPersistenceError';
  }
}

export function createSqliteWorkoutRuntimeSnapshotRepository(
  storage: WorkoutRuntimeSnapshotStorage = sharedStorage,
): WorkoutRuntimeSnapshotRepository {
  return {
    async save(snapshot) {
      if (!isValidWorkoutRuntimeSnapshot(snapshot)) {
        return createSnapshotPersistFailure(
          new WorkoutRuntimeSnapshotPersistenceError(
            'WorkoutRuntimeSnapshot is invalid.',
          ),
        );
      }

      try {
        await storage.setItem(
          createSnapshotKey(snapshot.sessionId),
          JSON.stringify(snapshot),
        );
        return { success: true };
      } catch (error) {
        return createSnapshotPersistFailure(error);
      }
    },
    async load(sessionId) {
      try {
        const storedSnapshot = await storage.getItem(
          createSnapshotKey(sessionId),
        );

        if (!storedSnapshot) {
          return null;
        }

        const parsed = JSON.parse(storedSnapshot) as unknown;

        return isValidWorkoutRuntimeSnapshot(parsed) &&
          parsed.sessionId === sessionId
          ? parsed
          : null;
      } catch {
        return null;
      }
    },
    async clear(sessionId) {
      await storage.removeItem(createSnapshotKey(sessionId));
    },
  };
}

function createSnapshotKey(sessionId: WorkoutSessionId): string {
  return `${WORKOUT_RUNTIME_SNAPSHOT_KEY_PREFIX}${sessionId}`;
}

function createSnapshotPersistFailure(
  error: unknown,
): WorkoutRuntimeSnapshotSaveResult {
  return {
    success: false,
    reason: 'snapshot_persist_failed',
    error: error instanceof Error ? error : new Error(String(error)),
  };
}
