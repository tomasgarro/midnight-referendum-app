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
      name: /Prove you can vote|Demostrá que podés votar/i,
    });
    this.credentialHeading = page.getByRole('heading', {
      name: /Your credential is ready|Tu credencial está lista/i,
    });
    this.receiptHeading = page.getByRole('heading', {
      name: /Thank you for participating|Gracias por participar/i,
    });
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
    await this.page.getByRole('button', { name: /Continue|Continuar/i }).click();
    await this.page.getByRole('button', { name: /Use demo Passport|Passport de demo/i }).click();
    await this.page.getByRole('button', { name: /Continue|Continuar/i }).click();
  }

  async issueSyntheticCredential(): Promise<void> {
    await this.page
      .getByRole('button', { name: /Prepare credential|Preparar credencial/i })
      .click();
    await this.page.getByRole('button', { name: /Use this country|Usar este país/i }).click();
    await this.credentialHeading.waitFor();
  }

  async openDashboard(): Promise<void> {
    await this.page.getByRole('button', { name: /Go to civic dashboard|Ir al panel/i }).click();
    await this.page
      .getByRole('heading', { name: /Consultations for you|Consultas para vos/i })
      .waitFor();
  }

  async openConsultationAndVote(): Promise<void> {
    const openCard = this.page
      .locator('article.dashboard-poll-card')
      .filter({ has: this.page.getByRole('button', { name: /Vote now|Votá ahora/i }) })
      .first();
    const pollTitle = (await openCard.getByRole('heading', { level: 3 }).textContent())?.trim();
    if (!pollTitle) throw new Error('Expected at least one open consultation in the demo catalog');
    await openCard.getByRole('button', { name: /Read proposal|Leer propuesta/i }).click();
    await this.page.getByRole('heading', { name: pollTitle, exact: true }).waitFor();
    await this.page
      .getByRole('button', { name: /Vote on this consultation|Votar esta consulta/i })
      .click();
    await this.page
      .getByRole('heading', { name: /Choose your response|Elegí tu respuesta/i })
      .waitFor();
    await this.page.getByRole('button', { name: /^(Yes|Sí)/i }).click();
    await this.page.getByRole('button', { name: /Review my vote|Revisar mi voto/i }).click();
    await this.page.getByRole('heading', { name: /Your commitment|Tu compromiso/i }).waitFor();
  }

  async submitSimulatedReceipt(): Promise<void> {
    await this.page
      .getByRole('button', { name: /Create simulated receipt|Crear comprobante simulado/i })
      .click();
    await this.receiptHeading.waitFor();
  }
}
