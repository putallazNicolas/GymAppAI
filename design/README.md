# Diseño · Dirección "A · Plataforma"

Copia del canvas de Claude Design **"Gym App Rediseño"**
(`https://claude.ai/artifact/GRHkNGiBdDzJVLgxnrFNec`, versión `1792031927-2d26`), para que los agentes
lo tengan en el repo. Cada `.dc.html` es HTML con CSS inline: los valores exactos (colores, tamaños,
pesos, radios, espaciados y textos) están ahí. Abrilos como texto; no hace falta renderizarlos.

## Fuentes de verdad

- **Visual** (colores, tipografía, espaciado, jerarquía, textos): este diseño.
- **Comportamiento y flujo**: `docs/SCREENS.md`. Si chocan, gana `SCREENS.md` (sobre todo 4.2,
  Entrenando, que está cerrado). Los choques se anotan en `docs/DECISIONS.md` y abajo.
- **Textos**: se copian tal cual del diseño, salvo que muestren algo fuera del alcance V1.

## Mapa de artboards

| Archivo                        | Pantalla                                                                                                         | Ruta en la app           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `P01-Hoy.dc.html`              | Hoy con datos + banner "Continuar entrenamiento"                                                                 | `(tabs)/index`           |
| `P02-Hoy-Vacio.dc.html`        | Hoy, estado vacío                                                                                                | `(tabs)/index`           |
| `P03-Entrenando.dc.html`       | Entrenando (prototipo interactivo, **referencia principal**; su `<script>` muestra la lógica de estados)         | `entrenando/[workoutId]` |
| `P04-Resumen.dc.html`          | Resumen con PR nuevo                                                                                             | `resumen/[workoutId]`    |
| `P05-Rutinas.dc.html`          | Mis rutinas, con el menú de rutina abierto                                                                       | `(tabs)/rutinas`         |
| `P06-Armar-Rutina.dc.html`     | Armar rutina                                                                                                     | `rutina/[routineId]`     |
| `P07-Armar-Dia.dc.html`        | Armar día                                                                                                        | `rutina/dia/[dayId]`     |
| `P08-Elegir-Ejercicio.dc.html` | Elegir ejercicio, selección múltiple                                                                             | `elegir-ejercicio`       |
| `P09-Progreso.dc.html`         | Progreso con datos (gráfico interactivo)                                                                         | `(tabs)/progreso`        |
| `P10-Progreso-Vacio.dc.html`   | Progreso, estado vacío                                                                                           | `(tabs)/progreso`        |
| `P11-Perfil.dc.html`           | Perfil                                                                                                           | `(tabs)/perfil`          |
| `S1-Tokens.dc.html`            | Tokens: color, tipografía, espaciado, radios, elevación                                                          | `src/theme/`             |
| `S2-Componentes.dc.html`       | Componentes: botones, card, inputs, fila de serie (estados), chip, tab bar, header, banner, vacío, diálogo, menú | `src/components/`        |
| `S3-Implementacion.dc.html`    | Notas para React Native: `theme.ts` listo, fuentes, dependencias, **tabla de microinteracciones**                | —                        |
| `Main.dc.html`                 | Exploración de Entrenando (referencia extra)                                                                     | —                        |
| `canvas.json`                  | Índice del canvas                                                                                                | —                        |

Las exploraciones B y C de la página "Direcciones" no se copiaron: no se usan.

## Reglas del sistema (resumen de S1 y S3)

- **Ningún hex, `rgba()`, `fontSize`, `lineHeight`, `letterSpacing`, `borderRadius` ni `fontWeight`
  literal fuera de `apps/mobile/src/theme/`.** ESLint lo controla (`no-restricted-syntax`).
- **Colores con significado:** verde (`success`) solo para lo completado; dorado (`record`) solo para
  PRs; naranja (`accent`) para la acción principal y el foco (una acción naranja llena por pantalla);
  `danger` siempre acompañado de ícono.
- **Texto sobre naranja, verde, dorado o rojo: siempre `onAccent` (#0B0B0C).** El blanco no llega a 4,5:1.
- **Tipografía:** Barlow Condensed (500/700/800) para números y títulos, con
  `fontVariant: ['tabular-nums']`; Barlow (400–800) para el resto. En RN cada peso es una familia:
  usá `fontFamily` (`BarlowCondensed_700Bold`, …), **nunca `fontWeight`**. Se cargan con
  `@expo-google-fonts/barlow-condensed` y `@expo-google-fonts/barlow`, con splash hasta que estén.
- **Espaciado** base 4 (xs 4 · sm 8 · md 12 · lg 16 margen lateral · xl 20 · xxl 24 · xxxl 32).
- **Radios:** sm 8 inputs · md 10 filas y check · lg 14 botones y cards · xl 16 card de ejercicio ·
  xxl 20 diálogos y descanso · pill.
- **Táctil:** ≥ 44 pt (hitSlop en íconos de 20 px); fila de serie 52 pt (56 en foco); CTA 56 pt.
- **Elevación:** e0 = `surface` + `border`; e1 = `surfaceRaised` + `borderRaised`; e2 (flotantes:
  descanso, menú, diálogo) = e1 + sombra 0/16/40 al 70 %.
- **Íconos:** de trazo, sin emojis; el ✓ con trazo grueso. SVG propios con `react-native-svg`
  (los paths están en las artboards) o `@expo/vector-icons`.
- **Animaciones:** tabla de S3 (duraciones, curvas y haptics) con `react-native-reanimated`; con
  `useReducedMotion()` solo fundidos de 150 ms.
- **Dependencias (todas en Expo Go):** `react-native-reanimated`, `react-native-gesture-handler`,
  `react-native-svg`, `expo-linear-gradient`, `expo-haptics`, `@expo-google-fonts/*`. Sin blur ni
  sombras de color; degradés solo verticales de dos stops.

## Choques diseño ↔ `SCREENS.md` (resueltos a favor del flujo)

1. **Placeholder de reps en Entrenando:** el prototipo P03 usa lo de la última vez; `SCREENS.md` 4.2
   dice "Reps muestra lo planificado como placeholder". → Placeholder = reps planificadas. Al ✓ con
   reps vacías se sigue usando el primer número de lo planificado (decisión F3).
2. **"SEMANA 1/4" en el header de Hoy (P01):** implica periodización por bloques, fuera de V1. → Se
   omite.
3. **"ÚLTIMAS 12 SEMANAS" en Progreso (P09):** sin choque; se usa `getWeeklyStats(12)`.
4. **Badge "PR" en vivo en una serie (P03):** no está en `SCREENS.md` pero no cambia el flujo; se
   calcula en el cliente con el mejor e1RM histórico (`getExerciseProgress`). Se implementa.
5. **Descanso con "+15 s", "A LA BARRA" y cierre a los 5 s:** amplía la propuesta de temporizador; se
   implementa tal cual el diseño (sigue siendo no bloqueante y descartable).
