# Kalk

App para registrar entrenamientos de gimnasio (Expo + React Native + TypeScript). V1: un usuario, datos
guardados solo en el teléfono (SQLite).

- **Instalarla en el iPhone:** [docs/INSTALAR-EN-IPHONE.md](docs/INSTALAR-EN-IPHONE.md) (Expo Go gratis con
  EAS Update, o TestFlight con Apple Developer).
- **Estado del proyecto:** [docs/PROGRESS.md](docs/PROGRESS.md) · decisiones en
  [docs/DECISIONS.md](docs/DECISIONS.md) · pantallas en [docs/SCREENS.md](docs/SCREENS.md).
- **Probar en desarrollo:** `npm install` en la raíz, después `cd apps/mobile && npx expo start` y escaneá el
  QR con Expo Go.
- **Reglas para agentes:** [CLAUDE.md](CLAUDE.md).
- **Marca:** logo, ícono y splash en `apps/mobile/assets/brand/`; reglas de uso en `design/S5-Notas-Marca.dc.html`.
  Internamente el repo, el proyecto de EAS (`gym-app`), el bundle ID y la base (`gym-app.db`) conservan el
  nombre viejo a propósito.

Estructura: `apps/mobile` (app Expo, expo-router), `packages/core` (datos y lógica: SQLite, servicios,
export/import), `design/` (diseño de Claude Design), `docs/`.
