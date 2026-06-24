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

  async function loadApp(page) {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    try {
      await page.waitForFunction(() => {
        const btn = document.getElementById('start-app-btn');
        return btn && !btn.disabled;
      }, { timeout: 15000 });
    } catch(e) { console.log('  (start button never enabled)'); }
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

  async function openSettings(page) {
    await page.evaluate(() => {
      const btn = document.getElementById('home-settings-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(800);
    // Open all accordions to see full content
    await page.evaluate(() => {
      document.querySelectorAll('.settings-content').forEach(el => el.classList.add('open'));
      document.querySelectorAll('.arrow').forEach(el => el.classList.add('rotate'));
    });
    await page.waitForTimeout(300);
  }

  const vps = [
    { w: 375, h: 667, label: 'mobile-portrait' },
    { w: 390, h: 844, label: 'iphone14-portrait' },
    { w: 414, h: 896, label: 'iphone11-portrait' },
    { w: 360, h: 800, label: 'galaxy-s21-portrait' },
  ];

  for (const vp of vps) {
    console.log(`\n=== ${vp.label} (${vp.w}x${vp.h}) ===`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await loadApp(page);
    await openSettings(page);

    const issues = await page.evaluate(() => {
      const issues = [];
      const modal = document.getElementById('settings-modal');
      if (!modal || modal.classList.contains('hidden')) return ['Settings modal is hidden'];

      const content = modal.querySelector('.relative.z-10');
      if (!content) return ['Content container not found'];

      const cr = content.getBoundingClientRect();

      // Check if modal is crushed (width less than 70% of viewport)
      const widthRatio = cr.width / window.innerWidth;
      if (widthRatio < 0.7) {
        issues.push(`Modal width ${Math.round(cr.width)}px = ${Math.round(widthRatio * 100)}% of viewport (${window.innerWidth}px) — crushed`);
      }

      // Check if it's less than reasonable minimum
      if (cr.width < 280) {
        issues.push(`Modal too narrow: ${Math.round(cr.width)}px`);
      }

      // Check horizontal overflow inside modal
      const allInner = content.querySelectorAll('*');
      allInner.forEach(el => {
        const er = el.getBoundingClientRect();
        if (er.width > cr.width + 2 && el.children.length === 0 && el.textContent?.trim()) {
          const text = el.textContent.trim().substring(0, 40);
          issues.push(`Overflow: "${text}" (${Math.round(er.width)}px > ${Math.round(cr.width)}px modal)`);
        }
        if (er.right > cr.right + 2 && er.width > 10) {
          const text = String(el.textContent || el.className || '').trim().substring(0, 30);
          issues.push(`Hangs right: "${text}" right=${Math.round(er.right)} > modal-right=${Math.round(cr.right)}`);
        }
      });

      // Check the selects specifically
      content.querySelectorAll('select').forEach(el => {
        const er = el.getBoundingClientRect();
        if (er.width < 120) {
          issues.push(`Select too narrow: ${Math.round(er.width)}px`);
        }
      });

      // Check toggle rows
      content.querySelectorAll('.flex.justify-between').forEach(el => {
        const er = el.getBoundingClientRect();
        const children = el.querySelectorAll('*');
        let maxChildRight = 0;
        children.forEach(c => { const r = c.getBoundingClientRect(); if (r.right > maxChildRight) maxChildRight = r.right; });
        if (maxChildRight > cr.right + 2) {
          const label = el.querySelector('span')?.textContent?.trim().substring(0, 25) || 'unknown';
          issues.push(`Toggle row overflow: "${label}" extends to ${Math.round(maxChildRight)}px (modal right: ${Math.round(cr.right)}px)`);
        }
      });

      return issues;
    });

    if (issues.length) {
      console.log(`  Issues (${issues.length}):`);
      issues.forEach(i => console.log(`    - ${i}`));
    } else {
      console.log('  OK');
    }

    // Take screenshot
    await page.screenshot({ path: join(OUT, `settings-${vp.label}.png`), fullPage: false });
    console.log(`  -> settings-${vp.label}.png`);

    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log('\nDone!');
});
