/**
 * Records a runthrough video of the live site: onboarding -> sprint -> dashboard
 * -> (Pro) practice test. Saves a .webm to scratchpad/video.
 * Usage: node server/record-demo.mjs
 */
import { chromium } from 'playwright';

const URL = 'https://adhdsat.vercel.app';
const VIDEO_DIR = '/private/tmp/claude-501/-Users-aryavora-Desktop-Personal-Projects-adhdsat/2901f605-bfe8-475f-a3be-895b3a43fced/scratchpad/video';
const W = 1280, H = 800;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function step(name, fn) {
  try { await fn(); console.log('ok:', name); }
  catch (e) { console.log('skip:', name, '-', e.message.split('\n')[0]); }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: VIDEO_DIR, size: { width: W, height: H } },
});
const page = await ctx.newPage();
ctx.setDefaultTimeout(6000); // a missed element fails fast instead of stalling the video

await step('load + new user', async () => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await sleep(2500);
});

// --- Onboarding ---
await step('onboarding step 1 (scores)', async () => {
  await page.getByText('Where are you starting', { exact: false }).waitFor({ timeout: 15000 });
  await sleep(1800);
  // nudge a slider for visual life
  const sliders = page.locator('input[type="range"]');
  if (await sliders.count()) { await sliders.first().focus(); for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await sleep(120); } }
  await sleep(1200);
  await page.getByRole('button', { name: /Next: Weak Areas/i }).click();
  await sleep(1400);
});

await step('onboarding step 2 (weak areas)', async () => {
  for (const d of ['Algebra', 'Geometry & Trig', 'Expression of Ideas']) {
    const b = page.getByRole('button', { name: d, exact: true });
    if (await b.count()) { await b.first().click(); await sleep(700); }
  }
  await sleep(1000);
  await page.getByRole('button', { name: /Next: Confirm/i }).click();
  await sleep(1400);
});

await step('onboarding step 3 (target + begin)', async () => {
  await page.getByText('Set Your Target', { exact: false }).waitFor({ timeout: 8000 });
  await sleep(1600);
  await page.getByRole('button', { name: /Begin First Sprint/i }).click();
  await sleep(3500); // first adaptive question loads
});

// --- Sprint: answer a few questions via keyboard (1-4 select, Enter check/advance) ---
await step('wait for first question', async () => {
  await page.getByRole('button', { name: /Check Answer/i }).waitFor({ state: 'visible', timeout: 15000 });
  await sleep(1500);
});
for (let q = 1; q <= 3; q++) {
  await step(`sprint Q${q}`, async () => {
    await page.keyboard.press(String((q % 4) + 1)); // select a choice A-D
    await sleep(1300);
    await page.keyboard.press('Enter'); // check answer
    await sleep(3000); // show correct/incorrect + explanation
    await page.keyboard.press('Enter'); // next question
    await sleep(2500);
  });
}

// --- Dashboard ---
await step('dashboard', async () => {
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  await page.mouse.wheel(0, 500); await sleep(2000);
  await page.mouse.wheel(0, 500); await sleep(2000);
  await page.mouse.wheel(0, -1000); await sleep(1200);
});

// --- Upgrade to Pro, then show the practice test ---
await step('upgrade to Pro', async () => {
  const uid = await page.evaluate(() => localStorage.getItem('userId'));
  if (uid) await page.evaluate(async (id) => {
    await fetch(`/api/users/${id}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'paid' }) });
  }, uid);
  await page.goto(`${URL}/upgrade`, { waitUntil: 'networkidle' });
  await sleep(3000);
});

await step('practice test intro', async () => {
  await page.goto(`${URL}/practice-test`, { waitUntil: 'networkidle' });
  await sleep(3500);
});

await sleep(1000);
await ctx.close(); // finalizes the video
await browser.close();

const fs = await import('fs');
const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
console.log('VIDEO FILES:', files.join(', '));
