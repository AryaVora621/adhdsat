// Loads Desmos's official calculator.js exactly once per page session and
// resolves when window.Desmos is ready. A plain iframe of desmos.com is
// blocked by X-Frame-Options, so the real embed API is the only supported
// path (see docs/superpowers/specs/2026-07-05-bluebook-features-design.md).
let loadPromise = null;

export function loadDesmosCalculatorScript() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.Desmos) { resolve(); return; }
    const apiKey = import.meta.env.VITE_DESMOS_API_KEY;
    // Desmos returns 200 with a degraded/watermarked widget for a bad key
    // rather than erroring, so a missing key must fail before script injection.
    if (!apiKey) { reject(new Error('Missing VITE_DESMOS_API_KEY, cannot load Desmos calculator script')); return; }
    const script = document.createElement('script');
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Desmos calculator script'));
    document.head.appendChild(script);
  }).catch((err) => {
    // Clear the cached promise on failure so the next call retries instead
    // of being stuck with a permanently rejected promise for the page session.
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}
