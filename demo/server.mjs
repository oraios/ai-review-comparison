import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadPricing, quote } from './pricing.mjs';

export async function startServer(pricing, port = 0) {
  const html = await readFile(new URL('./index.html', import.meta.url));
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'");
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    if (url.pathname === '/api/quote') {
      res.setHeader('Content-Type', 'application/json');
      try { res.end(JSON.stringify(quote(Number(url.searchParams.get('subtotal')), pricing))); }
      catch { res.writeHead(400).end(JSON.stringify({ error: 'Invalid subtotal' })); }
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await startServer(await loadPricing(process.env.DEMO_PRICING), Number(process.env.PORT || 3000));
  console.log(`Shipping demo: ${url}`);
}
