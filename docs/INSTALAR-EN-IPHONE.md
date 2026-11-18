# Instalar Kalk en el iPhone (sin Mac y sin la PC prendida)

Hay dos caminos. El repo ya está preparado para los dos. El proyecto en expo.dev se sigue llamando
**gym-app** (el `slug` no cambia con el nombre Kalk):

- **Parte A · Expo Go (gratis, ya):** la app se publica en los servidores de Expo con EAS Update y la abrís
  desde Expo Go. Cada vez que se mergea un PR en `main`, GitHub publica la versión nueva solo.
- **Parte B · TestFlight (más adelante):** un build real de la app, instalado desde TestFlight. Necesita
  la cuenta paga de Apple Developer.

Todos los comandos se corren en la PC con Windows (PowerShell o la terminal de VS Code), con **Node.js 26
LTS** instalado (la versión está fijada en `.nvmrc`) y el repo clonado.

---

## Parte A · Expo Go (gratis)

### A1. Configuración (una sola vez, desde la PC)

1. Instalá la CLI de EAS y entrá con tu cuenta de Expo (si no tenés, creala gratis en
   [expo.dev](https://expo.dev/signup)):

   ```powershell
   npm i -g eas-cli
   eas login
   ```

2. Desde la carpeta de la app, creá el proyecto en tu cuenta de Expo y configurá EAS Update:

   ```powershell
   cd apps/mobile
   eas init
   eas update:configure
   ```

   - `eas init` crea el proyecto en expo.dev y agrega solo el `extra.eas.projectId` (y el `owner`) en
     `apps/mobile/app.json`. **No lo escribas a mano.**
   - `eas update:configure` agrega `updates.url` (`https://u.expo.dev/<projectId>`) en `app.json`. La
     política de `runtimeVersion` ya está configurada (`appVersion`); si te pregunta, conservala.

3. Commiteá esos cambios y subilos, por PR o como trabajes habitualmente:

   ```powershell
   git add app.json eas.json
   git commit -m "chore: link EAS project"
   git push
   ```

4. Publicá el primer update:

   ```powershell
   npm run update:preview
   ```

   Esto sube el JavaScript de la app al branch `preview` de EAS Update.

### A2. Que se publique solo en cada merge (`EXPO_TOKEN`)

1. Entrá a [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) y tocá
   **Create token**. Ponele un nombre (por ejemplo `github-gymapp`) y copiá el token.
2. En GitHub, andá al repo → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**.
3. Nombre: `EXPO_TOKEN`. Valor: el token que copiaste. Guardalo.

Listo. Desde ahora, cada vez que se mergea un PR en `main` y el CI pasa (typecheck, lint, tests y bundle
de iOS), el workflow **EAS Update (preview)** publica un update nuevo en el branch `preview`. Sin el
secret, ese workflow se saltea solo y no pone nada en rojo.

### A3. Abrir la app en el iPhone

1. Instalá **Expo Go** desde el App Store y entrá con la **misma cuenta de Expo**.
2. En la PC, abrí [expo.dev](https://expo.dev) → tu proyecto **gym-app** → **Updates**. Elegí el último
   update del branch `preview` y tocá **Preview**: aparece un código QR.
3. Escaneá el QR con la cámara del iPhone y se abre en Expo Go.
4. A partir de ahí, la app queda en el historial de Expo Go ("Recently opened"): la abrís desde ahí, sin la
   PC. Para traer la última versión publicada, volvé a abrirla desde la página del update (o escaneá el QR
   del update más nuevo).

### A4. Advertencias

- **Tus datos viven dentro de Expo Go.** Si borrás Expo Go (o sus datos), se pierden. Usá **Perfil →
  Exportar datos** seguido y guardá el archivo (por ejemplo en iCloud Drive).
- **Tené Expo Go actualizado.** La versión de la App Store solo abre proyectos de la **última SDK** de Expo.
  El proyecto está en la SDK 58.
- En Expo Go la app no tiene ícono propio en la pantalla de inicio: se abre desde Expo Go.

### A5. Si Expo Go dice "Project is incompatible with this version of Expo Go"

Eso significa que Expo publicó una SDK nueva, el App Store actualizó Expo Go y el proyecto quedó en la
anterior. **No se arregla en el teléfono:** hay que actualizar el proyecto a la SDK nueva (es la tarea "Actualizar a
la última versión de Expo SDK", la misma que llevó el proyecto a la SDK 58). Una vez mergeada, el workflow publica
solo un update nuevo en `preview`.

Para volver a abrir la app después de una actualización:

1. Actualizá Expo Go desde el App Store.
2. En [expo.dev](https://expo.dev) → **gym-app** → **Updates**, abrí el update **más nuevo** del branch
   `preview` (debe decir la SDK nueva) y tocá **Preview**.
3. Escaneá el QR con la cámara del iPhone. Si Expo Go abre una versión vieja desde el historial, cerrala y
   volvé a escanear el QR del update nuevo.
4. Tus datos siguen ahí si no borraste Expo Go. Igual, exportalos antes de actualizar, por las dudas.

---

## Parte B · TestFlight (con Apple Developer)

Un build real se instala como cualquier app, con su ícono, y no depende de Expo Go. EAS compila en la nube,
así que **no hace falta una Mac**.

1. **Inscribite en el Apple Developer Program** (pago anual) en
   [developer.apple.com/programs](https://developer.apple.com/programs/) con tu Apple ID. La aprobación
   puede tardar uno o dos días.
2. **Compilá la app para iOS:**

   ```powershell
   cd apps/mobile
   npm run build:ios
   ```

   La primera vez te pide entrar con tu Apple ID: EAS crea solo el certificado, el perfil de
   aprovisionamiento y el registro de la app (bundle ID `com.putallaznicolas.gymapp`). El número de build
   se incrementa solo en cada build de producción.

3. **Subila a App Store Connect / TestFlight:**

   ```powershell
   npm run submit:ios
   ```

   Antes, completá en `apps/mobile/eas.json` (`submit.production.ios`) los dos valores que dicen
   `COMPLETAR_…`:
   - `appleId`: el email de tu Apple ID.
   - `ascAppId`: el **Apple ID** numérico de la app, que aparece en App Store Connect → tu app →
     **Información de la app**.

   Otra opción es borrar esas dos líneas y `eas submit` te las pregunta.

4. **Instalala desde TestFlight:** en [App Store Connect](https://appstoreconnect.apple.com) → tu app →
   **TestFlight** → **Testers internos**, agregate con tu Apple ID. En el iPhone instalá la app
   **TestFlight**, aceptá la invitación e instalá **Kalk**.
5. Los builds de producción usan el canal `production` de EAS Update. Para mandar cambios sin compilar de
   nuevo: `eas update --branch production --environment production --message "…"`. Si cambiaste
   dependencias nativas, subí `version` en `app.json` y hacé un build nuevo: ver "Decisiones" abajo.

### Build de preview: para ver el ícono, el splash y el nombre Kalk

Expo Go muestra su propio ícono y su splash: el ícono de Kalk (claro, oscuro y tintado), el splash nativo y el
nombre debajo del ícono solo se ven en un build. Con la cuenta de Apple Developer, desde `apps/mobile`:

```powershell
npx eas-cli@latest device:create      # solo la primera vez: registra tu iPhone (abrí el link en el iPhone)
npm run build:ios:preview             # = eas build --platform ios --profile preview
```

Cuando termina, EAS muestra un QR: escanealo con la cámara del iPhone e instalá la app. Ese build usa el canal
`preview`, así que después recibe solo los updates que publica el workflow.

### Antes de pasar de Expo Go a TestFlight: llevate tus datos

La app de TestFlight es otra app: **no ve los datos guardados dentro de Expo Go**.

1. En Expo Go: **Perfil → Exportar datos** y guardá el archivo `.json`.
2. En la app de TestFlight: **Perfil → Importar datos** y elegí ese archivo.

---

## Cómo funciona por dentro (decisiones)

- **`runtimeVersion: { "policy": "appVersion" }`**: la misma política sirve para Expo Go y para los builds
  reales. Expo Go abre updates con esta política desde el SDK 49 (es lo que `eas update:configure` pone por
  defecto en proyectos como este). En un build real, el runtime es la `version` de `app.json` (`0.1.0`):
  un update solo llega a los builds con la misma `version`. **Si agregás o cambiás una dependencia nativa,
  subí `version` y hacé un build nuevo**, porque si no, el update podría pedir código nativo que el build
  no tiene.
- **Canales:** `preview` (lo que publica el workflow en cada merge y abrís en Expo Go), `production` (builds
  de TestFlight) y `development` (para un development client en el futuro; hoy no hace falta).
- **`appVersionSource: "remote"`**: EAS guarda y sube solo el número de build (`buildNumber`), partiendo
  del `1` de `app.json`.
- **Monorepo:** `eas.json` está en `apps/mobile` y todos los comandos de EAS se corren desde ahí. El
  paquete `@gym/core` no necesita compilarse: Metro lee su TypeScript directo.
