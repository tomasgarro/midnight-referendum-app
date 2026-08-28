import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __cicoInjectFixtureSecret: boolean;
  }
}

const runRelayer = process.env.CICO_E2E_RELAYER === '1';
const fixtureSecretHex = process.env.CICO_E2E_FIXTURE_SECRET_HEX?.trim().toLowerCase() ?? '';
const hasFixtureSecret = /^[0-9a-f]{64}$/u.test(fixtureSecretHex);

test('submits a browser vote through the local sponsored relayer', async ({ page, context }) => {
  test.skip(!runRelayer, 'Set CICO_E2E_RELAYER=1 for the opt-in local chain lane.');
  test.skip(
    !hasFixtureSecret,
    'Set CICO_E2E_FIXTURE_SECRET_HEX to the ephemeral secret whose commitment was issued locally.',
  );

  await context.addInitScript({
    content: `
      window.__cicoInjectFixtureSecret = false;
      const fixtureSecretHex = ${JSON.stringify(fixtureSecretHex)};
      const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
      Object.defineProperty(crypto, 'getRandomValues', {
        configurable: true,
        value: function (array) {
          if (window.__cicoInjectFixtureSecret && array.byteLength === 32) {
            for (let index = 0; index < array.length; index += 1) {
              array[index] = Number.parseInt(
                fixtureSecretHex.slice(index * 2, index * 2 + 2),
                16,
              );
            }
            window.__cicoInjectFixtureSecret = false;
            return array;
          }
          return originalGetRandomValues(array);
        },
      });
    `,
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Votá ahora/i }).waitFor();
  await page.evaluate(() => {
    window.__cicoInjectFixtureSecret = true;
  });
  await page.getByRole('button', { name: /Votá ahora/i }).click();
  await page.getByRole('heading', { name: 'Antes de votar' }).waitFor();

  const validate = page.getByRole('button', { name: /Validar elegibilidad/i });
  await expect(validate).toBeEnabled({ timeout: 60_000 });
  await validate.click();
  await page.getByRole('heading', { name: 'Usá el documento de demostración' }).waitFor();
  await page.getByRole('button', { name: /Usar documento de demostración/i }).click();
  await page.getByRole('heading', { name: 'Listo, podés votar' }).waitFor();
  await page.getByRole('button', { name: /Continuar al voto/i }).click();
  await page.getByRole('button', { name: /^Sí/ }).click();
  await page.getByRole('button', { name: /Revisar mi voto/i }).click();
  await page.getByRole('heading', { name: 'Tu compromiso' }).waitFor();
  await page.getByRole('button', { name: /Confirmar compromiso en Undeployed local/i }).click();
  await page.getByRole('heading', { name: 'Preparando tu comprobante' }).waitFor();
  await page.getByRole('heading', { name: 'Gracias por participar' }).waitFor({ timeout: 180_000 });
  await expect(page.getByText('Comprobante Undeployed local')).toBeVisible();
});
