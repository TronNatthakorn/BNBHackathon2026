// https://atlas-oracle-proxy.tron-natthakorn.workers.dev

const ALLOW_ALL = false;
const ALLOWED_ORIGINS = ['https://torlondev.js.org'];
const ENDPOINTS = {
  '/api/search': 'https://api.atlasoracle.io/oracle/user/v1/oracle-feed/search',
  '/api/price/latest': 'https://api.atlasoracle.io/report/v1/price/latest',
};

const cors = (request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
    'Vary': 'Origin',
  };
  if (ALLOW_ALL) headers['Access-Control-Allow-Origin'] = '*';
  else if (ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

const reply = (body, status, headers) =>
  new Response(body, { status, headers });

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const headers = cors(request);
    const upstreamUrl = ENDPOINTS[pathname];

    if (!upstreamUrl) return reply('Not found', 404, headers);
    if (request.method === 'OPTIONS') return reply(null, 204, headers);
    if (request.method !== 'POST') return reply('Method not allowed', 405, headers);

    if (pathname === '/api/search') {
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await request.text(),
      });
      return reply(upstream.body, upstream.status, { ...headers, 'Content-Type': 'application/json' });
    }

    if (!headers['Access-Control-Allow-Origin']) return reply('Forbidden', 403, headers);

    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) return reply('Missing X-API-KEY header', 401, headers);

    let body;
    try {
      body = await request.json();
    } catch {
      return reply('Invalid JSON', 400, headers);
    }

    const { feedIds } = body;
    const valid = Array.isArray(feedIds) && feedIds.length > 0 &&
      feedIds.every((id) => typeof id === 'string' || typeof id === 'number');
    if (!valid) return reply('feedIds must be a non-empty array', 400, headers);

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ feedIds: feedIds.map(String), sign: true }),
    });
    return reply(upstream.body, upstream.status, { ...headers, 'Content-Type': 'application/json' });
  },
};