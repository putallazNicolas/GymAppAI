# Progreso

## Hoy rediseñada: KALK arriba y titular (2026-11-19)

Opción 1 de `design/L5` (reemplaza a la B). **En Expo Go:** arriba de Hoy, "KΛLK" centrado en hueso; debajo un
titular que cambia: "HOY TOCA" + el día (con cuándo fue el último entreno y el PR de las últimas dos semanas, si
hay), "QUEDÓ A MEDIAS" si dejaste un entreno sin terminar (ahí el único botón naranja es "Continuar"), o
"PRIMER PASO" con la app vacía. A la derecha, "SEMANA x/N": entrenos de esta semana sobre los días de tu rutina.

## La K de Kalk en Hoy (2026-11-19)

Opción **B** de `design/L4` (la que eligió el dueño; reemplaza a la firma al pie de #43). **En Expo Go, sin
build:** en Hoy, con datos y vacía, a la izquierda de la fecha tiene que verse la K blanca hueso (sin naranja ni
baldosa), un filete gris fino y la fecha; abajo, el saludo grande como siempre (sin medidor semanal: queda
fuera de V1). Al final de Hoy ya no hay
firma. «Acerca de Kalk» y la carga no cambian.

## Marca Kalk (2026-11-18)

La app se llama **Kalk**. Logo B3 (K maciza) aprobado; integración según `design/S5` (PRs #40, #41 y #42).

**Qué cambió**

- **Nombre y config** (`app.json`): `name: "Kalk"`, `scheme: "kalk"`, ícono de iOS en tres apariencias (claro,
  oscuro, tintado), ícono adaptivo de Android, favicon y splash con la K (`imageWidth: 120`) sobre `#0B0B0C`
  (antes había un negro verdoso `#0B0F0D`). No cambian el `slug`, el bundle ID, el proyecto de EAS, los updates
  ni la base `gym-app.db`: tus datos siguen ahí.
- **Assets** en `apps/mobile/assets/brand/`; los viejos de `assets/images/` se borraron.
- **Componentes** `KalkWordmark` y `KalkMark` (SVG, nunca tipografía) y colores `brand.*` en el tema.
- **Hoy:** wordmark chico arriba, en hueso (también vacío). Frase nueva: "…y **Kalk** te sugiere qué entrenar
  cada día."
- **Perfil:** bloque "Acerca de Kalk" (ícono a color, wordmark, frase y versión) y "Se exporta
  kalk-backup-AAAA-MM-DD.json".
- **Carga:** réplica del splash dibujada en la app; si tarda más de 1,5 s, "Preparando tus datos…"; al terminar
  la K se achica y se va, y Hoy entra con un fundido.
- **Exportar** genera `kalk-backup-AAAA-MM-DD.json`. Los `gym-app-backup-….json` viejos se siguen importando.
- La marca **no** aparece en Entrenando, Resumen, la tab bar ni los headers de las otras pantallas.

**Lo que ya podés probar en Expo Go** (update de `preview`)

1. Hoy: el wordmark KΛLK arriba a la izquierda, chico y blanco hueso (sin naranja).
2. Perfil, abajo de todo: "Acerca de Kalk" con el ícono a color y la versión.
3. Al abrir la app: la K centrada y la transición a Hoy (la K se achica y se va, Hoy aparece subiendo un poco).
   Si cargar tarda, aparece "Preparando tus datos…".
4. Exportá desde Perfil: en la hoja de compartir el archivo se llama `kalk-backup-…json`. Importar un backup
   viejo (`gym-app-backup-…`) tiene que funcionar igual.

**Lo que necesita un build de preview** (Expo Go muestra su propio ícono y su splash)

- El ícono en la pantalla de inicio en claro, oscuro y tintado (mantené apretado el fondo → Editar → Personalizar).
- El splash nativo: que no haya salto de color ni de posición al pasar a la réplica.
- El nombre **Kalk** debajo del ícono.

Con la cuenta de Apple Developer, desde `apps/mobile` en la PC:

```powershell
npx eas-cli@latest device:create      # solo la primera vez: registra tu iPhone
npm run build:ios:preview             # = eas build --platform ios --profile preview
```

Detalle en `docs/INSTALAR-EN-IPHONE.md` → "Build de preview". Los agentes nunca corren `eas build`.

## Para probar en el iPhone (2026-11-17)

Arreglos de tres bugs que solo aparecían en iOS (PRs #38 y #39). Abrí el update más nuevo de `preview` en Expo
Go y probá:

1. **Nombre (bug "HELLO WORLd").** Renombrá una rutina y un día a "Hello world" con "Listo". El encabezado lo
   muestra en mayúsculas, pero al volver a tocarlo para editar tiene que decir "Hello world" tal cual.
   Mientras escribís se ve el texto real (minúsculas incluidas): es a propósito. Lo que ya quedó mal
   guardado, renombralo a mano.
2. **Hoja "Editar ejercicio".** Tocá un ejercicio del día. Arriba tienen que verse el nombre, "Listo" y el
   control de **Series** (− 3 +), sin franja vacía. Probá − y + (mantené apretado). En "Igual en todas", tocá
   el "3 ×" naranja: lleva al control de series. En "Por serie", usá "Agregar serie" y "Quitar serie" debajo
   de la lista. La hoja ahora ocupa toda la altura y se cierra deslizando hacia abajo o con "Listo".
3. **Descanso.** Desde la hoja, tocá Descanso: también abre como hoja completa; presets, ±15 s y "Sin
   descanso".
4. **Barra del teclado.** Tocá el número grande de reps (o una serie en "Por serie"): arriba del teclado
   numérico tiene que aparecer la barra **AMRAP · – · Siguiente**. Escribí "8", "–", "10" y tocá
   "Siguiente": pasa a la serie siguiente y la fila queda a la vista, no tapada por la barra. "AMRAP" carga
   AMRAP y cierra el teclado. En el campo de Notas la barra **no** aparece.

Si algo de esto falla, mandá una captura: el navegador no puede reproducir la hoja ni el teclado de iOS.

## Ajustes UX (2026-11-17)

Diseño aprobado en `design/` (P06b, P06c, P07b, P07c, P07c2, P07d, P08b, P08c, P03b, S4). PRs #29 (diseño + spec), #31
(parches de Expo), #32 (UF1), #30 (contratos v2, con UB1 #33 y UF2 #34 adentro), #35 (UF4) y #36 (UF3).

**Qué cambió en cada pantalla**

- **Día de rutina:** el nombre del día es un campo editable (se toca y se escribe; "Listo", tocar afuera o volver
  guarda). La lista de ejercicios queda cerrada: cada fila muestra el plan ("4 × 8-10", "5 · 3 · 1 · AMRAP", "Por
  serie") y el descanso; tocarla abre la hoja del ejercicio.
- **Hoja del ejercicio (nueva):** stepper de series (mantenido acelera), "Igual en todas" / "Por serie", reps con
  presets antes que teclado (8-10, AMRAP, …), en "Por serie" una fila por serie con ±, rangos o AMRAP y chips "Igualar
  a la serie 1", "Escalera −2", "5 · 3 · 1". La columna CARGA se ve pero queda reservada. Notas del ejercicio y
  "Quitar del día" están acá (ya no hay tacho al lado de las flechas).
- **Descanso (nueva hoja):** presets 0:45…5:00, ±15 s (mantenido acelera) y "Sin descanso" (no aparece la barra).
  Sin valor se muestra 2:00 atenuado, el default.
- **Elegir ejercicio:** "Crear ejercicio", chip "Propios", etiqueta PROPIO y menú ⋯ (Editar / Eliminar). Al guardar
  vuelve con el ejercicio preseleccionado y resaltado y un toast con "Editar". Eliminar uno ya usado lo archiva: deja
  de aparecer para agregar pero sigue en Progreso y en el historial.
- **Crear / editar ejercicio (nueva):** nombre + grupo; "Más detalles" abre equipo, músculos secundarios y notas o
  cues de técnica.
- **Entrenando:** placeholder de reps por serie (5, 3, 1, AMRAP), AMRAP a 16 pt, las cues debajo del nombre. ✓ con
  reps vacías: si el plan es un número lo carga; si es rango o AMRAP no completa la serie (el campo tiembla, toma el
  foco y vibra).

**El bug del título:** eran reales 3 de las 4 hipótesis: el doble guardado (`onSubmitEditing` + `onBlur` con un valor
viejo), el parpadeo al nombre anterior (se limpiaba el borrador antes de guardar) y el blur involuntario al
scrollear (`keyboardDismissMode="on-drag"`). La 3 (recarga pisando lo escrito) no ocurría así, pero quedó protegida.

**Cómo se migraron los datos:** la base pasa a la versión 2 al abrir la app, en una transacción. Cada ejercicio de
un día se convierte a una lista de series (`4 × "8 - 10"` → cuatro series "8-10"), con las reps normalizadas, las
vacías en "10", las series entre 1 y 20 y el descanso redondeado a pasos de 15 s (0 sigue siendo "Sin descanso";
uno positivo nunca pasa a 0). Los entrenamientos pasados no se tocan. Los backups viejos se importan convertidos.
Probado con datos reales de la versión anterior: Sentadilla 4 × "8 - 10" con 1:40 y nota pasó a 4 × 8-10 con 1:45 y
la nota intacta; el entrenamiento terminado siguió igual.

**Qué tenés que probar en el iPhone** (el navegador no lo puede validar):

- Las hojas: que abran a la altura correcta, que se cierren deslizando hacia abajo y que "Listo" guarde.
- El teclado numérico de reps con la barra de arriba (AMRAP, "–" para rangos, Siguiente).
- Mantener apretado ± en series, reps y descanso: que acelere y vibre suave.
- ✓ con un rango y reps vacías: que el campo tiemble, vibre y se abra el teclado en esa serie.
- El título del día: escribir y salir con "Listo", tocando afuera, scrolleando y con "atrás"; nunca debería
  volver al nombre viejo ni guardarse dos veces.
- Crear un ejercicio: el teclado en el formulario y el toast (que no tape el botón "Agregar").
- Nombres largos: que se corten con "…" sin romper las filas.

## SDK 58 (2026-11-17)

**Expo SDK 58** · React Native **0.88.1** · React 19.3 · TypeScript 6.0 · Node **26 LTS**. Versión de la app
**0.2.0**.

**Qué se rompió y cómo se arregló:** Expo Go de la App Store pasó a la SDK 58 y el proyecto estaba en la 57 ("Project
is incompatible with this version of Expo Go"). Se actualizó todo a SDK 58:

- refs con tipos de instancia por el TypeScript estricto de RN;
- la tab bar propia, adaptada a la nueva API de Expo Router;
- `File.write()`, que ahora es async (Exportar datos);
- `web.output: "single"` para la vista web.

El rediseño no cambió: el recorrido completo en el navegador (iPhone 393×852) da las mismas pantallas.

**Warnings:** 0 en typecheck, lint, tests, `expo export` (iOS y web), `expo-doctor` y el smoke test web. Quedan 2
avisos de `npm install` que no se pueden eliminar hoy (`eslint@9` y `glob@10`, por dependencias de terceros), ver
`DECISIONS.md`. Nuevo requisito permanente en `CLAUDE.md`: última tecnología, dependencias al día y cero warnings.

**Qué tenés que hacer:** actualizá **Expo Go** desde el App Store. Cuando el workflow publique el update (sale solo
al mergear), abrí expo.dev → gym-app → Updates → el update más nuevo de `preview` → **Preview** y escaneá el QR. Si
algún día vuelve a decir "incompatible", es otro salto de SDK: ver `docs/INSTALAR-EN-IPHONE.md` (A5).

## Para instalar en el iPhone (2026-11-16)

Guía completa: [INSTALAR-EN-IPHONE.md](INSTALAR-EN-IPHONE.md).

**Lo que tenés que correr una sola vez en la PC** (desde la raíz del repo):

```powershell
npm i -g eas-cli
eas login
cd apps/mobile
eas init                 # crea el proyecto en tu cuenta y agrega el projectId a app.json
eas update:configure     # agrega updates.url a app.json
git add app.json eas.json; git commit -m "chore: link EAS project"; git push
npm run update:preview   # primer update → abrilo en Expo Go desde expo.dev → Updates → Preview (QR)
```

Después, creá un token en expo.dev/settings/access-tokens y cargalo en GitHub como secret `EXPO_TOKEN`.

**Qué queda automatizado:** cada merge a `main` con CI verde dispara el workflow **EAS Update (preview)**,
que publica un update al branch `preview`. La próxima vez que abrís la app en Expo Go, tenés la versión
nueva. Sin `EXPO_TOKEN`, el workflow se saltea y queda en verde. Para TestFlight (con Apple Developer):
`npm run build:ios` y `npm run submit:ios` desde `apps/mobile`.

**Decisiones:**

- `runtimeVersion` usa la política `appVersion`: Expo Go la acepta desde el SDK 49 y sirve también para los
  builds reales (el runtime es la `version` de `app.json`). Si cambia una dependencia nativa, hay que subir
  `version` y hacer un build nuevo.
- Bundle ID / package `com.putallaznicolas.gymapp`. El número de build lo maneja EAS
  (`appVersionSource: "remote"`, `autoIncrement` en producción).
- No se inventó ningún `projectId`, Apple ID ni credencial: los genera tu cuenta (`eas init`, primer
  `eas build`). En `eas.json` → `submit.production.ios` hay dos valores `COMPLETAR_…` para cuando tengas App
  Store Connect.

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
