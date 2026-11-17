# Contratos

La fuente de verdad son los tipos en `packages/core/src/contracts/` (`entities.ts`, `repositories.ts`,
`services.ts`). Solo el orquestador los modifica, en PRs propios. Si necesitás un cambio, pedilo.

## Convenciones

- ids: strings opacos (UUID v4 generado localmente).
- Fechas: strings ISO 8601 UTC.
- Pesos: siempre en kg. La conversión a lb es de presentación (front).
- Entidades: opcionales ausentes = `undefined` (nunca `null`).
- Patches: clave ausente = no cambiar; `null` = borrar el campo opcional.
- Toda mutación se persiste antes de resolver la promesa (retomar entrenamiento tras cerrar la app).
- `ownerId` y `createdBy` = `LOCAL_USER_ID` (`"local-user"`) en V1; los completa la implementación.
- ids desconocidos → `NotFoundError`; reglas de negocio violadas → `ValidationError`.

## Capas

- `Repositories` (`exercises`, `routines`, `workouts`, `settings`, `backup`): persistencia pura.
  Implementaciones: en memoria (B1) y SQLite (B2) con driver inyectable.
- `DomainServices` (`createDomainServices(repos, { now })`): lógica sobre los repos (B3/B4).
- e1RM: Epley `w × (1 + reps/30)`; con 1 rep, e1RM = peso.

## Exports públicos esperados de `@gym/core`

- Todo `contracts`.
- `createInMemoryRepositories(options?: { seed?: boolean }): Repositories` (B1).
- `createSqliteRepositories(driver)` + adaptador expo-sqlite (B2).
- `createDomainServices` (B3), `EXERCISE_SEED`, `epley`, `kgToLb`/`lbToKg` (B1/B3).
- `MUSCLE_GROUP_LABELS` (es-AR) para la UI.

## v2 · Ajustes UX (2026-11-17)

**Entidades**

- `PlannedExercise`: `repsMode: 'same' | 'perSet'` y `plannedSets: PlannedSet[]` **reemplazan** `sets` + `reps`.
  `PlannedSet = { reps: string }`, con un `load` **reservado y comentado** para la V4 (no se lee ni se escribe en V1).
  Con `repsMode: 'same'` todas las series tienen las mismas reps.
- `PlannedExercise.restSeconds`: entero 0..600, múltiplo de 15. **`0` = "Sin descanso"** (no aparece la barra
  de descanso); sin valor = la app usa su default (2:00).
- `WorkoutExercise.plannedSetReps: string[]`: snapshot de las reps por serie al empezar. Una serie agregada de
  más usa el último valor como placeholder. `plannedSets` (número) y `plannedReps` (resumen) se mantienen.
- `Exercise`: `updatedAt` (obligatorio), `secondaryMuscleGroups?`, `notes?` (cues, se muestran en
  Entrenando), `archived?`. Los campos "(propuesta)" `trackingType` y `unilateral` **no** existen todavía.
- Constantes: `NAME_MAX_LENGTH = 40`, `EXERCISE_NAME_MAX_LENGTH = 60`, `MAX_PLANNED_SETS = 20`,
  `MAX_REST_SECONDS = 600`, `REST_STEP_SECONDS = 15`, `REPS_MODES`.

**Validación (ValidationError)**

- Nombres de rutina y día: `trim()`, no vacíos, máximo 40 caracteres.
- Nombre de ejercicio propio: `trim()`, no vacío, máximo 60.
- Plan: 1..20 series, reps no vacías (se normalizan), con `'same'` todas iguales, descanso según la regla de
  arriba.

**Repos**

- `exercises.list` excluye archivados (salvo `includeArchived`) y acepta `customOnly` (chip "Propios").
  `getById`/`getByIds` devuelven también archivados (el historial los necesita).
- `exercises.update` (con los campos nuevos, sube `updatedAt`) y **`exercises.archive`**. `exercises.delete`
  de un ejercicio propio ya usado **lo archiva** y devuelve `'archived'`; si no se usó, lo borra y devuelve
  `'deleted'`. Los del catálogo no se editan, archivan ni borran.
- `NewPlannedExerciseInput` y `PlannedExercisePatch` usan `repsMode` / `plannedSets`. Default: 3 × "10".
- `NewWorkoutInput.exercises[].plannedSetReps`.

**Export/import**: `EXPORT_VERSION = 2`. `importAllData` sigue aceptando archivos v1 y los convierte (misma
regla que la migración).

**Migración de datos (SQLite)**: cada `PlannedExercise` existente pasa a `repsMode = 'same'` y `plannedSets` =
`sets` copias de `reps`. Un `restSeconds` viejo que no sea múltiplo de 15 se redondea al múltiplo más cercano
(y se limita a 600). Cada `WorkoutExercise` existente recibe `plannedSetReps` = `plannedSets` copias de
`plannedReps`. Cada `Exercise` recibe `updatedAt = createdAt`. Nada de lo cargado se pierde.

**Helpers que exporta `@gym/core`** (puros, para que front y back usen la misma regla)

- `normalizeReps(input: string): string` — trim, mayúsculas, sin espacios alrededor de "-" ("8 - 10" → "8-10").
- `plannedRepsToNumber(reps: string): number | null` — número si `reps` es un entero (`"10"` → 10); `null` para
  rangos y AMRAP. Es la regla del ✓: con `null` la serie no se completa sola.
- `summarizePlannedSets(pe)` — "4 × 8-10" (igual en todas) o "5 · 3 · 1 · AMRAP" (por serie).
- `plannedRepsForSet(plannedSetReps, setIndex)` — reps planificadas de una serie (repite la última si sobra).

## Historial de cambios

- v1 (M0): contrato inicial. Agregados respecto del brief: `WorkoutExercise.skipped`, `restSeconds` y
  `notes` (snapshot), `Settings.restTimerEnabled`, `BackupRepo`, `Routine.updatedAt` ya estaba.
- v2 (Ajustes UX, 2026-11-17): plan por serie (`repsMode`, `plannedSets`), `plannedSetReps`, ejercicios
  editables/archivables, export v2.
