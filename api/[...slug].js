// Catch-all Vercel serverless function that proxies all /api/* requests to Express.
// Vercel auto-detects files in api/ as functions; this catch-all covers every route.
import app from '../server/index.js';
export default app;
