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

## Historial de cambios

- v1 (M0): contrato inicial. Agregados respecto del brief: `WorkoutExercise.skipped`, `restSeconds` y
  `notes` (snapshot), `Settings.restTimerEnabled`, `BackupRepo`, `Routine.updatedAt` ya estaba.
