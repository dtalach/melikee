/**
 * A smoke test that drives the built app and screenshots every flow.
 *
 * It exercises the paths that are easy to break and hard to notice: the whole
 * capture ritual, the filing tray, both dibs surfaces, every sheet, and light
 * mode. It fails loudly on console errors, which is how the render loop and
 * the a11y bug in the pager were caught.
 *
 *   npx expo export --platform web
 *   npx http-server dist -p 8099 -s &
 *   node scripts/verify-flows.mjs
 *
 * Env: BASE_URL (default http://127.0.0.1:8099), CHROMIUM (path to a Chromium
 * binary; defaults to Playwright's own), OUT (screenshot directory).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8099';
const OUT = process.env.OUT ?? path.resolve('docs/screens');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);

const errors = [];
const SHUTTER = { x: 196, y: 790 };

/** Each flow gets a fresh page, so one failure can't cascade into the rest. */
async function flow(name, fn, { onboard = 'demo' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] PAGEERROR: ${e.message}`));
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
    await tap('Start snapping');
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

// ── The capture ritual, end to end ────────────────────────────────────────
await flow('capture', async ({ shot, tap, shutter }) => {
  await shutter();
  await shot('10-magic', 700);
  await shot('11-found', 1800);
  await tap('not it — see near matches');
  await shot('12-near-matches', 600);
  await tap('Sony XM5 headphones');
  await shot('13-picked-alternate', 700);
  await tap('Want it!');
  await shot('14-filing-tray', 1700);
  await tap('Sweet 16');
  await shot('15-filed-moved', 800);
});

// ── Persistence: a shiny survives a reload ────────────────────────────────
await flow('persist', async ({ shot, tap, shutter, page }) => {
  await shutter();
  await page.waitForTimeout(2600);
  await tap('Want it!');
  await page.waitForTimeout(1200);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.getByText('Lists', { exact: true }).last().click({ timeout: 4000 });
  await page.waitForTimeout(900);
  await shot('39-after-reload', 600);

  // The capture above files into My wants, so the restored list has to be
  // showing four shinies rather than the three it ships with.
  const restored = await page.getByText('4 shinies', { exact: false }).count();
  if (restored === 0) errors.push('[persist] the captured shiny did not survive a reload');
  else console.log('  persisted across reload');
});

// ── Save-my-photo fallback ────────────────────────────────────────────────
await flow('fallback', async ({ shot, tap, shutter }) => {
  await shutter();
  await shot('16-blank', 2600);
  await tap('not it — see near matches');
  await tap('None of these — save my photo, keep matching');
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
process.exit(errors.length ? 1 : 0);
