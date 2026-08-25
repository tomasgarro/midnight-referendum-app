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
