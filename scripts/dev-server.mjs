import { createServer } from 'node:http';
import next from 'next';

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '127.0.0.1';
const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/gemini') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    const authorization = request.headers.authorization || '';
    const apiKey = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';

    if (!apiKey) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'A Gemini session key is required.' }));
      return;
    }

    try {
      const upstream = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: Buffer.concat(chunks),
        },
      );
      response.writeHead(upstream.status, {
        'content-type':
          upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      });
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          error: 'The explanation service is temporarily unavailable.',
        }),
      );
    }
    return;
  }

  await handle(request, response);
}).listen(port, hostname, () => {
  console.log(`Algorithm Studio is ready at http://${hostname}:${port}`);
});
