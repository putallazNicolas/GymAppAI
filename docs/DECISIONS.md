# Decisiones tomadas sin consultar

Formato: fecha — decisión — motivo.

- 2026-10-15 — Expo SDK 57 (última estable en npm), RN 0.86, React 19.2.3, TypeScript 6. — "Última versión estable del SDK".
- 2026-10-15 — `gh` sin auth en el entorno: se usan las herramientas GitHub MCP de la sesión para PRs. — Restricción del entorno.
- 2026-10-15 — Sin acceso a docs.expo.dev ni exp.host desde el entorno: `expo-doctor` local falla 2 checks de red; en CI (con red) corre completo. — Restricción del entorno.
- 2026-10-15 — `overrides` en el package.json raíz para fijar `react`/`react-dom` 19.2.3 y `react-native-worklets` 0.10.1. — npm instalaba duplicados por peer deps (expo-doctor lo marcaba).
- 2026-10-15 — Rutas de expo-router en `apps/mobile/src/app/`, alias `@/` → `src/`. — Convención del template SDK 57.
- 2026-10-15 — Timestamps como ISO strings; pesos siempre en kg. — Legibles en el export JSON; un solo origen de verdad.
- 2026-10-15 — Agregado `WorkoutExercise.skipped`, snapshot de `restSeconds`/`notes` en WorkoutExercise y `Settings.restTimerEnabled`. — Necesarios para "saltar ejercicio" y el temporizador sin depender de la rutina (que puede cambiar).
- 2026-10-15 — Agregado `BackupRepo` (snapshot/restore). — Export/import necesita acceso crudo a todas las tablas.
- 2026-10-15 — `startWorkoutFromDay` precarga `weightKg` en las series (desde el rendimiento anterior); reps quedan vacías. — Persiste lo precargado, sobrevive cierres de la app.
- 2026-10-15 — Seed de ejercicios se entrega en B1 (no B4), B4 queda para export/import + seed en SQLite. — El front necesita el catálogo para F2.
- 2026-10-15 — Orden de back: B1 (memoria) → B3 (servicios) → B2 (SQLite) → B4. — Los servicios se escriben contra interfaces; así F3 tiene servicios reales antes.
- 2026-10-15 — Un PR de un primer día ("PR") solo se reporta si existía historial previo del ejercicio. — Evita que la primera sesión llene el resumen de PRs.
- 2026-10-15 — Subagentes lanzados con `isolation: "remote"` (modelo sonnet); PRs se revisan/mergean con las herramientas GitHub MCP. — Disponible en la sesión.
