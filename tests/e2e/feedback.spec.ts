import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  test(`feedback route keeps failed text and confirms only accepted mail at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => localStorage.setItem('cico-locale', 'en'));
    const bodies: Record<string, unknown>[] = [];
    await page.route('**/api/feedback.php', async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: bodies.length === 1 ? 503 : 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: bodies.length > 1 }),
      });
    });
    await page.goto('/feedback');
    await expect(page.getByRole('heading', { name: 'Help and feedback' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    await page.getByLabel('Your message').fill('The connection status is much clearer now.');
    await page.getByRole('button', { name: 'Send feedback' }).click();
    await expect(page.getByRole('alert')).toContainText('still here');
    await expect(page.getByLabel('Your message')).toHaveValue(
      'The connection status is much clearer now.',
    );
    await page.screenshot({ path: test.info().outputPath('feedback-retry.png') });
    await page.getByRole('button', { name: 'Send feedback' }).click();
    await expect(page.getByRole('status')).toContainText('Thank you');
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual(bodies[1]);
    expect(Object.keys(bodies[0]).sort()).toEqual([
      'email',
      'locale',
      'message',
      'requestId',
      'website',
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath('feedback-accepted.png') });
  });
}
