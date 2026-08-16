/**
 * Serves the built app *and* a stubbed /api/recognize.
 *
 * The smoke test used to run against a plain static server, so every capture
 * fell through to demo mode and the real client path — post, parse, check the
 * shape, render a match — was never exercised. That blind spot shipped a bug:
 * the client validated every reply against the candidates shape, so a
 * perfectly good reading came back looking like gibberish and every photo
 * capture failed. Nothing local could have noticed.
 *
 * The canned answers below are written against the contract by hand, on
 * purpose. If the app and the endpoint drift apart, this is where it shows.
 *
 *   node scripts/stub-server.mjs [port] [dir]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const port = Number(process.argv[2] ?? 8099);
const root = path.resolve(process.argv[3] ?? 'dist');

/** A 2×2 lime PNG — enough for the UI to have a real image to lay out. */
const SWATCH =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGPYyMDwn4mBgYGBiYGBAQAaGgH9YoDwlwAAAABJRU5ErkJggg==';

const READING = {
  brand: 'Sony',
  productName: 'WH-1000XM6 headphones',
  modelNumber: 'WH1000XM6/B',
  category: 'headphones',
  color: 'black',
  variant: '',
  // Deliberately more than the name repeats back: the identity card filters
  // out anything already in the product name, so a stub whose only visible
  // text *is* the name would never render the evidence chips at all.
  visibleText: ['SONY', 'WH-1000XM6', 'NOISE CANCELLING', '30HR BATTERY'],
  confidence: 'high',
  searchQuery: 'Sony WH-1000XM6 headphones black',
  frameProblem: 'none',
};

const CANDIDATES = [
  {
    name: 'Sony WH-1000XM6',
    price: '$399',
    stores: 'Best Buy + 2 stores',
    storeName: 'Best Buy',
    upc: '027242925175',
    reason: 'best match, 96%',
    buyUrl: 'https://example.com/xm6',
    imageUrl: SWATCH,
    confidence: 96,
    otherStores: [{ storeName: 'Amazon', price: '$389', buyUrl: 'https://example.com/xm6-amz' }],
  },
  {
    name: 'Sony XM5 headphones',
    price: '$329',
    stores: 'Best Buy + 1 store',
    storeName: 'Best Buy',
    upc: '027242923041',
    reason: 'last year’s model',
    imageUrl: SWATCH,
    confidence: 71,
  },
  {
    name: 'Sony WH-1000XM6 — silver',
    price: '$399',
    stores: 'Amazon',
    storeName: 'Amazon',
    upc: '027242925182',
    reason: 'different colour',
    imageUrl: SWATCH,
    confidence: 64,
  },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

let failNextRead = false;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

  // A test hook, not part of the contract: arms the next read to fail, so the
  // miss screen and its recovery paths stay covered now that the stub
  // otherwise always succeeds.
  if (url.pathname === '/__stub/fail-next-read') {
    failNextRead = true;
    return json(res, 200, { armed: true });
  }

  if (url.pathname === '/api/recognize') {
    if (req.method === 'GET') return json(res, 200, { ok: true, service: 'stub', configured: true });
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'bad_request', message: 'POST.' });

    const body = await readBody(req);
    const checkedAt = new Date().toISOString();

    if (body?.mode === 'read' && failNextRead) {
      failNextRead = false;
      return json(res, 200, {
        ok: false,
        code: 'no_product',
        message: 'No product in that photo.',
        timing: { totalMs: 30 },
      });
    }

    if (body?.mode === 'read') {
      return json(res, 200, { ok: true, reading: READING, timing: { readMs: 40, totalMs: 40 } });
    }
    return json(res, 200, {
      ok: true,
      candidates: CANDIDATES,
      reading: READING,
      checkedAt,
      timing: { searchMs: 60, totalMs: 60 },
    });
  }

  // Static, with the same single-page fallback the deployment uses.
  const requested = path.join(root, url.pathname);
  const file =
    requested.startsWith(root) && fs.existsSync(requested) && fs.statSync(requested).isFile()
      ? requested
      : path.join(root, 'index.html');

  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function json(res, status, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

server.listen(port, '127.0.0.1', () => console.log(`stub serving ${root} on :${port}`));
