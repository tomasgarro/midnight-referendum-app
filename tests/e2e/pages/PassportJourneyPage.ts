import type { Locator, Page } from '@playwright/test';

export class PassportJourneyPage {
  readonly openJourneyButton: Locator;
  readonly journeyHeading: Locator;
  readonly syntheticCredentialLabel: Locator;
  readonly receiptHeading: Locator;
  readonly receiptId: Locator;
  readonly privateChoiceCopy: Locator;

  constructor(private readonly page: Page) {
    this.openJourneyButton = page.getByRole('button', {
      name: /Abrir recorrido Passport v2/i,
    });
    this.journeyHeading = page.getByRole('heading', {
      name: 'Una credencial, muchas consultas',
    });
    this.syntheticCredentialLabel = page.getByText('SYNTHETIC DEMO CREDENTIAL');
    this.receiptHeading = page.getByRole('heading', {
      name: 'Tu comprobante no revela tu elección',
    });
    this.receiptId = page.getByText('demo-tx-cico-2026-0001');
    this.privateChoiceCopy = page.getByText('Tu elección y su relación con tu identidad.');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.openJourneyButton.click();
    await this.journeyHeading.waitFor();
  }

  async grantDemoConsent(): Promise<void> {
    await this.page.getByRole('button', { name: /Dar consentimiento de demo/i }).click();
  }

  async continueToEnrollment(): Promise<void> {
    await this.page.getByRole('button', { name: /Continuar al enrolamiento local/i }).click();
  }

  async issueSyntheticCredential(): Promise<void> {
    await this.page.getByRole('button', { name: /Ejecutar fixture local/i }).click();
    await this.syntheticCredentialLabel.waitFor();
  }

  async continueToScope(): Promise<void> {
    await this.page.getByRole('button', { name: /Elegir alcance/i }).click();
  }

  async chooseCountryReferendum(): Promise<void> {
    await this.page.getByRole('button', { name: /Mi país · Argentina/i }).click();
  }

  async chooseYesAndReview(): Promise<void> {
    await this.page.getByRole('button', { name: /^Sí/ }).click();
    await this.page.getByRole('button', { name: /Revisar compromiso/i }).click();
  }

  async submitAndConfirm(): Promise<void> {
    await this.page.getByRole('button', { name: /Preparar prueba local/i }).click();
    await this.page.getByRole('button', { name: /Enviar prueba al relayer demo/i }).click();
    await this.page.getByRole('button', { name: /Esperar confirmación del indexer/i }).click();
    await this.page.getByRole('button', { name: /Ver comprobante confirmado/i }).click();
    await this.receiptHeading.waitFor();
  }
}
