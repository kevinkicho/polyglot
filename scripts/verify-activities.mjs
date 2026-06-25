import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const DIR = '/mnt/c/Users/kevin/Desktop/polyglot-main/screenshots/verify';
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const BASE = 'http://localhost:8080';
const results = [];
const log = console.log;
const rec = (g, s, d='') => { results.push({game:g, status:s, detail:d}); log(`  ${s==='PASS'?'✅':'❌'} ${g}: ${s}${d?' — '+d:''}`); };

let shotN = 0;

async function runBatch(games, batchName) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  async function shot(name) { shotN++; await page.screenshot({ path: `${DIR}/${String(shotN).padStart(2,'0')}-${name}.png` }); }

  async function nav() {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForFunction(() => !document.body.classList.contains('is-loading'), { timeout: 12000 });
    } catch {
      await page.evaluate(() => {
        document.body.classList.remove('is-loading');
        const s = document.getElementById('splash-screen');
        if (s) s.style.display = 'none';
      });
    }
    await page.waitForTimeout(500);
  }

  log(`\n═══ BATCH: ${batchName} ═══`);

  for (const id of games) {
    log(`\n─── ${id.toUpperCase()} ───`);
    const before = errors.length;
    try {
      await nav();
      const btn = `#menu-${id}-btn`;
      if (!await page.isVisible(btn)) { rec(id, 'FAIL', 'menu button missing'); continue; }
      await page.click(btn);
      await page.waitForTimeout(2500);
      await shot(id);

      const viewVisible = await page.evaluate((gid) => {
        const el = document.getElementById(`${gid}-view`);
        return el && !el.classList.contains('hidden');
      }, id);
      rec(`${id} - view`, viewVisible ? 'PASS' : 'FAIL', viewVisible ? 'visible' : 'NOT visible');

      const content = await page.evaluate((gid) => {
        const el = document.getElementById(`${gid}-view`);
        return el ? el.innerText.trim().length : 0;
      }, id);
      rec(`${id} - content`, content > 10 ? 'PASS' : 'FAIL', `${content} chars`);

      const newE = errors.slice(before);
      if (newE.length) rec(`${id} - errors`, 'WARN', newE.slice(0,2).join('; '));
    } catch (e) {
      rec(id, 'FAIL', e.message.slice(0, 80));
    }
  }

  await browser.close();
}

async function runInteraction(label, fn) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  let shotN_local = 0;

  async function shot(name) { shotN++; await page.screenshot({ path: `${DIR}/${String(shotN).padStart(2,'0')}-${name}.png` }); }

  async function nav() {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForFunction(() => !document.body.classList.contains('is-loading'), { timeout: 12000 });
    } catch {
      await page.evaluate(() => {
        document.body.classList.remove('is-loading');
        const s = document.getElementById('splash-screen');
        if (s) s.style.display = 'none';
      });
    }
    await page.waitForTimeout(500);
  }

  try { await fn(page, nav, shot, rec, label); }
  catch (e) { rec(label, 'FAIL', e.message.slice(0, 80)); }
  await browser.close();
}

async function main() {
  log('Running Playwright verification in batches...\n');

  // Batch 1: Home + Settings
  await runBatch([], 'HOME & SETTINGS');
  // (do home/settings inline)
  const b1 = await chromium.launch({ headless: true });
  const c1 = await b1.newContext({ viewport: { width: 390, height: 844 } });
  const p1 = await c1.newPage();
  async function sht(n) { shotN++; await p1.screenshot({ path: `${DIR}/${String(shotN).padStart(2,'0')}-${n}.png` }); }
  async function n1() {
    await p1.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await p1.waitForFunction(() => !document.body.classList.contains('is-loading'), { timeout: 12000 }); } catch {
      await p1.evaluate(() => { document.body.classList.remove('is-loading'); const s = document.getElementById('splash-screen'); if (s) s.style.display = 'none'; });
    }
    await p1.waitForTimeout(500);
  }

  log('\n═══ HOME ═══');
  await n1(); await sht('home');
  rec('Menu header', await p1.isVisible('#menu-header') ? 'PASS' : 'FAIL');
  rec('Settings btn', await p1.isVisible('#home-settings-btn') ? 'PASS' : 'FAIL');
  rec('Main menu', await p1.isVisible('#main-menu') ? 'PASS' : 'FAIL');
  const menuBtns = await p1.evaluate(() => document.querySelectorAll('[id^="menu-"][id$="-btn"]').length);
  rec('Menu buttons', menuBtns >= 16 ? 'PASS' : 'FAIL', `${menuBtns} buttons`);

  log('\n═══ SETTINGS ═══');
  await p1.click('#home-settings-btn'); await p1.waitForTimeout(500); await sht('settings');
  rec('Settings modal', await p1.isVisible('#settings-modal') ? 'PASS' : 'FAIL');
  rec('Dark toggle', await p1.isVisible('#toggle-dark') ? 'PASS' : 'FAIL');
  rec('Volume slider', await p1.isVisible('#volume-slider') ? 'PASS' : 'FAIL');
  rec('Auto-play', await p1.isVisible('#toggle-autoplay') ? 'PASS' : 'FAIL');
  rec('Reading', await p1.isVisible('#toggle-reading') ? 'PASS' : 'FAIL');
  rec('Combo effects', await p1.isVisible('#toggle-combo-effects') ? 'PASS' : 'FAIL');
  await p1.click('#toggle-dark'); await p1.waitForTimeout(300); await sht('dark');
  rec('Dark mode on', await p1.evaluate(() => document.documentElement.classList.contains('dark')) ? 'PASS' : 'FAIL');
  await p1.click('#toggle-dark'); await p1.waitForTimeout(200);
  await p1.click('#modal-close-x'); await p1.waitForTimeout(200);
  await b1.close();

  // Batch 2: Games 1-8
  await runBatch(['flashcard','quiz','sentences','blanks','listening','match','memory','finder'], 'GAMES 1-8');

  // Batch 3: Games 9-16
  await runBatch(['constructor','writing','truefalse','reverse','speech','decoder','gravity','chat'], 'GAMES 9-16');

  // Interactions
  log('\n═══ INTERACTIONS ═══');

  await runInteraction('Quiz click', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-quiz-btn'); await page.waitForTimeout(2500);
    const opts = await page.$$('.quiz-option');
    if (opts.length) { await opts[0].click(); await page.waitForTimeout(1000); await shot('quiz-click');
      rec('Quiz feedback', await page.evaluate(() => !!document.querySelector('.bg-green-500, .bg-red-500')) ? 'PASS' : 'FAIL');
    } else rec('Quiz feedback', 'FAIL', 'no options');
  });

  await runInteraction('Flashcard flip', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-flashcard-btn'); await page.waitForTimeout(2500);
    if (await page.isVisible('.card-scene')) { await page.click('.card-scene'); await page.waitForTimeout(800); await shot('flip');
      rec('Flashcard flip', await page.evaluate(() => !!document.querySelector('.card-inner.is-flipped')) ? 'PASS' : 'FAIL');
    } else rec('Flashcard flip', 'FAIL');
  });

  await runInteraction('TrueFalse', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-truefalse-btn'); await page.waitForTimeout(2500);
    if (await page.isVisible('#btn-true')) { await page.click('#btn-true'); await page.waitForTimeout(1000); await shot('tf-click'); rec('TrueFalse click', 'PASS');
    } else rec('TrueFalse click', 'FAIL');
  });

  await runInteraction('Writing input', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-writing-btn'); await page.waitForTimeout(2500);
    if (await page.isVisible('#write-input')) { await page.fill('#write-input', 'hello'); const v = await page.inputValue('#write-input'); rec('Writing input', v === 'hello' ? 'PASS' : 'FAIL');
    } else rec('Writing input', 'FAIL');
  });

  await runInteraction('Reverse click', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-reverse-btn'); await page.waitForTimeout(2500);
    const btns = await page.$$('.choice-btn');
    if (btns.length) { await btns[0].click(); await page.waitForTimeout(1500); rec('Reverse click', 'PASS');
    } else rec('Reverse click', 'FAIL');
  });

  await runInteraction('Match cards', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-match-btn'); await page.waitForTimeout(2500);
    const mc = await page.evaluate(() => document.querySelectorAll('.match-card').length);
    rec('Match cards', mc > 0 ? 'PASS' : 'FAIL', `${mc} cards`);
  });

  await runInteraction('Memory cards', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-memory-btn'); await page.waitForTimeout(2500);
    const mm = await page.evaluate(() => document.querySelectorAll('.mem-card').length);
    rec('Memory cards', mm > 0 ? 'PASS' : 'FAIL', `${mm} cards`);
  });

  await runInteraction('Finder cells', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-finder-btn'); await page.waitForTimeout(2500);
    const fc = await page.evaluate(() => document.querySelectorAll('.find-cell, .find-choice').length);
    rec('Finder cells', fc > 0 ? 'PASS' : 'FAIL', `${fc} cells`);
  });

  await runInteraction('Constructor tiles', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-constructor-btn'); await page.waitForTimeout(2500);
    const ct = await page.evaluate(() => document.querySelectorAll('.choice-tile').length);
    rec('Constructor tiles', ct > 0 ? 'PASS' : 'FAIL', `${ct} tiles`);
  });

  await runInteraction('Sentences pool', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-sentences-btn'); await page.waitForTimeout(2500);
    const sp = await page.evaluate(() => document.querySelectorAll('.pool-btn').length);
    rec('Sentences pool', sp > 0 ? 'PASS' : 'FAIL', `${sp} buttons`);
  });

  await runInteraction('Blanks options', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-blanks-btn'); await page.waitForTimeout(2500);
    const bo = await page.evaluate(() => document.querySelectorAll('.quiz-option, .blank-option').length);
    rec('Blanks options', bo > 0 ? 'PASS' : 'FAIL', `${bo} options`);
  });

  await runInteraction('Decoder tiles', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-decoder-btn'); await page.waitForTimeout(2500);
    const dt = await page.evaluate(() => document.querySelectorAll('.choice-tile').length);
    rec('Decoder tiles', dt > 0 ? 'PASS' : 'FAIL', `${dt} tiles`);
  });

  await runInteraction('Listening play', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-listening-btn'); await page.waitForTimeout(2500);
    rec('Listening play', await page.isVisible('#listening-play-btn') ? 'PASS' : 'FAIL');
  });

  await runInteraction('Speech mic', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-speech-btn'); await page.waitForTimeout(2500);
    rec('Speech mic', await page.isVisible('#mic-btn') ? 'PASS' : 'FAIL');
  });

  await runInteraction('Gravity area', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-gravity-btn'); await page.waitForTimeout(2500);
    rec('Gravity area', await page.isVisible('#grav-game-area') ? 'PASS' : 'FAIL');
  });

  await runInteraction('Chat modes', async (page, nav, shot, rec) => {
    await nav(); await page.click('#menu-chat-btn'); await page.waitForTimeout(2500);
    rec('Chat input', await page.isVisible('#chat-input') ? 'PASS' : 'FAIL');
    const cm = await page.evaluate(() => document.querySelectorAll('.chat-mode-btn').length);
    rec('Chat modes', cm >= 8 ? 'PASS' : 'FAIL', `${cm} modes`);
  });

  // ═══ SUMMARY ═══
  log('\n══════════════════════════════════════');
  log('  FINAL SUMMARY');
  log('══════════════════════════════════════');
  const p = results.filter(r => r.status === 'PASS').length;
  const f = results.filter(r => r.status === 'FAIL').length;
  const w = results.filter(r => r.status === 'WARN').length;
  log(`  Total: ${results.length} — ✅ ${p} passed, ❌ ${f} failed, ⚠️ ${w} warnings`);
  if (f) {
    log('\n  FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => log(`    ❌ ${r.game}: ${r.detail}`));
  }
  log(`\nDone. ${shotN} screenshots → screenshots/verify/`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
