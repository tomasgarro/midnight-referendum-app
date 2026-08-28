import type { Locator, Page } from '@playwright/test';

export class PassportJourneyPage {
  readonly openJourneyButton: Locator;
  readonly journeyHeading: Locator;
  readonly credentialHeading: Locator;
  readonly receiptHeading: Locator;
  readonly receiptId: Locator;

  constructor(private readonly page: Page) {
    this.openJourneyButton = page.getByRole('button', {
      name: /Comenzar|Get started/i,
    });
    this.journeyHeading = page.getByRole('heading', {
      name: /A clearer way to participate|Una forma más clara/i,
    });
    this.credentialHeading = page.getByRole('heading', { name: 'Your credential is ready' });
    this.receiptHeading = page.getByRole('heading', { name: 'Gracias por participar' });
    this.receiptId = page.getByText('demo-tx-cico-2026-0001');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.page.evaluate(() => window.sessionStorage.clear());
    await this.page.reload();
    await this.page.evaluate(async () => {
      await document.fonts.ready;
    });
    await this.journeyHeading.waitFor();
  }

  async connectDemoPassport(): Promise<void> {
    await this.openJourneyButton.click();
    await this.page.getByRole('button', { name: /Continue/i }).click();
    await this.page.getByRole('button', { name: /Use demo Passport/i }).click();
    await this.page.getByRole('button', { name: /Continue/i }).click();
  }

  async issueSyntheticCredential(): Promise<void> {
    await this.page.getByRole('button', { name: /Prepare credential/i }).click();
    await this.page.getByRole('button', { name: /Use this country/i }).click();
    await this.credentialHeading.waitFor();
  }

  async openDashboard(): Promise<void> {
    await this.page.getByRole('button', { name: /Go to civic dashboard/i }).click();
    await this.page.getByRole('heading', { name: 'Consultas para vos' }).waitFor();
  }

  async openConsultationAndVote(): Promise<void> {
    const openCard = this.page
      .locator('article.dashboard-poll-card')
      .filter({ has: this.page.getByRole('button', { name: 'Votá ahora' }) })
      .first();
    const pollTitle = (await openCard.getByRole('heading', { level: 3 }).textContent())?.trim();
    if (!pollTitle) throw new Error('Expected at least one open consultation in the demo catalog');
    await openCard.getByRole('button', { name: /Leer propuesta/i }).click();
    await this.page.getByRole('heading', { name: pollTitle, exact: true }).waitFor();
    await this.page.getByRole('button', { name: 'Votar esta consulta' }).click();
    await this.page.getByRole('heading', { name: 'Elegí tu respuesta' }).waitFor();
    await this.page.getByRole('button', { name: /^Sí/ }).click();
    await this.page.getByRole('button', { name: /Revisar mi voto/i }).click();
    await this.page.getByRole('heading', { name: 'Tu compromiso' }).waitFor();
  }

  async submitSimulatedReceipt(): Promise<void> {
    await this.page.getByRole('button', { name: /Crear comprobante simulado/i }).click();
    await this.receiptHeading.waitFor();
  }
}
