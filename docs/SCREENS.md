# Pantallas — fuente de verdad del front

> Copia fiel de la especificación del dueño del producto. Las partes marcadas **(propuesta)** no fueron
> decididas por el dueño: implementalas simples y quedan registradas en `DECISIONS.md`.

## Navegación

Tabs inferiores **Hoy · Rutinas · Progreso · Perfil**. **Entrenando** abre a pantalla completa, fuera de los
tabs. **Resumen** aparece al finalizar el entrenamiento.

Pantallas de stack (Armar rutina, Armar día, Elegir ejercicio, Crear/Editar ejercicio, Elegir día, Resumen):
header nativo con **solo el chevron** de atrás, en hueso, sin texto ni título en la barra (`design/L5`, opción
A). El título grande vive en el contenido, 8 pt debajo de la barra. Las acciones del header van a la derecha.
Las hojas de edición no llevan este header.

## Estilo

- Tema oscuro por defecto y **verde** como color de "completado".
- Objetivos táctiles grandes (se usa con las manos ocupadas en el gimnasio). Mínimo 48×48 pt; acciones
  principales ≥ 56 pt de alto.
- Tokens de diseño centralizados en un archivo de tema (`apps/mobile/src/theme/`).
- Cada pantalla tiene **estado vacío**, **estado de carga** y **estado de error**.
- UI en español rioplatense (voseo: "Elegí", "Agregá"). Código en inglés.
- Pesos: se guardan siempre en kg; se muestran en la unidad elegida en Perfil (kg/lb).

## 4.1 Hoy (home)

- Header (`design/L4`, opción B): la K de Kalk (`KalkMark crop`, hueso, 22 pt, no se toca) + un filete fino +
  la fecha en la misma línea; abajo, el saludo como título. Igual en el estado vacío. (El "SEMANA 1/4" de P01
  sigue fuera de V1.)
- Card "Entrenamiento de hoy" con el día sugerido de la rutina activa (nombre del día y lista corta de
  ejercicios), botón grande **Empezar** y un link **"Elegir otro día"**.
- Si hay un entrenamiento sin finalizar, un banner **"Continuar entrenamiento"** arriba de todo.
- Últimos 3 entrenamientos (fecha, día, duración, volumen). Al tocar uno se ve su resumen.
- Estado vacío (sin rutinas): CTA **"Armá tu primera rutina"** que lleva a Armar rutina. Frase: "Armá tu
  primera rutina y **Kalk** te sugiere qué entrenar cada día."

## 4.2 Entrenando (entrenamiento activo) — decisiones CERRADAS

- Header: nombre del día, cronómetro de tiempo transcurrido y botón **Finalizar**.
- Lista de ejercicios en orden. El ejercicio actual va expandido y muestra:
  - El nombre y lo planificado (por ejemplo "4 × 8-10").
  - Todas sus series a la vez, una fila por serie: `# | Anterior | Kg | Reps | ✓`.
  - "Anterior" es lo que se hizo en esa serie la última vez.
  - Kg viene precargado con el valor anterior o con la serie previa. Reps muestra como placeholder **lo
    planificado para esa serie** (`plannedSetReps[i]`; una serie agregada de más repite el último valor). Si
    no es numérico (AMRAP), el placeholder va a 16 pt. _(Ajustes UX, `design/P03b`.)_
  - Las notas del ejercicio (cues) se muestran en la card del ejercicio actual.
  - Teclado numérico: `decimal-pad` para kg y `number-pad` para reps.
- Botón de check compacto por fila. **NO** va un botón grande de "Cargar serie".
- ✓ con las reps vacías: si lo planificado para esa serie es un número, se carga ese número. Si es un rango
  ("8-10") o AMRAP, **no se completa**: el campo de reps tiembla (2 × 240 ms), recibe el foco y vibra con un
  aviso (`notificationAsync(Warning)`). _(Decisión del dueño al aprobar el diseño de Ajustes UX.)_
- Al tocar ✓: la fila queda verde, se guarda al instante, **se cierra el teclado** y el foco avanza
  automáticamente a la siguiente serie **de forma visual** (marco naranja, sin abrir el teclado; tocar el
  campo lo abre). _(Decisión del dueño, 2026-10-15.)_
- Cuando se completan todas las series, el ejercicio colapsa a un título verde con ✓ y se expande el
  siguiente. Tocar un ejercicio colapsado lo vuelve a abrir para editarlo.
- Menú por ejercicio: agregar serie, quitar serie y saltar ejercicio.
- Después de **cada** ✓ aparece abajo la barra de descanso no bloqueante (como en `design/P03`): cuenta
  regresiva de `restSeconds` del ejercicio o **2:00 por defecto** si no tiene, "+15 s", descartable. Si el
  ejercicio tiene `restSeconds = 0` ("Sin descanso"), no aparece.
  Se puede apagar en Perfil ("Temporizador de descanso"). _(Decisión del dueño, 2026-10-15.)_
- Pantalla siempre encendida mientras se entrena (`expo-keep-awake`).
- Finalizar: si quedan series sin completar, se confirma con un diálogo. Después va al Resumen.

## 4.3 Resumen post-entreno

- Duración, series completadas, volumen total y cantidad de ejercicios.
- Lista de ejercicios con su mejor serie.
- PRs nuevos destacados (peso máximo o e1RM), si hay.
- Campo de notas y botón **"Guardar y volver"**, que lleva a Hoy.

## 4.4 Mis rutinas (tab Rutinas)

- Lista de rutinas con su nombre, cantidad de días y un indicador de activa.
- Al tocar una se abre Armar rutina.
- Botón **"Nueva rutina"**.
- Menú por rutina: marcar como activa, duplicar, archivar y eliminar (con confirmación).

## 4.5 Armar rutina

- Nombre editable con **`EditableTitle`** (`design/P06b`, `P06c`): se ve como un campo (caja, label "NOMBRE DE
  LA RUTINA", lápiz); al tocarlo pasa a edición (borde accent de 2 px, botón **"Listo"**). Se guarda **una sola
  vez** al terminar de editar (Listo, "done" del teclado o salir del campo). `trim()`, máximo 40 caracteres;
  si queda vacío se restaura el nombre anterior y se avisa abajo, sin diálogo ("El nombre no puede quedar
  vacío. Dejamos «…»."). Ayuda debajo: "Tocá el nombre para cambiarlo".
- Lista de días. Se reordenan con botones ↑/↓ (sin librerías de drag & drop), se agregan y se eliminan.
- "Agregar día" abre el día nuevo con el título enfocado y el texto seleccionado.
- Al tocar un día se abre Armar día.
- Toggle **"Rutina activa"**.

## 4.6 Armar día

- Nombre del día con el mismo `EditableTitle` (label "DÍA N · NOMBRE", placeholder "Nombre del día", ayuda
  "Ej.: Piernas A, Torso B, Empuje" mientras está vacío).
- Lista de ejercicios planificados **cerrada** (`design/P07b`, `PlannedExerciseRow`): número, nombre, resumen
  ("4 × 8-10", o "5 · 3 · 1 · AMRAP" + tag POR SERIE), descanso (m:ss o "Sin descanso") y la nota. Solo ↑/↓
  apilados en la fila; **no hay inputs ni tacho en la fila**.
- **Se edita en una hoja** (`design/P07c`, `P07c2`), no en la fila: tocar la fila abre la hoja (en iOS, una
  page sheet nativa: `presentation: 'modal'`) con:
  - Series con `Stepper` grande arriba, en los dos modos (mantener apretado repite). En "Igual en todas", el
    "N ×" al lado de las reps lleva a ese stepper. En "Por serie", debajo de la última fila, "Quitar serie"
    (saca la última) y "Agregar serie" (copia la última).
  - `RepsModeToggle`: **"Igual en todas"** / **"Por serie"**. En "Por serie", una `PlannedSetRow` por serie
    con stepper chico de reps (también editable como texto) y la celda CARGA punteada, reservada y sin
    función.
  - Reps: **presets primero** (5 · 6-8 · 8-10 · 10-12 · 12-15 · 15-20 · AMRAP), **teclado después** (solo si
    tocás el número), con barra propia sobre el teclado (`RepsKeyboardBar`): "AMRAP", "–" y "Siguiente". Solo
    aparece con el foco en un campo de reps; sin la barra, el campo usa el teclado con puntuación. Al salir del campo se
    normaliza (trim, mayúsculas, "8 - 10" → "8-10"); si queda vacío vuelve al valor anterior. Reps sigue
    siendo texto: acepta "8-10" y "AMRAP".
  - Descanso con **`RestPicker`** (`design/P07d`): **presets + ±15 s, sin rueda**. Rango 0 a 600 s en pasos de
    15; "Sin descanso" se guarda como 0.
  - Notas (opcional).
  - **"Quitar del día"** va dentro de la hoja.
  - Cada cambio se persiste al instante.
- Botón **"Agregar ejercicio"**, que abre Elegir ejercicio.

## 4.7 Elegir ejercicio

- Buscador, chips de filtro por grupo muscular y lista.
- Selección múltiple con el botón **"Agregar (N)"**.
- **Crear ejercicio progresivo** (`design/P08b`, `CreateExerciseScreen`, pantalla modal): nombre + grupo
  muscular y ya se puede guardar (botón Guardar fijo abajo, deshabilitado hasta que sea válido). El resto
  (grupos secundarios, equipo, notas) va dentro de **"Más detalles"**, cerrado por defecto. Los campos
  marcados "(propuesta)" en el diseño (tipo de registro, unilateral) **no se implementan** todavía.
- Al guardar, el ejercicio nuevo queda **preseleccionado y resaltado** en la lista, y aparece un toast con la
  acción **"Editar"** (`design/P08c`).
- Ejercicios propios (`design/P08c`): tag **"PROPIO"**, menú ⋯ (Editar / Eliminar) y chip de filtro
  **"Propios"**. Editar usa la misma pantalla de crear. Eliminar uno que ya se usó lo **archiva** (deja de
  aparecer) en vez de borrarlo.
- El catálogo inicial viene del seed del back: unos 60 ejercicios comunes en español.

## 4.8 Progreso

- Selector de ejercicio y un gráfico del mejor peso y del e1RM por sesión a lo largo del tiempo (con
  `react-native-svg`, simple).
- Historial de sesiones de ese ejercicio.
- **(propuesta)** Resumen general: entrenamientos por semana y volumen semanal.
- Estados vacíos claros.

## 4.9 Perfil

- Unidad (kg/lb). Internamente se guarda todo en kg.
- Aviso visible: **"Tus datos se guardan solo en este teléfono. Si borrás la app, se pierden. Exportalos
  seguido."**
- Botón **"Exportar datos"**: genera un JSON y abre el share sheet (`expo-file-system` + `expo-sharing`).
- **(propuesta)** "Importar datos" desde un JSON.
- Debajo del botón de importar: "Se exporta kalk-backup-AAAA-MM-DD.json".
- Bloque **"Acerca de Kalk"** (`design/L4`, propuesta aprobada): solo el ícono a color de 80 pt (sin wordmark),
  "Tu planilla de fuerza, sin papel. / Tus datos quedan en este teléfono." y "Kalk 1.0.0 (12)" en una línea
  (`expo-application` en un build; en Expo Go, la versión de `app.json` sin número de build).

## Carga de la app

- Mientras cargan las fuentes y SQLite: `BrandSplash`, réplica exacta del splash nativo (fondo `brand.ink`, la K de
  120 × 120 centrada). Oculta el splash nativo en su primer layout. Si tarda más de 1,5 s, "Preparando tus
  datos…". Al terminar, la K escala a 0,9 y se desvanece (200 ms) y la app entra con fundido subiendo 8 pt
  (280 ms, 80 ms después). Con Reduce Motion, solo fundido de 150 ms. Si falla, el error va sobre el mismo fondo.

## Rutas sugeridas (expo-router, `apps/mobile/src/app/`)

| Ruta                     | Pantalla                                 |
| ------------------------ | ---------------------------------------- |
| `(tabs)/index`           | Hoy                                      |
| `(tabs)/rutinas`         | Mis rutinas                              |
| `(tabs)/progreso`        | Progreso                                 |
| `(tabs)/perfil`          | Perfil                                   |
| `rutina/[routineId]`     | Armar rutina                             |
| `rutina/dia/[dayId]`     | Armar día                                |
| `elegir-ejercicio`       | Elegir ejercicio (modal; param `dayId`)  |
| `elegir-dia`             | Elegir otro día (modal)                  |
| `entrenando/[workoutId]` | Entrenando (pantalla completa, sin tabs) |
| `resumen/[workoutId]`    | Resumen                                  |
