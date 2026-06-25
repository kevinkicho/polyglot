/**
 * Seed script: uploads B1 vocabulary data to Firebase Realtime Database.
 *
 * Usage:
 *   node scripts/seed-b1-vocab.mjs
 *
 * Prerequisites:
 *   - Node.js 18+
 *   - Firebase service account key (see below)
 *
 * Setup:
 *   1. Go to Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate New Private Key" and save as scripts/serviceAccountKey.json
 *   3. Install dependencies: npm install firebase-admin
 *   4. Run: node scripts/seed-b1-vocab.mjs
 *
 * The script will:
 *   - Push each entry under the vocab/ path
 *   - Skip entries whose id already exists (idempotent)
 *   - Report progress and summary
 *
 * IDs start at 50000 to avoid collisions with existing data.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Firebase Admin Setup ──────────────────────────────────────────
let firebaseAdmin;
let db;

try {
  const mod = await import('firebase-admin');
  firebaseAdmin = mod.default || mod;
} catch {
  console.error('Missing dependency: firebase-admin');
  console.error('Install it with: npm install firebase-admin');
  process.exit(1);
}

const keyPath = process.env.SERVICE_ACCOUNT_KEY || join(__dirname, 'serviceAccountKey.json');
let serviceAccount;

try {
  const raw = readFileSync(keyPath, 'utf8');
  serviceAccount = JSON.parse(raw);
} catch {
  console.error(`Missing service account key: ${keyPath}`);
  console.error('Generate one from Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: 'https://polyglot121725-default-rtdb.firebaseio.com',
});

db = firebaseAdmin.database();

// ── Data ──────────────────────────────────────────────────────────
const { b1VocabData } = await import('./b1-vocab-data.mjs');

// ── Seed Logic ────────────────────────────────────────────────────
async function seed() {
  console.log(`Seeding ${b1VocabData.length} B1 vocabulary entries...\n`);

  // Check which IDs already exist to avoid duplicates
  const existingSnap = await db.ref('vocab').orderByChild('id').once('value');
  const existingIds = new Set();

  if (existingSnap.exists()) {
    existingSnap.forEach(child => {
      const val = child.val();
      if (val && val.id !== undefined) existingIds.add(Number(val.id));
    });
  }

  console.log(`Found ${existingIds.size} existing vocab entries in database.`);

  let added = 0;
  let skipped = 0;
  const updates = {};

  for (const entry of b1VocabData) {
    if (existingIds.has(entry.id)) {
      console.log(`  SKIP id=${entry.id} "${entry.en}" (already exists)`);
      skipped++;
      continue;
    }

    const newKey = db.ref('vocab').push().key;
    updates[`vocab/${newKey}`] = entry;
    added++;

    if (added % 10 === 0) {
      console.log(`  Prepared ${added} / ${b1VocabData.length} entries...`);
    }
  }

  if (added > 0) {
    console.log(`\nWriting ${added} entries to Firebase...`);
    await db.ref().update(updates);
    console.log(`\nDone! Added ${added} entries, skipped ${skipped} (already existed).`);
  } else {
    console.log(`\nAll ${b1VocabData.length} entries already exist. Nothing to seed.`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});