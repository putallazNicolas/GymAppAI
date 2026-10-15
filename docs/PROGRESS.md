# Progreso

## Reporte para la mañana (2026-10-15)

### Qué funciona

Todos los milestones de la V1 están mergeados en `main` con CI verde (typecheck, lint, formato, 198
tests de `packages/core`, `expo-doctor` y bundle de iOS).

- **Datos locales en SQLite** (`expo-sqlite`): migraciones versionadas, seed de 68 ejercicios en
  español, cada cambio se guarda al instante. Si cerrás la app en medio de un entrenamiento, al
  volver aparece "Continuar entrenamiento".
- **Hoy**: día sugerido de la rutina activa (rota al siguiente del último entrenado), Empezar /
  Elegir otro día, banner de entrenamiento en curso, últimos 3 entrenamientos.
- **Rutinas**: crear, renombrar, activar, duplicar, archivar, eliminar; días con ↑/↓; ejercicios
  planificados con series, reps en texto ("8-10", "AMRAP"), descanso y notas; buscador de ejercicios
  con filtros por grupo y creación de ejercicios propios.
- **Entrenando** (4.2): filas `# | Anterior | Kg | Reps | ✓`, kg precargado, ✓ guarda y avanza el
  foco, el ejercicio colapsa en verde al terminar, menú agregar/quitar serie y saltar, temporizador de
  descanso descartable, pantalla siempre encendida, confirmación al finalizar con series pendientes.
- **Resumen**: duración, series, volumen, ejercicios, mejor serie y PRs (peso y e1RM Epley), notas.
- **Progreso**: gráfico de mejor peso y e1RM por sesión, historial por ejercicio, entrenamientos y
  volumen por semana.
- **Perfil**: kg/lb (internamente todo en kg), aviso de datos locales, exportar JSON (share sheet),
  importar JSON con validación completa, versión de la app.

### Cómo probarlo (Windows + iPhone)

1. Instalá Expo Go en el iPhone (App Store).
2. En la PC: `git clone https://github.com/putallazNicolas/GymAppAI && cd GymAppAI && npm install`.
3. `cd apps/mobile && npx expo start` (si el iPhone no está en la misma red Wi-Fi que la PC, usá
   `npx expo start --tunnel`).
4. Escaneá el QR con la cámara del iPhone → se abre en Expo Go.

Tests del back: `npm test` desde la raíz.

### Qué conviene probar a mano en el iPhone (no se pudo desde la nube)

Nada se ejecutó en un dispositivo real: todo se verificó con typecheck, lint, tests y compilando el
bundle de iOS. Prioridades:

1. Flujo completo: Armá tu primera rutina → agregar día → agregar ejercicios → Empezar → completar
   series con ✓ (foco, colores, colapso) → Finalizar → Resumen → Guardar y volver.
2. Cerrar la app a mitad del entrenamiento y retomarla.
3. Teclados `decimal-pad`/`number-pad` y que el teclado no tape la fila activa (sobre todo la última serie del último ejercicio).
4. VoiceOver en tabs, filas de serie y ✓.
5. Exportar datos (share sheet) e importar ese mismo archivo.
6. Cambiar a lb y revisar Entrenando / Resumen / Progreso.

### Pendiente o con dudas

- Progreso agrupa "con historial" mirando los últimos 100 entrenamientos (rendimiento); ejercicios más viejos igual aparecen en el selector.
- Hoy se re-renderiza cada segundo mientras hay un entrenamiento en curso (cronómetro del banner).
- Orden de back cambiado (B3 antes que B2) y seed adelantado a B1 (ver DECISIONS).
- `expo-doctor` local falla 2 checks solo por falta de red en el entorno; en CI pasa completo.
- Sin "descartar entrenamiento" (no estaba en el spec): un entrenamiento empezado por error se
  finaliza igual.

### Decisiones que conviene revisar

Están todas en `docs/DECISIONS.md`. Las más relevantes para el producto:

- ✓ con reps vacías usa el primer número de lo planificado ("8-10" → 8).
- Un PR solo cuenta si supera todo lo anterior y existe historial previo del ejercicio.
- Semanas de lunes a domingo.
- Color primario azul; verde reservado para "completado".
- Catálogo de ejercicios no editable; solo los propios se editan/borran.

### Rediseño (dirección "A · Plataforma" de Claude Design)

**Estado:** todas las pantallas siguen el diseño: Hoy (P01/P02), Entrenando (P03), Resumen (P04),
Mis rutinas (P05), Armar rutina (P06), Armar día (P07), Elegir ejercicio (P08), Progreso (P09/P10) y
Perfil (P11), con los tokens de S1/S3, fuentes Barlow / Barlow Condensed, componentes de S2 y las
microinteracciones de S3 (reanimated + haptics, con fallback de movimiento reducido). El diseño está
copiado en `design/` y ESLint impide colores, tamaños y radios sueltos fuera de `src/theme/`.

**Cómo se verificó:** además de typecheck/lint/tests/bundle iOS, cada milestone se recorrió en el
navegador (build web de react-native-web) con Playwright en un viewport de iPhone 14 Pro (393×852),
comparando capturas con las artboards. `tools/web-preview/` tiene el servidor y un smoke test del flujo
completo. Para correrlo: `cd apps/mobile && npx expo export --platform web --output-dir ../../dist-web`,
`node tools/web-preview/serve.js "$PWD/dist-web" 8081` y `node tools/web-preview/smoke.cjs ./shots`.
La web es solo para probar: lo real es Expo Go en el iPhone.

**Choques diseño ↔ flujo (ganó `SCREENS.md`):**

- Placeholder de reps en Entrenando = reps planificadas (P03 usaba las de la última vez).
- Sin "SEMANA 1/4" en Hoy (periodización fuera de V1).
- Borrar día/ejercicio pide confirmación (el mockup no).
- Perfil muestra el aviso completo de datos locales (P11 lo acortaba).

**Bug encontrado probando en el navegador y corregido:** tocar ✓ rápido en varias series dejaba el
ejercicio sin colapsar (R2). También se corrigieron en el cierre la serie mostrada en el PR de peso del
Resumen y el formato de duración.

**No replicable en React Native (y qué se hizo):**

- Hover del gráfico (web) → cursor con arrastre (Gesture.Pan) y acciones de accesibilidad ajustables.
- `transform-origin` del menú → se emula con traslación.
- Halo de las "tres luces" y anillos del cursor → sombra (en Android no brilla) / círculos anidados.
- `text-transform: uppercase` en los campos de nombre puede no aplicarse en iOS nativo: el texto se
  guarda como se escribe.
- Las animaciones y gestos solo se vieron en web: **conviene mirarlos en el iPhone.**

| #                                                          | Milestone                            | Estado |
| ---------------------------------------------------------- | ------------------------------------ | ------ |
| —                                                          | M0 esqueleto (push directo a `main`) | ✅     |
| [#1](https://github.com/putallazNicolas/GymAppAI/pull/1)   | F1 tema, navegación y componentes    | ✅     |
| [#2](https://github.com/putallazNicolas/GymAppAI/pull/2)   | B1 repos en memoria + seed           | ✅     |
| [#3](https://github.com/putallazNicolas/GymAppAI/pull/3)   | Orquestador: ESLint `@/` + docs      | ✅     |
| [#4](https://github.com/putallazNicolas/GymAppAI/pull/4)   | F2 rutinas, días, elegir ejercicio   | ✅     |
| [#5](https://github.com/putallazNicolas/GymAppAI/pull/5)   | B3 servicios de dominio              | ✅     |
| [#6](https://github.com/putallazNicolas/GymAppAI/pull/6)   | Docs                                 | ✅     |
| [#7](https://github.com/putallazNicolas/GymAppAI/pull/7)   | B2 SQLite + migraciones              | ✅     |
| [#8](https://github.com/putallazNicolas/GymAppAI/pull/8)   | F3 Hoy, Entrenando, Resumen          | ✅     |
| [#9](https://github.com/putallazNicolas/GymAppAI/pull/9)   | B4 export/import endurecido          | ✅     |
| [#10](https://github.com/putallazNicolas/GymAppAI/pull/10) | Integración SQLite en la app         | ✅     |
| [#11](https://github.com/putallazNicolas/GymAppAI/pull/11) | F4 Progreso y Perfil                 | ✅     |
| [#12](https://github.com/putallazNicolas/GymAppAI/pull/12) | Test e2e del flujo completo          | ✅     |
| [#13](https://github.com/putallazNicolas/GymAppAI/pull/13) | F5 pulido y accesibilidad            | ✅     |
| [#14](https://github.com/putallazNicolas/GymAppAI/pull/14) | Reporte final y decisiones           | ✅     |
| [#15](https://github.com/putallazNicolas/GymAppAI/pull/15) | Importar diseño a `design/`          | ✅     |
| [#16](https://github.com/putallazNicolas/GymAppAI/pull/16) | R1 tokens, fuentes y componentes     | ✅     |
| [#17](https://github.com/putallazNicolas/GymAppAI/pull/17) | Vista web + smoke test Playwright    | ✅     |
| [#18](https://github.com/putallazNicolas/GymAppAI/pull/18) | R3 rutinas, día, elegir ejercicio    | ✅     |
| [#19](https://github.com/putallazNicolas/GymAppAI/pull/19) | R2 Hoy, Entrenando, Resumen          | ✅     |
| [#20](https://github.com/putallazNicolas/GymAppAI/pull/20) | R4 Progreso y Perfil                 | ✅     |
| (este)                                                     | Cierre del rediseño                  | ✅     |
