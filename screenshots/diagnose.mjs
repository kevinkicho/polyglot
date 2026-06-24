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

  const viewportSizes = [
    { width: 375, height: 667, label: 'mobile-portrait' },
    { width: 667, height: 375, label: 'mobile-landscape' },
    { width: 390, height: 844, label: 'iphone14-portrait' },
  ];

  for (const vp of viewportSizes) {
    console.log(`\n========== ${vp.label} (${vp.width}x${vp.height}) ==========`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();

    await loadApp(page);

    const menuIssues = await page.evaluate(() => {
      const issues = [];
      // Check main menu layout
      const menu = document.getElementById('main-menu');
      if (menu) {
        const items = menu.querySelectorAll('[class*="p-6"]');
        items.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          const text = el.textContent?.trim().substring(0, 30);
          if (rect.width < 100) issues.push(`Menu item "${text}" too narrow: ${rect.width}px`);
          if (rect.height < 60) issues.push(`Menu item "${text}" too short: ${rect.height}px`);
        });
      }
      // Check SRS dashboard visibility
      const srs = document.getElementById('srs-dashboard');
      if (srs && srs.classList.contains('hidden')) issues.push('SRS dashboard hidden');
      return issues;
    });
    if (menuIssues.length) {
      console.log('  Menu issues:', menuIssues);
    } else {
      console.log('  Menu: OK');
    }

    for (const game of games) {
      await loadApp(page);
      await openGame(page, game);

      const issues = await page.evaluate((g) => {
        const issues = [];
        const view = document.getElementById(`${g}-view`);
        if (!view) { return [`View #${g}-view not found`]; }

        const rect = view.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          issues.push('View has zero dimensions (hidden)');
          return issues;
        }

        const cname = (el) => String(el.className || el.id || '').trim().substring(0, 30);

        // 1. Check for overlapping fixed elements
        const fixedEls = view.querySelectorAll('.fixed, [style*="position: fixed"], [style*="position:fixed"]');
        fixedEls.forEach((el) => {
          const er = el.getBoundingClientRect();
          if (er.bottom > window.innerHeight) {
            issues.push(`Fixed element "${cname(el)}" extends below viewport (bottom=${er.bottom} > vh=${window.innerHeight})`);
          }
          if (er.right > window.innerWidth) {
            issues.push(`Fixed element "${cname(el)}" extends right of viewport (right=${er.right} > vw=${window.innerWidth})`);
          }
        });

        // 2. Check for horizontal overflow
        const allEls = view.querySelectorAll('*');
        allEls.forEach((el) => {
          const er = el.getBoundingClientRect();
          if (er.width > window.innerWidth + 5 && el.children.length === 0 && el.textContent?.trim()) {
            const text = el.textContent.trim().substring(0, 40);
            if (er.width > window.innerWidth * 0.9) {
              issues.push(`Overflow: "${text}" (${er.width}px > ${window.innerWidth}px)`);
            }
          }
          // Check elements extending beyond right edge
          if (er.right > window.innerWidth + 5 && er.width > 10) {
            issues.push(`Overhang right: "${cname(el)}" right=${Math.round(er.right)} vw=${window.innerWidth}`);
          }
        });

        // 3. Check small touch targets
        const clickable = view.querySelectorAll('button, [role="button"], [onclick], a, input, select, textarea');
        clickable.forEach((el) => {
          const er = el.getBoundingClientRect();
          if (er.width > 0 && er.height > 0) {
            if (er.width < 44 && er.height < 44) {
              const text = String(el.textContent || el.id || cname(el)).trim().substring(0, 25);
              const isIcon = !el.textContent?.trim() || el.textContent.trim().length <= 2;
              if (!isIcon) {
                issues.push(`Small target: "${text}" ${Math.round(er.width)}x${Math.round(er.height)}px`);
              }
            }
          }
        });

        // 4. Check z-index stacking
        const zHigh = view.querySelectorAll('[style*="z-index"], [class*="z-"]');
        zHigh.forEach((el) => {
          const z = window.getComputedStyle(el).zIndex;
          if (parseInt(z) > 100) {
            issues.push(`High z-index: ${cname(el)} z=${z}`);
          }
        });

        // 5. Check for elements with very small font size that aren't icons
        allEls.forEach((el) => {
          if (el.children.length === 0 && el.textContent?.trim()) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            const text = el.textContent.trim();
            if (fs < 10 && text.length > 1) {
              issues.push(`Tiny font: "${text.substring(0, 30)}" ${fs}px`);
            }
          }
        });

        // 6. Check bottom bars for keyboard overlap risk
        const bottomFixed = view.querySelectorAll('.fixed.bottom-0, [style*="bottom: 0"]');
        bottomFixed.forEach((el) => {
          const er = el.getBoundingClientRect();
          if (er.top < window.innerHeight - 100) {
            issues.push(`Bottom bar too tall: ${Math.round(er.height)}px`);
          }
        });

        return issues;
      }, game);

      if (issues.length) {
        console.log(`  ${game}: ${issues.length} issue(s)`);
        issues.forEach(i => console.log(`    - ${i}`));
      } else {
        console.log(`  ${game}: OK`);
      }
    }

    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log('\nDone!');
});
