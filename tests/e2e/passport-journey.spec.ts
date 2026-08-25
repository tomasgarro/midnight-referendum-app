import { expect, test } from '@playwright/test';
import { PassportJourneyPage } from './pages/PassportJourneyPage';

test('completes the Passport-first local journey with a choice-free receipt', async ({ page }) => {
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
  const journey = new PassportJourneyPage(page);
  await journey.open();
  await journey.grantDemoConsent();
  await journey.continueToEnrollment();
  await journey.issueSyntheticCredential();
  await expect(journey.syntheticCredentialLabel).toBeVisible();
});

test('never contacts configured runtime services in demo mode', async ({ page }) => {
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
