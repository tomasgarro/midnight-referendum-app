import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  video: { mode: 'on', size: { width: 390, height: 844 } },
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('cico-wave1-onboarding-complete', '1');
    localStorage.setItem('cico-locale', 'en');
  });
  await page.goto('/#app');
});
test('global first, regional second, source-backed chat and reduced motion', async ({ page }) => {
  await page.getByRole('button', { name: /Browse by place/ }).click();
  // Selection closes the sheet, so assert the resulting scope rather than a detached radio.
  await page.getByRole('radio', { name: /Switzerland/ }).click();
  await expect(page.locator('.votes__results h2')).toHaveText(['Global', 'Switzerland']);
  await expect(page.getByRole('heading', { name: 'Should the SNB hold Bitcoin?' })).toBeVisible();
  await page.locator('.dashboard-guide-entry').click();
  await page.getByRole('textbox').fill('Summarize the Swiss Bitcoin initiative');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('status')).toContainText('Finding catalogue context');
  await expect(page.locator('.catalogue-chat__answer')).toContainText(
    'constitutional reserve provision',
  );
  await page.screenshot({ path: 'outputs/ask-midnight-bitcoin-390.png' });
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await expect(page.getByRole('link', { name: /Swiss National Bank/ })).toHaveAttribute(
    'href',
    /snb.ch/,
  );
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await page.getByRole('button', { name: 'Climate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Repair more. Replace less?' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});
test('budget reflection preserves choices on back and review editing', async ({ page }) => {
  await page.locator('.votes__pulse button').click();
  await page.getByRole('button', { name: 'Start reflecting' }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.getByRole('button', { name: /Cost of living/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: /It depends on the circumstances/ }).click();
  await page.screenshot({ path: 'outputs/civic-budget-390.png' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /It depends on the circumstances/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /Compare a mix/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Edit: Borrowing tolerance' }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Take a moment to look back.' })).toBeVisible();
  await expect(page.getByText('Compare a mix of approaches', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish reflection' }).click();
  await expect(page.getByText(/No answer was submitted or saved/)).toBeVisible();
});
