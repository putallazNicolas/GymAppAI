# Gym App — reglas para agentes

App Expo (React Native + TS) para registrar entrenamientos de gimnasio. V1: un usuario, sin login,
sin red, todo en SQLite local. Sin RPE, porcentajes ni periodización.

## Estructura (npm workspaces)

- `apps/mobile/` — FRONT: Expo + expo-router (`src/app/`), pantallas, componentes, tema.
- `packages/core/` — BACK: contratos, repos (memoria, SQLite), servicios de dominio, seed, export/import.
- `docs/` — `SCREENS.md` (spec de UI), `CONTRACTS.md`, `DECISIONS.md`, `PROGRESS.md`.

## Propiedad de carpetas

- Agente de front: solo `apps/mobile/`. Agente de back: solo `packages/core/` (salvo `src/contracts/`).
- `packages/core/src/contracts/` lo modifica SOLO el orquestador. Pedí cambios, no los hagas.
- El front importa solo desde `@gym/core` (nunca rutas internas).

## Restricciones duras

- Todo debe correr en **Expo Go**: solo módulos `expo-*` o libs JS puras / incluidas en Expo Go
  (ej. `react-native-svg`). Instalá con `npx expo install <pkg>` desde `apps/mobile`.
- Nunca `eas build` / `eas submit`. Nunca push a `main`, nunca `--force` sobre `main`.
- No desactivar CI ni tests.
- UI en español rioplatense (voseo). Código, nombres y commits en inglés.
- Datos: pesos en kg, fechas ISO, `ownerId`/`createdBy` = `"local-user"`.
- Cada mutación se persiste al instante (un entrenamiento se retoma si la app se cierra).

## Flujo

- Una rama por milestone: `back/<milestone>` o `front/<milestone>`. PRs chicos contra `main`.
- Antes de pushear: `npm run typecheck && npm run lint && npm run format:check && npm test`.
  Front además: `cd apps/mobile && npx expo export --platform ios`.
- Ambigüedad → decisión razonable + una línea en `docs/DECISIONS.md`.

## Requisitos permanentes

Valen para todas las tareas, incluidos los prompts que se les pasan a los subagentes.

- **Última tecnología:** siempre que sea posible, la última versión estable de Expo SDK, React Native,
  TypeScript, Node LTS y todas las dependencias. Expo Go de la App Store solo abre proyectos de la última
  SDK: quedarse atrás rompe la app en el iPhone.
- **Dependencias al día:** al empezar cualquier tarea grande, revisar `npm outdated` y actualizar lo que se
  pueda (con `npx expo install` para lo que gestiona Expo).
- **Cero warnings**, en la medida de lo posible, en todo: `npm install`, `tsc`, ESLint, tests, `expo-doctor`,
  `expo export`, los workflows de GitHub Actions y `eas update`. Se corrigen, no se silencian con flags
  (`--no-warnings`, `--loglevel=error`, `eslint-disable` en masa). Si uno no se puede eliminar (por ejemplo,
  viene de una dependencia de terceros sin arreglo), se documenta en `docs/DECISIONS.md`: cuál es, por qué no
  se puede eliminar y qué haría falta para sacarlo.
- **Nunca bajar de versión** para esquivar un problema sin anotarlo en `docs/DECISIONS.md`.
