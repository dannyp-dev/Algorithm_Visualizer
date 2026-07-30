const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_REQUEST_BYTES = 96_000;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function proxyGemini(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: 'Request is too large.' }, 413);
  }

  const authorization = request.headers.get('authorization') || '';
  const apiKey = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!apiKey) {
    return jsonResponse({ error: 'A Gemini session key is required.' }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      'content-type':
        response.headers.get('content-type') ||
        'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/gemini' && request.method === 'POST') {
      try {
        return await proxyGemini(request);
      } catch {
        return jsonResponse(
          { error: 'The explanation service is temporarily unavailable.' },
          502,
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
