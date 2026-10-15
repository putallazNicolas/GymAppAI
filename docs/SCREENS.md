# Pantallas — fuente de verdad del front

> Copia fiel de la especificación del dueño del producto. Las partes marcadas **(propuesta)** no fueron
> decididas por el dueño: implementalas simples y quedan registradas en `DECISIONS.md`.

## Navegación

Tabs inferiores **Hoy · Rutinas · Progreso · Perfil**. **Entrenando** abre a pantalla completa, fuera de los
tabs. **Resumen** aparece al finalizar el entrenamiento.

## Estilo

- Tema oscuro por defecto y **verde** como color de "completado".
- Objetivos táctiles grandes (se usa con las manos ocupadas en el gimnasio). Mínimo 48×48 pt; acciones
  principales ≥ 56 pt de alto.
- Tokens de diseño centralizados en un archivo de tema (`apps/mobile/src/theme/`).
- Cada pantalla tiene **estado vacío**, **estado de carga** y **estado de error**.
- UI en español rioplatense (voseo: "Elegí", "Agregá"). Código en inglés.
- Pesos: se guardan siempre en kg; se muestran en la unidad elegida en Perfil (kg/lb).

## 4.1 Hoy (home)

- Fecha y saludo.
- Card "Entrenamiento de hoy" con el día sugerido de la rutina activa (nombre del día y lista corta de
  ejercicios), botón grande **Empezar** y un link **"Elegir otro día"**.
- Si hay un entrenamiento sin finalizar, un banner **"Continuar entrenamiento"** arriba de todo.
- Últimos 3 entrenamientos (fecha, día, duración, volumen). Al tocar uno se ve su resumen.
- Estado vacío (sin rutinas): CTA **"Armá tu primera rutina"** que lleva a Armar rutina.

## 4.2 Entrenando (entrenamiento activo) — decisiones CERRADAS

- Header: nombre del día, cronómetro de tiempo transcurrido y botón **Finalizar**.
- Lista de ejercicios en orden. El ejercicio actual va expandido y muestra:
  - El nombre y lo planificado (por ejemplo "4 × 8-10").
  - Todas sus series a la vez, una fila por serie: `# | Anterior | Kg | Reps | ✓`.
  - "Anterior" es lo que se hizo en esa serie la última vez.
  - Kg viene precargado con el valor anterior o con la serie previa. Reps muestra lo planificado como
    placeholder.
  - Teclado numérico: `decimal-pad` para kg y `number-pad` para reps.
- Botón de check compacto por fila. **NO** va un botón grande de "Cargar serie".
- Al tocar ✓: la fila queda verde, se guarda al instante y el foco avanza automáticamente a la siguiente
  serie.
- Cuando se completan todas las series, el ejercicio colapsa a un título verde con ✓ y se expande el
  siguiente. Tocar un ejercicio colapsado lo vuelve a abrir para editarlo.
- Menú por ejercicio: agregar serie, quitar serie y saltar ejercicio.
- **(propuesta)** Si el ejercicio tiene `restSeconds`, después del ✓ aparece un temporizador de descanso no
  bloqueante (barra con cuenta regresiva que se puede descartar).
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

- Nombre editable.
- Lista de días. Se reordenan con botones ↑/↓ (sin librerías de drag & drop), se agregan y se eliminan.
- Al tocar un día se abre Armar día.
- Toggle **"Rutina activa"**.

## 4.6 Armar día

- Nombre del día (por ejemplo "Piernas A").
- Lista de ejercicios planificados. Para cada uno: nombre, series (número), reps y descanso (opcional, en
  segundos), notas (opcional), reordenar ↑/↓ y eliminar.
  - Reps es un **INPUT DE TEXTO**, no numérico, para aceptar rangos como "8-10" o "AMRAP".
- Botón **"Agregar ejercicio"**, que abre Elegir ejercicio.

## 4.7 Elegir ejercicio

- Buscador, chips de filtro por grupo muscular y lista.
- Selección múltiple con el botón **"Agregar (N)"**.
- **"Crear ejercicio"** (nombre y grupo muscular) para ejercicios personalizados.
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
- Versión de la app.

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
