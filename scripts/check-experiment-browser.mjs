// A real Chrome check for the experiment's keyboard, focus, live-region and
// layout primitives. The built playground is served locally; no site is visited.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(fileURLToPath(new URL('../output/playground/', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    const body = await readFile(target);
    response.writeHead(200, {
      'content-type': types[extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

const focus = page => page.evaluate(() => ({
  id: document.activeElement.id,
  scenario: document.activeElement.dataset?.scenario ?? null,
  insideDialog: Boolean(document.activeElement.closest?.('dialog')),
}));
const feedback = page => page.textContent('#feedback');
const waitPhase = (page, phase) => page.waitForFunction(
  value => document.querySelector('#stage').dataset.phase === value, phase);
const waitFeedback = (page, message) => page.waitForFunction(
  value => document.querySelector('#feedback').textContent === value, message);
const waitIdle = page => page.waitForFunction(
  () => !document.querySelector('#run').disabled && !document.querySelector('#invalid').disabled);

async function reload(page, url) {
  await page.goto(url);
  await page.waitForSelector('#run');
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/experiment.html`;
  let browser;
  try {
    // Use the installed Google Chrome instead of downloading another browser.
    // Set CHROME_PATH when Chrome is not in its default location.
    const executablePath = process.env.CHROME_PATH;
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : { channel: 'chrome' }),
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });

    await reload(page, url);
    assert.equal(await feedback(page), 'Signed out');
    assert.equal(await page.getAttribute('[data-scenario="signin"]', 'aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => {
      const region = document.querySelector('#feedback');
      return { role: region.getAttribute('role'), live: region.getAttribute('aria-live') };
    }), { role: 'status', live: 'polite' });
    assert.equal(await page.getAttribute('#scene', 'aria-hidden'), 'true');
    assert.equal(await page.getAttribute('#inspect', 'aria-haspopup'), 'dialog');
    assert.equal(await page.getAttribute('#developer', 'aria-labelledby'), 'developer-title');

    // Scene selection is keyboard driven and keeps focus on the selection.
    await page.locator('[data-scenario="payment"]').focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await focus(page), { id: '', scenario: 'payment', insideDialog: false });
    assert.equal(await page.getAttribute('[data-scenario="payment"]', 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute('[data-scenario="signin"]', 'aria-pressed'), 'false');
    assert.equal(await page.textContent('#object-title'), '€24.00');
    assert.equal(await feedback(page), 'Unpaid');

    // A hidden state preview must not churn the live region while typing.
    await reload(page, url);
    await page.locator('#inspect').focus();
    await page.keyboard.press('Enter');
    await page.locator('#account').focus();
    await page.evaluate(() => {
      window.__mutations = [];
      window.__observer = new MutationObserver(() => {
        window.__mutations.push(document.querySelector('#feedback').textContent);
      });
      window.__observer.observe(document.querySelector('#feedback'),
        { childList: true, characterData: true, subtree: true });
    });
    await page.keyboard.type('abcde');
    assert.deepEqual(await page.evaluate(() => window.__mutations), []);
    await page.keyboard.press('Escape');

    // Repeating the same rejection must write the status again.
    await reload(page, url);
    await page.locator('#invalid').focus();
    await page.evaluate(() => {
      window.__errors = [];
      window.__observer = new MutationObserver(() => {
        window.__errors.push(document.querySelector('#feedback').textContent);
      });
      window.__observer.observe(document.querySelector('#feedback'),
        { childList: true, characterData: true, subtree: true });
    });
    await page.keyboard.press('Enter');
    await waitPhase(page, 'error');
    await waitIdle(page);
    await page.keyboard.press('Enter');
    await waitPhase(page, 'error');
    await waitIdle(page);
    const errors = await page.evaluate(() => window.__errors);
    assert.equal(errors.length, 2);
    assert.equal(errors[0], 'Only the sample account “demo” can sign in.');
    assert.equal(errors[1], errors[0]);
    assert.deepEqual(await focus(page), { id: 'invalid', scenario: null, insideDialog: false });

    // Editing a pending request cancels review and the new input is revalidated.
    await reload(page, url);
    await page.locator('#run').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'review');
    await page.locator('#inspect').focus();
    await page.keyboard.press('Enter');
    await page.locator('#account').fill('other');
    await page.keyboard.press('Escape');
    assert.equal(await feedback(page), 'Signed out');
    assert.equal(await page.textContent('#run'), 'Run action');
    await page.locator('#run').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'error');
    assert.equal(await feedback(page), 'Only the sample account “demo” can sign in.');

    // Sign in review and approval, then the next example.
    await reload(page, url);
    await page.locator('#run').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'review');
    assert.equal(await feedback(page), 'Your consent is required.');
    assert.equal(await page.textContent('#run'), 'Allow demo sign in');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'complete');
    assert.equal(await feedback(page), 'Signed in');
    assert.equal(await page.textContent('#run'), 'Next example →');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'idle');
    assert.equal(await page.textContent('#object-title'), '€24.00');
    assert.equal(await page.getAttribute('[data-scenario="payment"]', 'aria-pressed'), 'true');

    // Invoice rejection, review and approval.
    await page.locator('#invalid').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'error');
    assert.equal(await feedback(page), 'Blocked. This invoice is exactly €24.00.');
    await page.locator('#run').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'review');
    assert.equal(await feedback(page), 'Owner approval required. No money moves.');
    assert.equal(await page.textContent('#run'), 'Approve €24.00 locally');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'complete');
    assert.equal(await feedback(page), 'Paid locally');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'idle');
    assert.equal(await page.textContent('#object-title'), 'Marketing emails');
    assert.equal(await page.getAttribute('[data-scenario="settings"]', 'aria-pressed'), 'true');

    // Settings complete without approval, then reset.
    await page.locator('#run').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'complete');
    assert.equal(await feedback(page), 'Off');
    assert.equal(await page.textContent('#run'), 'Replay');
    await page.locator('#reset').focus();
    await page.keyboard.press('Enter');
    await waitPhase(page, 'idle');
    assert.equal(await feedback(page), 'On');
    assert.equal(await page.textContent('#run'), 'Run action');
    assert.deepEqual(await focus(page), { id: 'reset', scenario: null, insideDialog: false });

    // The inspector traps Tab, Escape closes it and returns focus to its opener.
    await reload(page, url);
    await page.locator('#inspect').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.querySelector('#developer').open), true);
    assert.equal((await focus(page)).insideDialog, true);
    for (let index = 0; index < 6; index++) {
      await page.keyboard.press('Tab');
      assert.equal((await focus(page)).insideDialog, true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.querySelector('#developer').open), false);
    assert.deepEqual(await focus(page), { id: 'inspect', scenario: null, insideDialog: false });

    // Use these inputs returns focus to the primary action.
    await page.keyboard.press('Enter');
    await page.locator('#use-inputs').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.querySelector('#developer').open), false);
    assert.deepEqual(await focus(page), { id: 'run', scenario: null, insideDialog: false });

    // Reduced motion removes the route and artwork transitions.
    await reload(page, url);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        media: matchMedia('(prefers-reduced-motion: reduce)').matches,
        route: style('.route-progress').transitionDuration,
        art: style('.result-art').transitionDuration,
      };
    });
    assert.equal(reduced.media, true);
    assert.equal(reduced.route, '0s');
    assert.equal(reduced.art, '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.route-progress')).transitionDuration), '0s');

    // The primary action and utility controls stay usable at narrow widths.
    for (const width of [640, 390]) {
      await page.setViewportSize({ width, height: 800 });
      const layout = await page.evaluate(() => {
        const run = document.querySelector('#run').getBoundingClientRect();
        const utilities = [...document.querySelectorAll('.utilities button')]
          .map(button => Math.round(button.getBoundingClientRect().height));
        return {
          viewport: innerWidth,
          scroll: document.scrollingElement.scrollWidth,
          runHeight: Math.round(run.height),
          utilities,
        };
      });
      assert.equal(layout.scroll, layout.viewport);
      assert.equal(layout.runHeight, 48);
      assert.ok(layout.utilities.every(height => height >= 44));
      await page.locator('#inspect').click();
      const dialog = await page.evaluate(() => {
        const rect = document.querySelector('#developer').getBoundingClientRect();
        return { left: rect.left, right: rect.right, viewport: innerWidth };
      });
      assert.ok(dialog.left >= 0 && dialog.right <= dialog.viewport);
      await page.keyboard.press('Escape');
    }

    assert.deepEqual(pageErrors, []);
    console.log('Browser experiment check passed: scene selection, status announcements, cancelled review, three action journeys, dialog focus, reduced motion and 640/390 layout.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
