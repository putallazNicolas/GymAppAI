import type { BackupRepo, DataSnapshot } from '../contracts';
import type { SqliteContext } from './context';
import { inTransaction } from './driver';
import { readSettings, writeSettings } from './settings';
import {
  EXERCISES,
  PLANNED_EXERCISES,
  ROUTINES,
  ROUTINE_DAYS,
  WORKOUTS,
  WORKOUT_EXERCISES,
  WORKOUT_SETS,
  insertRow,
  selectAll,
  type TableSpec,
} from './tables';

/** Parents before children (insert order); reversed for deletes. */
const INSERT_ORDER = [
  ['exercises', EXERCISES],
  ['routines', ROUTINES],
  ['routineDays', ROUTINE_DAYS],
  ['plannedExercises', PLANNED_EXERCISES],
  ['workouts', WORKOUTS],
  ['workoutExercises', WORKOUT_EXERCISES],
  ['workoutSets', WORKOUT_SETS],
] as const;

export function createBackupRepo({ db }: SqliteContext): BackupRepo {
  return {
    async snapshot() {
      const snapshot: Record<string, unknown> = {};
      for (const [key, spec] of INSERT_ORDER) {
        snapshot[key] = await selectAll(db, spec as TableSpec<object>);
      }
      snapshot.settings = await readSettings(db);
      return snapshot as unknown as DataSnapshot;
    },

    async restore(snapshot) {
      await inTransaction(db, async () => {
        for (const [, spec] of [...INSERT_ORDER].reverse()) {
          await db.run(`DELETE FROM ${spec.table}`);
        }
        await db.run('DELETE FROM settings');
        for (const [key, spec] of INSERT_ORDER) {
          for (const row of snapshot[key] as object[]) {
            await insertRow(db, spec as TableSpec<object>, row);
          }
        }
        await writeSettings(db, snapshot.settings);
      });
    },
  };
}
