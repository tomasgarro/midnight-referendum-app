import { expect, test } from '@playwright/test';

test('passport reveal follows proximity, shares the tilt, and resets without changing routes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const stage = page.locator('.passport-art__stage');
  await expect(stage).toHaveAttribute('data-interactive', 'true');
  const rect = await stage.boundingBox();
  if (!rect) throw new Error('Passport artwork is missing');
  const radius = () =>
    stage.evaluate((el) => Number.parseFloat(el.style.getPropertyValue('--reveal-radius')) || 0);
  await page.mouse.move(rect.x + rect.width * 0.93, rect.y + rect.height * 0.7);
  await expect.poll(radius).toBeGreaterThan(10);
  await expect.poll(radius).toBeLessThan(16);
  await page.screenshot({ path: test.info().outputPath('passport-far.png') });
  await page.mouse.move(rect.x + rect.width * 0.359, rect.y + rect.height * 0.331);
  await expect.poll(radius).toBeGreaterThan(rect.width * 0.32);
  const pose = await page
    .locator('.passport-art__pose')
    .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).transform));
  expect(pose[0]).toEqual(pose[1]);
  expect(pose[0]).not.toBe('none');
  const masks = await page
    .locator('.passport-art__window')
    .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).maskImage));
  expect(masks[0]).toContain('radial-gradient');
  expect(masks[1]).toContain('radial-gradient');
  expect(masks[0]).not.toEqual(masks[1]);
  await page.screenshot({ path: test.info().outputPath('passport-center.png') });
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.7);
  await expect.poll(radius).toBeGreaterThan(rect.width * 0.24);
  await page.screenshot({ path: test.info().outputPath('passport-palm.png') });
  await expect(page.locator('.passport-art__caption')).toHaveCount(0);
  await expect(page.locator('.midnight-hero__base')).toHaveCount(0);
  // Moving quickly must not leave a painted trail or persist an agent state.
  await page.mouse.move(rect.x + 10, rect.y + 20);
  await page.mouse.move(rect.x + rect.width - 10, rect.y + 20);
  await page.mouse.move(20, 20);
  await expect.poll(radius).toBe(0);
  await page.screenshot({ path: test.info().outputPath('passport-neutral.png') });
  await page.mouse.move(rect.x + rect.width * 0.359, rect.y + rect.height * 0.331);
  await expect.poll(radius).toBeGreaterThan(20);
  await page.mouse.wheel(0, 1400);
  await expect.poll(radius).toBe(0);
  await page.mouse.wheel(0, -1400);
  await expect(stage).toBeInViewport();
  const fresh = await stage.boundingBox();
  if (!fresh) throw new Error('Passport artwork disappeared after scrolling');
  await page.mouse.move(fresh.x + fresh.width * 0.359, fresh.y + fresh.height * 0.331);
  await expect.poll(radius).toBeGreaterThan(fresh.width * 0.32);
  await expect(page).not.toHaveURL(/#app/);
  await expect(
    page.getByRole('link', { name: 'Explore Midnight', exact: true }).last(),
  ).toHaveAttribute('href', 'https://midnight.network');
});

for (const width of [320, 390, 768]) {
  test(`passport stays human and within the viewport at ${width}px`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const stage = page.locator('.passport-art__stage');
    await expect(stage).toHaveAttribute('data-interactive', 'false');
    await expect(page.locator('.passport-art__window--agent')).toHaveCount(0);
    await expect(page.locator('.passport-art__hand')).toHaveJSProperty('naturalWidth', 1672);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    expect(requests.some((url) => url.includes('agent-hand'))).toBe(false);
    await stage.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`passport-${width}.png`) });
  });
}

test('reduced motion and coarse pointers keep a static human illustration', async ({ browser }) => {
  for (const options of [
    { reducedMotion: 'reduce' as const },
    { hasTouch: true, isMobile: true },
  ]) {
    const context = await browser.newContext({
      ...options,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL ?? 'http://localhost:4173');
    await expect(page.locator('.passport-art__stage')).toHaveAttribute('data-interactive', 'false');
    await expect(page.locator('.passport-art__window--agent')).toHaveCount(0);
    expect(
      await page.locator('.passport-art__pose').evaluate((el) => getComputedStyle(el).transform),
    ).toBe('none');
    await context.close();
  }
});

test('an unavailable agent image leaves the human intact and signup usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/art/passport/agent-hand.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.passport-art__window--human .passport-art__hand')).toHaveJSProperty(
    'naturalWidth',
    1672,
  );
  await expect(page.locator('.passport-art__stage')).toHaveAttribute('data-interactive', 'false');
  expect(
    await page
      .locator('.passport-art__window--human')
      .evaluate((el) => getComputedStyle(el).maskImage),
  ).toBe('none');
  await page.getByRole('button', { name: 'Get started', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'midnight.vote', exact: true })).toBeVisible();
});

test('missing human artwork retains a fallback and usable navigation', async ({ page }) => {
  await page.route('**/art/passport/human-hand.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.passport-art__stage')).toHaveAttribute('data-failed', 'true');
  await expect(page.locator('.passport-art__fallback')).toBeVisible();
  await expect(page.locator('.passport-art__window--agent')).toHaveCount(0);
  await page.getByRole('button', { name: 'Get started', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'midnight.vote', exact: true })).toBeVisible();
});
