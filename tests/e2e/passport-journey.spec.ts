import { expect, test } from '@playwright/test';
import { PassportJourneyPage } from './pages/PassportJourneyPage';

const showcase = process.env.CICO_E2E_MODE === 'showcase';

test('completes the Passport-first local journey with a choice-free receipt', async ({ page }) => {
  test.skip(showcase, 'The deployed public artifact uses the dedicated showcase journey.');
  const journey = new PassportJourneyPage(page);

  await journey.open();
  await expect(journey.journeyHeading).toBeVisible();

  await journey.grantDemoConsent();
  await journey.continueToEnrollment();
  await journey.issueSyntheticCredential();
  await expect(journey.syntheticCredentialLabel).toBeVisible();
  await journey.continueToScope();

  await journey.chooseCountryReferendum();
  await journey.chooseYesAndReview();
  await journey.submitAndConfirm();

  await expect(journey.receiptHeading).toBeVisible();
  await expect(journey.receiptId).toBeVisible();
  await expect(journey.privateChoiceCopy).toBeVisible();
});

test('labels the local credential as synthetic before voting', async ({ page }) => {
  test.skip(showcase, 'The deployed public artifact uses the dedicated showcase journey.');
  const journey = new PassportJourneyPage(page);
  await journey.open();
  await journey.grantDemoConsent();
  await journey.continueToEnrollment();
  await journey.issueSyntheticCredential();
  await expect(journey.syntheticCredentialLabel).toBeVisible();
});

test('never contacts configured runtime services in demo mode', async ({ page }) => {
  test.skip(showcase, 'Covered by the stricter deployed-showcase boundary test.');
  const localAppOrigins = new Set(['http://localhost:4173', 'http://127.0.0.1:4173']);
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const loopbackRuntime =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      !localAppOrigins.has(url.origin);
    const privateServiceRoute =
      /^\/(?:keys|balance|submit)(?:\/|$)/u.test(url.pathname) ||
      url.pathname.includes('/v1/rarimo/');
    if (loopbackRuntime || privateServiceRoute) {
      forbiddenRequests.push(request.url());
    }
  });

  const journey = new PassportJourneyPage(page);
  await journey.open();
  await journey.grantDemoConsent();
  await journey.continueToEnrollment();
  await journey.issueSyntheticCredential();

  await expect(journey.syntheticCredentialLabel).toBeVisible();
  expect(forbiddenRequests).toEqual([]);
});

test('completes the bilingual deployed showcase without contacting private runtimes', async ({
  page,
}) => {
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
  await page.getByRole('button', { name: /Abrir recorrido Passport v2/i }).click();
  await expect(page.getByText('LIVE PASSPORT')).toBeVisible();
  await expect(page.getByText('SYNTHETIC CREDENTIAL')).toBeVisible();
  await expect(page.getByText('SIMULATED VOTE')).toBeVisible();
  await page.getByRole('button', { name: /Begin privacy walkthrough/i }).click();
  await page.getByRole('button', { name: /Explore without connecting/i }).click();
  await expect(page.getByText('Exploring anonymously')).toBeVisible();
  await page.getByRole('button', { name: /^Continue/i }).click();
  await page.getByRole('button', { name: /Create synthetic credential/i }).click();
  await page.getByRole('button', { name: /Explore global poll/i }).click();
  await page.getByRole('button', { name: /^Yes$/i }).click();
  await page.getByRole('button', { name: /Create simulated receipt/i }).click();
  await expect(page.getByRole('heading', { name: /receipt does not reveal/i })).toBeVisible();
  expect(forbiddenRequests).toEqual([]);
});
