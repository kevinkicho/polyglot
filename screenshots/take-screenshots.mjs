import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const DIST = join(__dirname, '..', 'dist');
const OUT = __dirname;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};

const server = createServer((req, res) => {
  let p = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fp = join(DIST, p);
  if (existsSync(fp)) {
    const ext = extname(fp);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(fp));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Server on http://localhost:${port}`);
  const BASE = `http://localhost:${port}`;

  const browser = await chromium.launch({ headless: true });

  const games = [
    'flashcard', 'quiz', 'sentences', 'blanks', 'listening',
    'match', 'memory', 'finder', 'constructor', 'writing',
    'truefalse', 'reverse', 'speech', 'decoder', 'gravity', 'chat'
  ];

  async function screenshot(page, name) {
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
    console.log(`  -> ${name}.png`);
  }

  async function loadApp(page) {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    try {
      await page.waitForFunction(() => {
        const btn = document.getElementById('start-app-btn');
        return btn && !btn.disabled;
      }, { timeout: 15000 });
    } catch(e) {
      console.log('  (start button never enabled)');
    }
    await page.evaluate(() => {
      const btn = document.getElementById('start-app-btn');
      if (btn && !btn.disabled) btn.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const ob = document.getElementById('onboarding-overlay');
      if (ob && !ob.classList.contains('hidden')) {
        const btn = document.getElementById('onboarding-dismiss');
        if (btn) btn.click();
      }
    });
    await page.waitForTimeout(500);
  }

  async function openGame(page, game) {
    await page.evaluate((g) => {
      const btn = document.getElementById(`menu-${g}-btn`);
      if (btn) btn.click();
    }, game);
    await page.waitForTimeout(2500);
  }

  async function closeGame(page) {
    await page.evaluate(() => {
      // Try known close button IDs
      for (const id of ['fc-close-btn', 'quiz-close-btn', 'sent-close-btn',
        'blanks-close-btn', 'listening-close-btn', 'match-close-btn',
        'memory-close-btn', 'find-close-btn', 'const-close-btn',
        'write-close-btn', 'truefalse-close-btn', 'reverse-close-btn',
        'speech-close-btn', 'dec-close-btn', 'grav-close-btn', 'chat-close-btn']) {
        const btn = document.getElementById(id);
        if (btn) { btn.click(); return; }
      }
    });
    await page.waitForTimeout(500);
  }

  async function captureAll(ctx, suffix) {
    const page = await ctx.newPage();
    await loadApp(page);
    await screenshot(page, `01-splash${suffix}`);
    await screenshot(page, `02-menu${suffix}`);

    for (const game of games) {
      await loadApp(page);  // fresh state each time
      await openGame(page, game);
      await screenshot(page, `03-${game}${suffix}`);
      await closeGame(page);
    }
    await page.close();
  }

  console.log('\n=== PORTRAIT (375x667) ===');
  await captureAll(await browser.newContext({ viewport: { width: 375, height: 667 } }), '');

  console.log('\n=== LANDSCAPE (667x375) ===');
  await captureAll(await browser.newContext({ viewport: { width: 667, height: 375 } }), '-landscape');

  await browser.close();
  server.close();
  console.log('\nDone! All screenshots in screenshots/');
});
