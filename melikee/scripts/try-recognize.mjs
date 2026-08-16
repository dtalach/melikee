/**
 * Poke the recognition endpoint from a terminal.
 *
 * The two Claude passes cost real money and take real seconds, so they are not
 * part of the Playwright smoke test — that runs against demo mode. This is how
 * you check the real thing after deploying, or against `npx vercel dev`.
 *
 *   node scripts/try-recognize.mjs --url https://your-app.vercel.app
 *   node scripts/try-recognize.mjs --scan 027242925175
 *   node scripts/try-recognize.mjs --say "those sony noise cancelling headphones"
 *   node scripts/try-recognize.mjs --snap ./some-photo.jpg
 *
 * With no capture flag it just calls the health check, which tells you whether
 * the function is deployed and whether it has an API key.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const base = (flag('url') ?? process.env.MELIKEE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const url = `${base}/api/recognize`;

const scan = flag('scan');
const say = flag('say');
const snap = flag('snap');

// No capture flag: health check. `--probe` also proves the key works.
if (!scan && !say && !snap) {
  const probe = args.includes('--probe') ? '?probe=1' : '';
  const response = await fetch(`${url}${probe}`);
  console.log(response.status, await response.text());
  process.exit(0);
}

let body;
if (scan) body = { mode: 'scan', upc: scan };
else if (say) body = { mode: 'say', transcript: say };
else {
  const bytes = fs.readFileSync(snap);
  const ext = path.extname(snap).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  console.log(`sending ${(bytes.length / 1024).toFixed(0)}KB as ${mediaType}`);
  body = { mode: 'snap', image: { data: bytes.toString('base64'), mediaType } };
}

const started = Date.now();
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const text = await response.text();
console.log(`${response.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
try {
  console.dir(JSON.parse(text), { depth: null });
} catch {
  console.log(text.slice(0, 800));
}
