import {
  NotFoundError,
  ValidationError,
  type CreateDomainServices,
  type Exercise,
  type ExerciseProgressPoint,
  type ID,
  type PersonalRecord,
  type PreviousPerformance,
  type WeeklyStat,
  type WorkoutDetail,
  type WorkoutListItem,
  type WorkoutSummary,
  type WorkoutSummaryExercise,
} from '../contracts';
import { buildExportPayload, importResultOf, parseImportPayload } from './dataExport';
import {
  bestSetOf,
  completedSets,
  durationSeconds,
  maxE1rmOf,
  maxWeightOf,
  volumeOf,
  weekStartOf,
} from './stats';

export const createDomainServices: CreateDomainServices = (repos, options = {}) => {
  const clock = options.now ?? (() => new Date());
  const nowIso = (): string => clock().toISOString();

  const requireWorkout = async (id: ID): Promise<WorkoutDetail> => {
    const w = await repos.workouts.getById(id);
    if (!w) throw new NotFoundError('Workout', id);
    return w;
  };

  const allSets = (w: WorkoutDetail) => w.exercises.flatMap((e) => e.sets);

  const getPreviousPerformance = async (
    exerciseId: ID,
    opts?: { excludeWorkoutId?: ID },
  ): Promise<PreviousPerformance | null> => {
    const history = await repos.workouts.getExerciseHistory(exerciseId, {
      excludeWorkoutId: opts?.excludeWorkoutId,
    });
    // Most recent finished session that actually has completed sets.
    for (const entry of history) {
      const done = completedSets(entry.sets);
      if (done.length === 0) continue;
      return {
        workoutId: entry.workout.id,
        date: entry.workout.startedAt,
        sets: done.map((s) => ({
          setIndex: s.setIndex,
          ...(s.weightKg !== undefined ? { weightKg: s.weightKg } : {}),
          ...(s.reps !== undefined ? { reps: s.reps } : {}),
        })),
      };
    }
    return null;
  };

  const workoutEnd = (w: { startedAt: string; finishedAt?: string }): string =>
    w.finishedAt ?? nowIso();

  return {
    async startWorkoutFromDay(dayId) {
      const day = await repos.routines.getDay(dayId);
      if (!day) throw new NotFoundError('RoutineDay', dayId);
      if (await repos.workouts.getInProgress()) {
        throw new ValidationError('another workout is already in progress');
      }
      const exercises = [];
      for (const planned of day.exercises) {
        const previous = await getPreviousPerformance(planned.exerciseId);
        const prevSets = previous?.sets ?? [];
        const sets = [];
        for (let i = 0; i < planned.sets; i++) {
          const match = prevSets.find((s) => s.setIndex === i) ?? prevSets[prevSets.length - 1];
          sets.push(match?.weightKg !== undefined ? { weightKg: match.weightKg } : {});
        }
        exercises.push({
          exerciseId: planned.exerciseId,
          plannedSets: planned.sets,
          plannedReps: planned.reps,
          restSeconds: planned.restSeconds,
          notes: planned.notes,
          sets,
        });
      }
      return repos.workouts.create({
        routineId: day.routineId,
        dayId: day.id,
        dayNameSnapshot: day.name,
        startedAt: nowIso(),
        exercises,
      });
    },

    async getSuggestedNextDay() {
      const routine = await repos.routines.getActive();
      if (!routine || routine.days.length === 0) return null;
      const last = await repos.workouts.getLastFinishedForRoutine(routine.id);
      const lastIndex = last?.dayId ? routine.days.findIndex((d) => d.id === last.dayId) : -1;
      const day = routine.days[lastIndex === -1 ? 0 : (lastIndex + 1) % routine.days.length];
      if (!day) return null;
      const found = await repos.exercises.getByIds(day.exercises.map((p) => p.exerciseId));
      const byId = new Map<ID, Exercise>(found.map((e) => [e.id, e]));
      const exercises = day.exercises.flatMap((p) => {
        const e = byId.get(p.exerciseId);
        return e ? [e] : [];
      });
      const { id, name, isActive, archived, createdAt, updatedAt, ownerId, createdBy } = routine;
      return {
        routine: { id, name, isActive, archived, createdAt, updatedAt, ownerId, createdBy },
        day,
        exercises,
      };
    },

    getPreviousPerformance,

    async completeSet(setId, values) {
      return repos.workouts.updateSet(setId, {
        ...(values.weightKg !== undefined ? { weightKg: values.weightKg } : {}),
        ...(values.reps !== undefined ? { reps: values.reps } : {}),
        completed: true,
        completedAt: nowIso(),
      });
    },

    async uncompleteSet(setId) {
      return repos.workouts.updateSet(setId, { completed: false, completedAt: null });
    },

    async finishWorkout(workoutId, opts) {
      return repos.workouts.update(workoutId, {
        finishedAt: nowIso(),
        ...(opts?.notes !== undefined ? { notes: opts.notes } : {}),
      });
    },

    async getWorkoutSummary(workoutId): Promise<WorkoutSummary> {
      const detail = await requireWorkout(workoutId);
      const { exercises: workoutExercises, ...workout } = detail;
      const sets = allSets(detail);
      const catalog = new Map(
        (
          await repos.exercises.getByIds([...new Set(workoutExercises.map((e) => e.exerciseId))])
        ).map((e) => [e.id, e]),
      );

      const exercises: WorkoutSummaryExercise[] = workoutExercises.map((we) => {
        const bestSet = bestSetOf(we.sets);
        return {
          workoutExerciseId: we.id,
          exerciseId: we.exerciseId,
          exerciseName: catalog.get(we.exerciseId)?.name ?? '',
          completedSets: completedSets(we.sets).length,
          totalSets: we.sets.length,
          volumeKg: volumeOf(we.sets),
          skipped: we.skipped,
          ...(bestSet ? { bestSet } : {}),
        };
      });

      // Personal records vs. everything that started before this workout.
      const personalRecords: PersonalRecord[] = [];
      const exerciseIds = [...new Set(workoutExercises.map((e) => e.exerciseId))];
      for (const exerciseId of exerciseIds) {
        const current = workoutExercises
          .filter((e) => e.exerciseId === exerciseId)
          .flatMap((e) => e.sets);
        const history = await repos.workouts.getExerciseHistory(exerciseId, {
          excludeWorkoutId: workoutId,
          includeInProgress: true,
        });
        const previous = history
          .filter((h) => h.workout.startedAt < workout.startedAt)
          .flatMap((h) => completedSets(h.sets));
        if (previous.length === 0) continue;
        const exerciseName = catalog.get(exerciseId)?.name ?? '';
        const checks = [
          { type: 'weight' as const, now: maxWeightOf(current), before: maxWeightOf(previous) },
          { type: 'e1rm' as const, now: maxE1rmOf(current), before: maxE1rmOf(previous) },
        ];
        for (const c of checks) {
          if (c.now > c.before) {
            personalRecords.push({
              exerciseId,
              exerciseName,
              type: c.type,
              valueKg: c.now,
              previousKg: c.before,
            });
          }
        }
      }

      return {
        workout,
        durationSeconds: durationSeconds(workout.startedAt, workoutEnd(workout)),
        completedSets: completedSets(sets).length,
        totalSets: sets.length,
        volumeKg: volumeOf(sets),
        exerciseCount: exercises.filter((e) => e.completedSets > 0).length,
        exercises,
        personalRecords,
      };
    },

    async getRecentWorkouts(limit) {
      if (!(limit > 0)) return [];
      const finished = await repos.workouts.listFinished({ limit: Math.floor(limit) });
      const items: WorkoutListItem[] = [];
      for (const w of finished) {
        const detail = await requireWorkout(w.id);
        const sets = allSets(detail);
        items.push({
          workout: w,
          durationSeconds: durationSeconds(w.startedAt, workoutEnd(w)),
          volumeKg: volumeOf(sets),
          completedSets: completedSets(sets).length,
        });
      }
      return items;
    },

    async getExerciseProgress(exerciseId) {
      const history = await repos.workouts.getExerciseHistory(exerciseId);
      const points: ExerciseProgressPoint[] = [];
      for (const entry of [...history].reverse()) {
        const done = completedSets(entry.sets);
        if (done.length === 0) continue;
        points.push({
          workoutId: entry.workout.id,
          date: entry.workout.startedAt,
          bestWeightKg: maxWeightOf(done),
          bestE1rmKg: maxE1rmOf(done),
          volumeKg: volumeOf(done),
          sets: done,
        });
      }
      return points;
    },

    async getWeeklyStats(weeks) {
      const count = Math.floor(weeks);
      if (!(count > 0)) return [];
      const current = weekStartOf(clock());
      const starts: Date[] = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(current);
        d.setDate(d.getDate() - 7 * i);
        starts.push(d);
      }
      const stats = new Map<number, WeeklyStat>(
        starts.map((d) => [d.getTime(), { weekStart: d.toISOString(), workouts: 0, volumeKg: 0 }]),
      );
      const oldest = starts[0];
      if (!oldest) return [];
      const finished = await repos.workouts.listFinished({ since: oldest.toISOString() });
      for (const w of finished) {
        const stat = stats.get(weekStartOf(new Date(w.startedAt)).getTime());
        if (!stat) continue;
        stat.workouts += 1;
        stat.volumeKg += volumeOf(allSets(await requireWorkout(w.id)));
      }
      return starts.flatMap((d) => {
        const s = stats.get(d.getTime());
        return s ? [s] : [];
      });
    },

    async exportAllData(opts) {
      return buildExportPayload(await repos.backup.snapshot(), nowIso(), opts?.appVersion);
    },

    async importAllData(payload) {
      const snapshot = parseImportPayload(payload, { seedCreatedAt: nowIso() });
      await repos.backup.restore(snapshot);
      return importResultOf(snapshot);
    },
  };
};
