import { expect, test } from '@playwright/test';

test.use({ video: 'on' });
for (const theme of ['light', 'dark']) {
  test(`connection status recovers from a blocked popup and confirms a simulated pass (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript((theme) => {
      localStorage.setItem('cico-locale', 'en');
      localStorage.setItem('cico-theme', theme);
      window.open = () => null;
    }, theme);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#app');
    await page.getByRole('button', { name: 'Already have Passport? Connect', exact: true }).click();
    await page.getByRole('button', { name: 'Connect Midnight Passport', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Allow pop-ups');
    await page.screenshot({ path: test.info().outputPath('connection-error.png'), fullPage: true });
    await page.getByRole('button', { name: 'Use demo Passport', exact: true }).click();
    await expect(page.locator('.onboarding-connected')).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByText('Try with a simulated pass', { exact: true }).click();
    await page.getByRole('button', { name: 'Create my simulated pass', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your simulated pass is ready' })).toBeVisible();
    const mascot = page.locator('.onboarding-pass-confirmation .onboarding-mascot img');
    await expect(mascot).toBeVisible();
    await expect
      .poll(() => mascot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: test.info().outputPath('pass-success.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await mascot.evaluate((img) => getComputedStyle(img).animationName)).toBe('none');
    expect(
      await page
        .locator('.connection-status__check')
        .evaluate((check) => getComputedStyle(check).animationName),
    ).toBe('none');
  });
}
