import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const DIR = '/mnt/c/Users/kevin/Desktop/polyglot-main/screenshots/verify';
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const BASE = 'http://localhost:8080';
const results = [];
const log = console.log;

async function test(name, fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForFunction(() => !document.body.classList.contains('is-loading'), { timeout: 12000 }); } catch {
      await page.evaluate(() => { document.body.classList.remove('is-loading'); document.getElementById('splash-screen')?.remove(); });
    }
    await page.waitForTimeout(500);
    const result = await fn(page);
    results.push({ name, status: 'PASS', detail: result || '' });
    log(`  ✅ ${name}: PASS${result ? ' — ' + result : ''}`);
  } catch (e) {
    results.push({ name, status: 'FAIL', detail: e.message.slice(0, 100) });
    log(`  ❌ ${name}: FAIL — ${e.message.slice(0, 100)}`);
  }
  await browser.close();
}

log('Running interaction tests (one browser each)...\n');

await test('Quiz: click option', async (p) => {
  await p.click('#menu-quiz-btn'); await p.waitForTimeout(2500);
  const opts = await p.$$('.quiz-option');
  if (!opts.length) throw new Error('no options');
  await opts[0].click(); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${DIR}/interact-quiz.png` });
  const fb = await p.evaluate(() => !!document.querySelector('.bg-green-500, .bg-red-500'));
  if (!fb) throw new Error('no feedback color');
  return 'feedback shown';
});

await test('Flashcard: flip', async (p) => {
  await p.click('#menu-flashcard-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#flashcard-container')) throw new Error('no flashcard-container');
  await p.click('#flashcard-container'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${DIR}/interact-flashcard.png` });
  const f = await p.evaluate(() => !!document.querySelector('.card-inner.rotate-y-180, .card-inner[class*="rotate"]'));
  if (!f) throw new Error('not flipped');
  return 'card flipped';
});

await test('TrueFalse: click True', async (p) => {
  await p.click('#menu-truefalse-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#btn-true')) throw new Error('no True btn');
  await p.click('#btn-true'); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${DIR}/interact-truefalse.png` });
  return 'True clicked';
});

await test('Writing: type input', async (p) => {
  await p.click('#menu-writing-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#writing-input')) throw new Error('no input');
  await p.fill('#writing-input', 'hello');
  const v = await p.inputValue('#writing-input');
  if (v !== 'hello') throw new Error(`val="${v}"`);
  return 'typed hello';
});

await test('Reverse: click choice', async (p) => {
  await p.click('#menu-reverse-btn'); await p.waitForTimeout(2500);
  const btns = await p.$$('.choice-btn');
  if (!btns.length) throw new Error('no choices');
  await btns[0].click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${DIR}/interact-reverse.png` });
  return 'choice clicked';
});

await test('Match: cards exist', async (p) => {
  await p.click('#menu-match-btn'); await p.waitForTimeout(2500);
  const mc = await p.evaluate(() => document.querySelectorAll('.match-card').length);
  if (mc === 0) throw new Error('no cards');
  return `${mc} cards`;
});

await test('Memory: cards exist', async (p) => {
  await p.click('#menu-memory-btn'); await p.waitForTimeout(2500);
  const mm = await p.evaluate(() => document.querySelectorAll('.mem-card').length);
  if (mm === 0) throw new Error('no cards');
  return `${mm} cards`;
});

await test('Finder: cells exist', async (p) => {
  await p.click('#menu-finder-btn'); await p.waitForTimeout(2500);
  const fc = await p.evaluate(() => document.querySelectorAll('.find-cell, .find-choice').length);
  if (fc === 0) throw new Error('no cells');
  return `${fc} cells`;
});

await test('Constructor: tiles exist', async (p) => {
  await p.click('#menu-constructor-btn'); await p.waitForTimeout(2500);
  const ct = await p.evaluate(() => document.querySelectorAll('.choice-tile').length);
  if (ct === 0) throw new Error('no tiles');
  return `${ct} tiles`;
});

await test('Sentences: pool exists', async (p) => {
  await p.click('#menu-sentences-btn'); await p.waitForTimeout(2500);
  const sp = await p.evaluate(() => document.querySelectorAll('.pool-btn').length);
  if (sp === 0) throw new Error('no pool buttons');
  return `${sp} buttons`;
});

await test('Blanks: options exist', async (p) => {
  await p.click('#menu-blanks-btn'); await p.waitForTimeout(2500);
  const bo = await p.evaluate(() => document.querySelectorAll('.quiz-option, .blank-option').length);
  if (bo === 0) throw new Error('no options');
  return `${bo} options`;
});

await test('Decoder: tiles exist', async (p) => {
  await p.click('#menu-decoder-btn'); await p.waitForTimeout(2500);
  const dt = await p.evaluate(() => document.querySelectorAll('.choice-tile').length);
  if (dt === 0) throw new Error('no tiles');
  return `${dt} tiles`;
});

await test('Listening: play btn', async (p) => {
  await p.click('#menu-listening-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#listening-play-btn')) throw new Error('no play btn');
  return 'play btn visible';
});

await test('Speech: mic btn', async (p) => {
  await p.click('#menu-speech-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#mic-btn')) throw new Error('no mic btn');
  return 'mic btn visible';
});

await test('Gravity: game area', async (p) => {
  await p.click('#menu-gravity-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#grav-game-area')) throw new Error('no game area');
  return 'game area visible';
});

await test('Chat: input + modes', async (p) => {
  await p.click('#menu-chat-btn'); await p.waitForTimeout(2500);
  if (!await p.isVisible('#chat-input')) throw new Error('no input');
  const cm = await p.evaluate(() => document.querySelectorAll('.chat-mode-btn').length);
  if (cm < 8) throw new Error(`${cm} modes (need 8)`);
  return `${cm} modes`;
});

log('\n══════════════════════════════════════');
log('  INTERACTION SUMMARY');
log('══════════════════════════════════════');
const p = results.filter(r => r.status === 'PASS').length;
const f = results.filter(r => r.status === 'FAIL').length;
log(`  Total: ${results.length} — ✅ ${p} passed, ❌ ${f} failed`);
if (f) {
  log('\n  FAILURES:');
  results.filter(r => r.status === 'FAIL').forEach(r => log(`    ❌ ${r.name}: ${r.detail}`));
}
