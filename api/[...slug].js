// Catch-all Vercel serverless function that proxies all /api/* requests to Express.
import app from '../server/index.js';

export default (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Route to Express app
  try {
    app(req, res);
  } catch (err) {
    console.error('[API Critical Error]', err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
