import { expect, test } from '@playwright/test';
import { PassportJourneyPage } from './pages/PassportJourneyPage';

const showcase = process.env.CICO_E2E_MODE === 'showcase';
const runtime = process.env.CICO_E2E_MODE === 'runtime';

test('completes Passport onboarding, then creates a choice-free simulated receipt', async ({
  page,
}) => {
  // A clean Linux runner cold-loads the Midnight WASM/runtime graph before this
  // longest journey. Keep retries disabled, but give the full path enough time
  // to exercise onboarding, credential issuance, voting, and the receipt.
  test.setTimeout(120_000);
  test.skip(showcase, 'The deployed public artifact uses the live Passport showcase path.');
  const journey = new PassportJourneyPage(page);

  await journey.open();
  await journey.connectDemoPassport();
  await journey.issueSyntheticCredential();
  await expect(journey.credentialHeading).toBeVisible();
  await journey.openDashboard();
  await expect(page.getByRole('tab', { name: /World|Mundo/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await journey.openConsultationAndVote();
  await journey.submitSimulatedReceipt();

  await expect(journey.receiptHeading).toBeVisible();
  await expect(journey.receiptId).toBeVisible();
  await expect(page.getByText(/No representa una transacción/i)).toBeVisible();
});

test('ends credential onboarding before scope, ballot, proving, or receipts', async ({ page }) => {
  test.skip(showcase, 'The deployed public artifact uses the live Passport showcase path.');
  const journey = new PassportJourneyPage(page);

  await journey.open();
  await journey.connectDemoPassport();
  await journey.issueSyntheticCredential();
  await expect(journey.credentialHeading).toBeVisible();
  await expect(page.getByText(/Scope|Alcance|Elegí tu respuesta|proof|prueba local/i)).toHaveCount(
    0,
  );
  await journey.openDashboard();
  await expect(page.getByRole('heading', { name: 'Consultas para vos' })).toBeVisible();
});

test('keeps the bilingual journey accessible and unclipped at all jury widths', async ({
  page,
}) => {
  test.skip(showcase, 'The deployed public artifact uses the live Passport showcase path.');

  const expectNoHorizontalOverflow = async () => {
    const metrics = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  };

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('cico-locale', 'es');
  });
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto('/');
  for (const locale of ['en', 'es'] as const) {
    await page.getByRole('combobox', { name: /Language|Idioma/i }).selectOption(locale);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: width < 768 ? 720 : 900 });
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expectNoHorizontalOverflow();
      const cta = page.getByRole('button', { name: /Comenzar|Get started/i });
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      await cta.focus();
      const focusVisible = await cta.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
      });
      expect(focusVisible).toBe(true);
      const semanticIssues = await page.evaluate(() => {
        const issues: string[] = [];
        if (!document.documentElement.lang) issues.push('missing html lang');
        if (document.querySelectorAll('main').length !== 1) issues.push('main landmark count');
        const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
        if (new Set(ids).size !== ids.length) issues.push('duplicate ids');
        for (const control of document.querySelectorAll('button, a, input, select')) {
          const name =
            control.getAttribute('aria-label') ??
            control.getAttribute('title') ??
            control.textContent?.trim() ??
            '';
          if (!name && !(control instanceof HTMLInputElement && control.labels?.length)) {
            issues.push(`unnamed ${control.tagName.toLowerCase()}`);
          }
        }
        return issues;
      });
      expect(semanticIssues).toEqual([]);
    }
  }
});

test('never contacts configured runtime services in demo mode', async ({ page }) => {
  test.skip(showcase, 'Covered by the stricter deployed-showcase boundary test.');
  const localAppOrigins = new Set([
    new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin,
  ]);
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const loopbackRuntime =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      !localAppOrigins.has(url.origin);
    const privateServiceRoute =
      /^\/(?:keys|balance|submit)(?:\/|$)/u.test(url.pathname) ||
      url.pathname.includes('/v1/rarimo/');
    if (loopbackRuntime || privateServiceRoute) forbiddenRequests.push(request.url());
  });

  const journey = new PassportJourneyPage(page);
  await journey.open();
  await journey.connectDemoPassport();
  await journey.issueSyntheticCredential();
  await expect(journey.credentialHeading).toBeVisible();
  expect(forbiddenRequests).toEqual([]);
});

test('wallet approval appears only at the live-action boundary and groups duplicate connectors', async ({
  page,
}) => {
  test.skip(showcase, 'Wallet runtime is intentionally disabled in the public showcase.');
  test.skip(
    !runtime,
    'Set CICO_E2E_MODE=runtime against a runtime-enabled Undeployed or Preview build.',
  );

  await page.addInitScript(() => {
    const calls: string[] = [];
    const createWallet = (id: string, icon: string) => ({
      name: id === 'first' ? 'First Wallet' : 'Second Wallet',
      apiVersion: '4.0.1',
      icon,
      rdns: 'com.example.shared-wallet',
      connect: async (networkId: string) => {
        calls.push(`${id}:${networkId}`);
        return {
          hintUsage: async () => undefined,
          getConnectionStatus: async () => ({ status: 'connected', networkId }),
          getConfiguration: async () => ({
            indexerUri: 'http://127.0.0.1:8088/api/v4/graphql',
            indexerWsUri: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
            substrateNodeUri: 'http://127.0.0.1:9944',
            networkId,
          }),
          getShieldedAddresses: async () => ({
            shieldedAddress: `mn_shield_${id}`,
            shieldedCoinPublicKey: `coin_${id}`,
            shieldedEncryptionPublicKey: `enc_${id}`,
          }),
          getDustBalance: async () => ({ balance: 0n, cap: 0n }),
        };
      },
    });

    window.midnight = {
      first: createWallet('first', 'javascript:alert(1)'),
      second: createWallet('second', 'https://wallet.example/icon.png'),
    } as typeof window.midnight;
    Object.defineProperty(window, '__walletConnectCalls', {
      configurable: true,
      value: calls,
    });
  });

  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Wallet' })).toHaveCount(0);
  await page.getByRole('button', { name: /Get started/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.getByRole('button', { name: /Use demo Passport/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.getByRole('button', { name: /Prepare credential/i }).click();
  await page.getByRole('button', { name: /Use this country/i }).click();
  await page.getByRole('button', { name: /Go to civic dashboard/i }).click();
  const openCard = page
    .locator('article.dashboard-poll-card')
    .filter({ has: page.getByRole('button', { name: 'Votá ahora' }) })
    .first();
  await openCard.getByRole('button', { name: /Leer propuesta/i }).click();
  await page.getByRole('button', { name: 'Votar esta consulta' }).click();
  await page.getByRole('button', { name: /^Sí/ }).click();
  await page.getByRole('button', { name: /Revisar mi voto/i }).click();
  await expect(page.getByRole('button', { name: 'Conectar wallet Midnight' })).toBeVisible();
  await page.getByRole('button', { name: 'Conectar wallet Midnight' }).click();
  await expect(page.getByRole('dialog', { name: 'Elegir wallet Midnight' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/comparten un identificador/i);
  await expect(page.getByRole('button', { name: /2 conexiones/i })).toBeVisible();
  await page.getByRole('button', { name: /2 conexiones/i }).click();
  await page.getByRole('button', { name: /conexión 2/i }).click();
  await expect(page.getByText('Second Wallet', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desconectar wallet' })).toBeVisible();
});

test('completes the deployed showcase without contacting private runtimes', async ({ page }) => {
  test.skip(!showcase, 'Only runs against the prebuilt public showcase artifact.');
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const privateRuntime =
      /^\/(?:keys|balance|submit)(?:\/|$)/u.test(url.pathname) ||
      url.pathname.includes('/v1/rarimo/') ||
      ['6300', '9944', '8088'].includes(url.port);
    if (privateRuntime) forbiddenRequests.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Wallet' })).toHaveCount(0);
  await expect(page.getByText('LIVE PASSPORT')).toBeVisible();
  await expect(page.getByText('PROVIDER-OWNED')).toBeVisible();
  await page.getByRole('button', { name: /Get started/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page.getByRole('button', { name: /Explore without connecting/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Use demo Passport/i })).toHaveCount(0);
  await expect(page.getByText(/credential provider|gateway|emisor/i)).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
});

test('keeps the deployed showcase within the viewport at 320px and 390px', async ({ page }) => {
  test.skip(!showcase, 'Only runs against the prebuilt public showcase artifact.');
  const expectNoHorizontalOverflow = async () => {
    const metrics = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  };

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Wallet' })).toHaveCount(0);
    await expectNoHorizontalOverflow();
    await page.getByRole('button', { name: /Get started/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByRole('button', { name: /Explore without connecting/i })).toHaveCount(0);
    await expectNoHorizontalOverflow();
  }
});

test('completes the Passport popup handshake with a real browser WindowProxy', async ({
  page,
  context,
}) => {
  test.skip(!showcase, 'Only runs against the prebuilt public showcase artifact.');

  const relyingPartyOrigin = new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin;
  await context.route('https://midnightpassport.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <html><body><script>
          const query = new URLSearchParams(location.search);
          const requestId = query.get('passportRequestId');
          const nonce = query.get('passportNonce');
          const openerOrigin = ${JSON.stringify(relyingPartyOrigin)};
          window.opener.postMessage({
            protocol: 'org.midnight.passport.profile/v1',
            type: 'passport.profile.ready',
            requestId,
            nonce,
          }, openerOrigin);
          window.addEventListener('message', (event) => {
            if (event.origin !== openerOrigin || event.data?.type !== 'passport.profile.request') return;
            window.opener.postMessage({
              protocol: 'org.midnight.passport.profile/v1',
              type: 'passport.profile.response',
              requestId,
              nonce,
              approved: true,
              profile: { displayName: 'popup.passport' },
            }, openerOrigin);
          });
        </script></body></html>`,
    });
  });

  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Get started/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Continue with Passport/i }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(page.getByText('popup.passport')).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Prepare a credential, not a vote' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Prepare credential/i })).toBeVisible();
  await popup.close();
});
