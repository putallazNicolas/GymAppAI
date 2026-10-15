/**
 * Web smoke test of the main flow on an iPhone-sized viewport (react-native-web build).
 * Usage (from repo root):
 *   cd apps/mobile && npx expo export --platform web --output-dir ../../dist-web && cd ../..
 *   node tools/web-preview/serve.js "$PWD/dist-web" 8081 &
 *   PLAYWRIGHT=/path/to/node_modules/playwright node tools/web-preview/smoke.cjs ./shots
 * Screenshots are written to the given folder. Fast ✓ taps are used on purpose.
 */
const { chromium, devices } = require(process.env.PLAYWRIGHT || 'playwright');
const out = process.argv[2] || 'shots';
require('fs').mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
  );
  const ctx = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    viewport: { width: 393, height: 852 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${n}.png` });
  };
  const button = (name) => page.getByRole('button', { name, exact: false }).first();
  let failed = false;
  try {
    await page.goto(process.env.URL || 'http://localhost:8081/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shot('01-hoy-vacio');
    await button('Armá tu primera rutina').click();
    await page.getByRole('textbox').first().fill('Fuerza 4 días');
    await page.getByRole('textbox').first().blur();
    await button('Agregar día').click();
    await page.getByRole('textbox').first().fill('Piernas A');
    await page.getByRole('textbox').first().blur();
    await button('Agregar ejercicio').click();
    await page.getByText('Sentadilla', { exact: true }).first().click();
    await page.getByText('Peso muerto rumano').first().click();
    await button('Agregar (2)').click();
    await shot('02-armar-dia');
    await page.goBack();
    await page.waitForTimeout(800);
    await page.getByRole('switch').first().click();
    await page.goBack();
    await page.waitForTimeout(800);
    await page.getByText('Hoy', { exact: true }).first().click();
    await shot('03-hoy');
    await button('Empezar').click();
    await shot('04-entrenando');
    await page
      .getByLabel(/Kg, serie 1/)
      .first()
      .fill('100');
    await page
      .getByLabel(/Rep.*serie 1/)
      .first()
      .fill('5');
    for (const n of [1, 2, 3]) {
      await page
        .getByRole('checkbox', { name: new RegExp(`serie ${n}\\b`) })
        .first()
        .click();
    }
    await shot('05-ejercicio-hecho');
    await page.getByRole('button', { name: 'Finalizar', exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Finalizar', exact: true }).last().click();
    await shot('06-resumen');
  } catch (e) {
    failed = true;
    errors.push('STEP FAILED: ' + e.message.split('\n')[0]);
    await shot('zz-fail');
  }
  console.log(errors.length ? errors.join('\n') : 'ok');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
