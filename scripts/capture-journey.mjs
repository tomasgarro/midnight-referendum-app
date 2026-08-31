/*
 * Captures one PNG per screen of the citizen journey.
 *
 * This exists so a UX change can be reviewed as a sequence of screens rather
 * than as a diff, and so "the journey is six screens" is a claim someone can
 * check rather than take on trust.
 *
 * Usage:
 *   npm run dev -- --mode demo --port 5198 --strictPort   (in another shell)
 *   node scripts/capture-journey.mjs [baseUrl] [outDir]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE_URL = process.argv[2] ?? 'http://localhost:5198';
const OUT_DIR = process.argv[3] ?? path.join('qa', 'journey-20260831');
const VIEWPORT = { width: 390, height: 844 };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  let index = 0;
  const shot = async (name) => {
    index += 1;
    // The mascot PNGs are lazy-loaded; without this the hero is blank in the
    // first frame of every screen that has one.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              }),
          ),
      );
    });
    // Let the progress bar and the success stagger settle.
    await page.waitForTimeout(700);
    const file = path.join(OUT_DIR, `${String(index).padStart(2, '0')}-${name}.png`);
    // Viewport, not fullPage: the app is a fixed-height shell whose <main>
    // scrolls internally, so a full-page capture invents a tall frame padded
    // with root canvas that nobody ever sees.
    await page.screenshot({ path: file });
    // Where the screen runs past one viewport, capture the bottom too rather
    // than pretending the fold does not exist.
    const scroller = page.locator('.app-shell main, .app-shell .sys-screen__body').first();
    const overflows = await scroller
      .evaluate((node) => node.scrollHeight - node.clientHeight > 24)
      .catch(() => false);
    if (overflows) {
      await scroller.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await page.waitForTimeout(350);
      const tail = path.join(OUT_DIR, `${String(index).padStart(2, '0')}-${name}-scrolled.png`);
      await page.screenshot({ path: tail });
      await scroller.evaluate((node) => {
        node.scrollTop = 0;
      });
      console.log(`captured ${tail}`);
    }
    console.log(`captured ${file}`);
  };

  const click = async (name) => {
    await page.getByRole('button', { name }).first().click();
    await page.waitForTimeout(400);
  };

  await page.goto(BASE_URL);
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.getByRole('heading', { name: /Demostrá que podés votar/ }).waitFor();

  await shot('welcome');
  await click(/Comenzar/);
  await shot('privacy');
  await click(/Continuar/);
  await shot('passport-consent');
  await click(/Usar Passport de demo/);
  await shot('consent-return');
  await click(/Continuar/);
  await shot('eligibility-country');
  await click(/Crear mi credencial/);
  await shot('credential-ready');
  await click(/Ver las consultas/);
  await shot('dashboard');

  await page
    .getByRole('button', { name: /Votá ahora/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  await shot('vote-choose');
  await click(/^Sí/);
  await click(/Revisar mi voto/);
  await shot('vote-review');
  await click(/Crear comprobante simulado/);
  await shot('vote-receipt');
  await click(/Ver mi comprobante/);
  await shot('profile');

  await page.getByRole('button', { name: /Explorá/ }).click();
  await page.waitForTimeout(400);
  await shot('explore');

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
