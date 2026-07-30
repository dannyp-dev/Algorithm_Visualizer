const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// ── Gemini proxy ──────────────────────────────────────────────────────────────
function proxyGemini(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Extract API key from Authorization header  
    const auth = req.headers['authorization'] || '';
    const apiKey = auth.replace('Bearer ', '').trim();
    if (!apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'No API key provided' } }));
      return;
    }

    // Parse which model was requested
    const reqUrl = url.parse(req.url);
    const modelMatch = reqUrl.pathname.match(/\/proxy\/gemini\/(.+)/);
    const model = modelMatch ? modelMatch[1] : 'gemini-1.5-flash';

    const geminiPath = `/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: geminiPath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        console.log(`  [Proxy] ${model} -> ${proxyRes.statusCode}`);
        if (proxyRes.statusCode !== 200) {
          console.error(`  [Proxy Error] ${model}: ${data}`);
        }
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      });
    });
    proxyReq.on('error', e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: e.message } }));
    });
    proxyReq.write(body);
    proxyReq.end();
  });
}

// ── Static file server ────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    res.end(); return;
  }

  // Gemini proxy route
  if (req.method === 'POST' && req.url.startsWith('/proxy/gemini/')) {
    proxyGemini(req, res); return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ⚙  Algorithm Visualizer is running!');
  console.log('');
  console.log(`  Open this in your browser:`);
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
