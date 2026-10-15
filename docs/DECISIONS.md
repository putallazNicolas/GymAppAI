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
- 2026-10-15 — PRs se revisan y mergean con las herramientas GitHub MCP (gh sin auth). — Restricción del entorno.
- 2026-10-15 — `isolation: "remote"` no aisló a los subagentes: corrieron en el mismo checkout. Se los movió a worktrees propios (`/home/user/wt-back`, `/home/user/wt-front`); los próximos se lanzan con `isolation: "worktree"`. — Evitar commits mezclados entre front y back.
- 2026-10-15 — (F1) Tabs desde `expo-router/js-tabs` (el export de `expo-router` está deprecado en SDK 57). — API vigente.
- 2026-10-15 — (F1) Íconos con `expo-symbols` vía un registro semántico `Icon` (nombres iOS/Android). — Incluido en Expo Go, sin deps nuevas.
- 2026-10-15 — (F1) Color primario azul; verde reservado para "completado". — Que el verde signifique solo "hecho".
- 2026-10-15 — (F1) Formato numérico es-AR propio ("1.234 kg", "82,5 kg") en vez de `Intl`. — Hermes/Intl inconsistente entre plataformas.
- 2026-10-15 — (F1) Botón ✓ de 48 pt; fila de serie ≥ 56 pt. — Táctil grande sin ser un botón "Cargar serie".
- 2026-10-15 — ESLint resuelve el alias `@/` del mobile con `eslint-import-resolver-typescript`. — Pedido del agente de front.
- 2026-10-15 — (B1) Ejercicios del catálogo no se pueden editar ni borrar (`ValidationError`). — Mantener el seed estable.
- 2026-10-15 — (B1) `Routine.updatedAt` cambia con cualquier cambio en la rutina, sus días o ejercicios planificados; `setActive` no lo cambia. — Ordenar por "última edición" real.
- 2026-10-15 — (B1) Borrar rutina/día limpia `routineId`/`dayId` en entrenamientos pasados (se conservan con `dayNameSnapshot`). — No perder historial.
- 2026-10-15 — (B1) Validaciones: sets entero ≥ 1, reps no vacío, descanso entero ≥ 0, peso ≥ 0, reps de serie entero ≥ 0; nombres con trim. — Datos consistentes.
- 2026-10-15 — (B1) Seed de 68 ejercicios (no ~60). — Cubrir todos los grupos musculares.
- 2026-10-15 — (B1) Reglas de negocio puras en `packages/core/src/rules/` reutilizadas por memoria y SQLite. — Mismo comportamiento en ambas.
- 2026-10-15 — (F2) Menú por rutina como bottom sheet propio (Alert en Android admite solo 3 botones). — Las 4 acciones del spec.
- 2026-10-15 — (F2) "Agregar día" crea "Día N" y lo abre para renombrar. — Menos pasos.
- 2026-10-15 — (F2) Edición inválida al salir del campo vuelve al valor guardado; vaciar descanso/notas lo borra. — Nunca guardar datos inválidos.
- 2026-10-15 — (B3) PR solo si es estrictamente mejor que todo lo anterior (incluye entrenamientos en curso que empezaron antes); peso antes que e1RM. — Spec: "PRs nuevos".
- 2026-10-15 — (B3) Volumen, mejor serie y e1RM solo cuentan series completadas con peso y reps ≥ 1. — Evitar e1RM de series vacías.
- 2026-10-15 — (B3) Semanas de lunes a domingo en hora local, según `startedAt`. — Convención en Argentina.
- 2026-10-15 — (B3) `getPreviousPerformance` saltea sesiones sin series completadas. — "Anterior" debe mostrar algo útil.
