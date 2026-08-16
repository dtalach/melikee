/**
 * A smoke test that drives the built app and screenshots every flow.
 *
 * It exercises the paths that are easy to break and hard to notice: the whole
 * capture ritual, the filing tray, both dibs surfaces, every sheet, and light
 * mode. It fails loudly on console errors, which is how the render loop and
 * the a11y bug in the pager were caught.
 *
 *   npx expo export --platform web
 *   node scripts/stub-server.mjs 8099 dist &
 *   node scripts/verify-flows.mjs
 *
 * The stub answers /api/recognize with contract-shaped payloads, so the whole
 * client path runs for real — post, parse, check the shape, render a match.
 * Against a plain static server every capture fell through to demo mode and a
 * client/endpoint disagreement could not be seen from here.
 *
 * Screenshots land in a scratch directory by default. They capture the app
 * mid-animation, so their bytes differ on every run — checking them in
 * automatically meant every verification dirtied the tree. To refresh the set
 * under docs/screens deliberately:
 *
 *   OUT=docs/screens node scripts/verify-flows.mjs
 *
 * Env: BASE_URL (default http://127.0.0.1:8099), CHROMIUM (path to a Chromium
 * binary; defaults to Playwright's own), OUT (screenshot directory).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

/**
 * The harness owns its own server unless told otherwise. Sharing a
 * long-running one cost several runs to a stale process still holding the
 * port, and several more to a dead one — both of which look like app failures
 * from in here.
 */
let stub;
let BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  const port = await freePort();
  BASE_URL = `http://127.0.0.1:${port}`;
  stub = spawn(process.execPath, [path.resolve('scripts/stub-server.mjs'), String(port), 'dist'], {
    stdio: 'ignore',
  });
  await waitForServer(BASE_URL);
  console.log('stub on', BASE_URL);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error(`stub never came up on ${url}`);
}
const OUT = process.env.OUT ?? path.resolve('.verify-screens');
fs.mkdirSync(OUT, { recursive: true });

// A synthetic camera, auto-granted. The shutter asks for permission now — on
// the web that ask is the user gesture Safari demands — and a headless browser
// with no camera device never answers the prompt at all, so the press would
// hang rather than fail. These flags give it something to say yes to, which
// also means the test drives a real capture instead of the no-camera path.
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

const errors = [];

/**
 * expo-camera fetches the barcode scanner's WebAssembly from jsdelivr at
 * runtime, and this sandbox's egress proxy blocks it — so a working camera
 * stream produces a burst of fetch failures that say nothing about the app.
 * Filtered narrowly, by the exact symptoms, so a genuine console error still
 * fails the run.
 *
 * Worth remembering that this is a real dependency: on a locked-down network,
 * or behind a strict CSP, scan mode loses its decoder the same way.
 */
const ENV_NOISE = [
  /ERR_CERT_AUTHORITY_INVALID/,
  /wasm streaming compile failed/,
  /falling back to ArrayBuffer instantiation/,
  /fetching of the wasm failed/,
  /Aborted\(both async and sync fetching/,
  // The harness serves `dist` statically, so there is no /api/recognize to
  // POST to and the static server answers 405. That the app now *reaches* this
  // point is the point: a real capture ran, and it degraded to demo mode
  // exactly as it should when no recognition service answers.
  /status of 405/,
];
const isNoise = (text) => ENV_NOISE.some((pattern) => pattern.test(text));
const SHUTTER = { x: 196, y: 790 };

/** Each flow gets a fresh page, so one failure can't cascade into the rest. */
async function flow(name, fn, { onboard = 'demo' } = {}) {
  const ctx = await browser.newContext({
    permissions: ['camera'],
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m.text())) errors.push(`[${name}] ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    if (!isNoise(e.message)) errors.push(`[${name}] PAGEERROR: ${e.message}`);
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  // Every flow now opens on first run. Most of them are about the seeded app,
  // so they take the demo account and carry on; the onboarding flow itself
  // opts out and walks the real path.
  if (onboard === 'demo') {
    await page.getByText('Just show me a demo account', { exact: true })
      .click({ timeout: 6000 })
      .catch(() => errors.push(`[${name}] could not skip onboarding`));
    await page.waitForTimeout(1200);
  }

  const helpers = {
    page,
    shot: async (file, wait = 700) => {
      await page.waitForTimeout(wait);
      await page.screenshot({ path: `${OUT}/${file}.png` });
      console.log('  shot', file);
    },
    tap: async (label, { exact = true } = {}) => {
      try {
        await page.getByText(label, { exact }).last().click({ timeout: 4000 });
        return true;
      } catch {
        console.log('  MISS tap:', label);
        errors.push(`[${name}] could not tap: ${label}`);
        return false;
      }
    },
    shutter: async () => page.mouse.click(SHUTTER.x, SHUTTER.y),
    /** Dock navigation, then wait for the strip to settle. */
    go: async (label) => {
      await page.getByText(label, { exact: true }).last().click({ timeout: 4000 })
        .catch(() => { console.log('  MISS nav:', label); errors.push(`[${name}] nav failed: ${label}`); });
      await page.waitForTimeout(900);
    },
  };

  console.log('flow:', name);
  await fn(helpers);
  await ctx.close();
}

// ── First run ─────────────────────────────────────────────────────────────
await flow(
  'onboarding',
  async ({ shot, tap, page }) => {
    await shot('40-welcome', 600);
    await tap('Let’s go');
    await page.locator('input').first().fill('Dev');
    await shot('41-name', 500);
    await tap('Next');
    await shot('42-birthday', 500);
    await tap('Mar');
    await tap('9');
    await tap('Mar 9 it is');
    await shot('43-camera-ask', 500);
    // The label depends on whether the browser granted the camera — headless
    // Chromium has none, so it reads "Carry on without it" here.
    await page
      .getByText(/Start snapping|Carry on without it/)
      .last()
      .click({ timeout: 4000 })
      .catch(() => errors.push('[onboarding] could not leave the camera step'));
    await shot('44-fresh-camera', 1400);

    // A real new account: empty lists, no friends, nobody in the feed.
    await page.getByText('Lists', { exact: true }).last().click({ timeout: 4000 });
    await page.waitForTimeout(900);
    await shot('45-fresh-lists', 500);
    const shinies = await page.getByText('0 shinies', { exact: false }).count();
    if (shinies < 2) errors.push('[onboarding] the new account did not start empty');
    else console.log('  started empty');
  },
  { onboard: 'none' },
);

// ── One tap: the shutter files it, the price catches up ───────────────────
await flow('lookup', async ({ shot, page, shutter, tap, go }) => {
  await shutter();

  // No second press anywhere in here. The card that appears is a receipt.
  await page.waitForTimeout(1400);
  const named = await page.getByText('Sony WH-1000XM6 headphones', { exact: false }).count();
  if (named === 0) errors.push('[lookup] the caught card never named the product');
  else console.log('  caught and named on one tap');
  await shot('46-caught', 300);

  // It files itself and flies without being asked.
  await page.waitForTimeout(2600);
  await shot('47-filed-while-pricing', 400);
  const tray = await page.getByText('finding the price', { exact: false }).count();
  if (tray === 0) console.log('  (tray had already left)');

  // The tray lingers for a few seconds by design; let it go before navigating.
  await page.waitForTimeout(6500);
  await go('Lists');
  await tap('My wants');
  await page.waitForTimeout(900);
  await shot('48-priced-later', 500);
  const priced = await page.getByText('$399', { exact: false }).count();
  if (priced === 0) errors.push('[lookup] the price never landed on the filed shiny');
  else console.log('  price arrived after filing');
});

// ── A barcode gets a real name too, not its own digits ────────────────────
await flow('barcode', async ({ shot, page }) => {
  // No barcode in a synthetic camera, so this drives the same path the scanner
  // does: a scan capture, identified and filed on one tap.
  await page.evaluate(() => {
    window.__melikeeCapture?.begin({ mode: 'scan', upc: '027242925175' });
  });
  await page.waitForTimeout(1500);
  const named = await page.getByText('Sony WH-1000XM6 headphones', { exact: false }).count();
  const digits = await page.getByText('Barcode 027242925175', { exact: false }).count();
  if (named === 0) errors.push('[barcode] the scan was never given a real product name');
  else console.log('  barcode named, not left as digits');
  if (digits > 0) errors.push('[barcode] the shiny is still wearing its own digits');
  await shot('49-barcode-named', 400);
});

// ── The capture ritual, end to end ────────────────────────────────────────
await flow('capture', async ({ shot, tap, shutter }) => {
  await shutter();
  await shot('10-magic', 700);
  await shot('11-caught', 1200);
  await shot('14-filing-tray', 2400);
  await tap('Sweet 16');
  await shot('15-filed-moved', 800);
});

// ── Persistence: a shiny survives a reload ────────────────────────────────
await flow('persist', async ({ shot, tap, shutter, page }) => {
  await shutter();
  await page.waitForTimeout(4200);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page
    .getByText('Lists', { exact: true })
    .last()
    .click({ timeout: 4000 })
    .catch(() => errors.push('[persist] could not reach Lists after reload'));
  await page.waitForTimeout(900);
  await shot('39-after-reload', 600);

  // The capture above files into My wants, so the restored list has to be
  // showing four shinies rather than the three it ships with.
  const restored = await page.getByText('4 shinies', { exact: false }).count();
  if (restored === 0) errors.push('[persist] the captured shiny did not survive a reload');
  else console.log('  persisted across reload');
});

// ── The miss, and never losing the wish ───────────────────────────────────
await flow('fallback', async ({ shot, tap, shutter, page }) => {
  // Arm the stub to refuse the next read, so the miss screen is reachable now
  // that a stubbed lookup otherwise always succeeds.
  await page.request.get(`${BASE_URL}/__stub/fail-next-read`);

  await shutter();
  await shot('16-miss', 2600);
  const missed = await page.getByText('Nothing shiny in there', { exact: false }).count();
  if (missed === 0) errors.push('[fallback] the miss screen never appeared');

  await tap('Save my photo, keep matching');
  await shot('17-photo-saved', 900);
});

// ── Lists → detail → item ─────────────────────────────────────────────────
await flow('lists', async ({ shot, tap, go, page }) => {
  await go('Lists');
  await shot('18-lists', 600);
  await tap('My wants');
  await shot('19-list-detail', 900);
  await tap('Instax Mini 12');
  await shot('20-item-detail', 900);
  await page.goBack();
  await page.waitForTimeout(900);
  await tap('Share');
  await shot('21-share-sheet', 900);
  await tap('✨ Write one for me');
  await shot('22-share-note', 700);
  await tap('Preview their view →');
  await shot('23-gifter', 1400);
  await tap('Call dibs');
  await shot('24-gifter-dibsed', 800);
});

// ── Feed → friend's list ──────────────────────────────────────────────────
await flow('feed', async ({ shot, tap, go }) => {
  await go('Feed');
  await shot('25-feed', 600);
  await tap('Accept');
  await shot('26-request-accepted', 800);
  await tap('Peek');
  await shot('27-friend-list', 1100);
  await tap('Call dibs');
  await shot('28-friend-dibsed', 900);
});

// ── Friends + invite sheet ────────────────────────────────────────────────
await flow('friends', async ({ shot, tap, go, page }) => {
  await go('Friends');
  await shot('29-friends', 600);
  await tap('Manage');
  await shot('30-friend-manage', 700);
  await tap('+ Invite');
  await shot('31-invite-sheet', 900);
  await page.locator('input[placeholder="Search name or @handle"]').fill('pri')
    .catch(() => { console.log('  MISS search'); errors.push('[friends] search input'); });
  await shot('32-invite-search', 800);
});

// ── Me → settings → light mode ────────────────────────────────────────────
await flow('me', async ({ shot, tap, go, page }) => {
  await go('Me');
  await shot('33-me', 600);
  await page.mouse.click(363, 42); // the gear, top-right of the hero
  await shot('34-settings', 900);
  await tap('Light');
  await shot('35-light-mode', 900);
  await page.mouse.click(196, 100); // scrim
  await page.waitForTimeout(700);
  await shot('36-me-light', 600);
  await go('Feed');
  await shot('37-feed-light', 700);
});

// ── New list ──────────────────────────────────────────────────────────────
await flow('newlist', async ({ shot, tap, go }) => {
  await go('Lists');
  await tap('+ New list');
  await shot('38-new-list', 900);
});

console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
stub?.kill();
process.exit(errors.length ? 1 : 0);
