/**
 * Security-rules tests for `firestore.rules`, run against the Firestore
 * emulator (no network, no real project, no quota spent).
 *
 *     npm run test:rules
 *
 * Requires Java, which the emulator needs. These cover the two gates the rules
 * enforce: approval (the `approved` custom claim, granted with
 * `npm run access grant <email>`) and ownership (`userId`).
 */
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
};

const env = await initializeTestEnvironment({
  projectId: 'rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const approved   = env.authenticatedContext('alice', { approved: true }).firestore();
const approvedB  = env.authenticatedContext('bob',   { approved: true }).firestore();
const unapproved = env.authenticatedContext('mallory').firestore();
const anon       = env.unauthenticatedContext().firestore();

// Seed one box owned by alice, bypassing the rules.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'boxes/alice-box'), { id: 'alice-box', userId: 'alice', name: 'Alice box' });
  await setDoc(doc(db, 'items/alice-item'), { id: 'alice-item', userId: 'alice', boxId: 'alice-box' });
  await setDoc(doc(db, 'images/alice-img'), { id: 'alice-img', userId: 'alice', full: 'x' });
});

// --- the new gate: approval ---------------------------------------------
await check('unapproved account cannot read its own collection', () =>
  assertFails(getDocs(query(collection(unapproved, 'boxes'), where('userId', '==', 'mallory')))));

await check('unapproved account cannot create a box', () =>
  assertFails(setDoc(doc(unapproved, 'boxes/mallory-box'), { userId: 'mallory', name: 'nope' })));

await check('unapproved account cannot create an item', () =>
  assertFails(setDoc(doc(unapproved, 'items/mallory-item'), { userId: 'mallory' })));

await check('unapproved account cannot create an image', () =>
  assertFails(setDoc(doc(unapproved, 'images/mallory-img'), { userId: 'mallory', full: 'x' })));

await check('signed-out visitor cannot read', () =>
  assertFails(getDoc(doc(anon, 'boxes/alice-box'))));

await check('approved:false claim is not enough', async () => {
  const db = env.authenticatedContext('eve', { approved: false }).firestore();
  await assertFails(setDoc(doc(db, 'boxes/eve-box'), { userId: 'eve' }));
});

// --- the existing gate: ownership still holds ---------------------------
await check('approved owner reads its own box', () =>
  assertSucceeds(getDoc(doc(approved, 'boxes/alice-box'))));

await check('approved owner creates a box', () =>
  assertSucceeds(setDoc(doc(approved, 'boxes/new-box'), { userId: 'alice', name: 'new' })));

await check('approved owner queries own items', () =>
  assertSucceeds(getDocs(query(collection(approved, 'items'), where('userId', '==', 'alice')))));

await check('approved owner deletes its own box', () =>
  assertSucceeds(deleteDoc(doc(approved, 'boxes/new-box'))));

await check('approved stranger cannot read someone else\'s box', () =>
  assertFails(getDoc(doc(approvedB, 'boxes/alice-box'))));

await check('approved stranger cannot delete someone else\'s box', () =>
  assertFails(deleteDoc(doc(approvedB, 'boxes/alice-box'))));

await check('owner cannot hand a box to another user', () =>
  assertFails(setDoc(doc(approved, 'boxes/alice-box'), { userId: 'bob', name: 'stolen' })));

await env.cleanup();

let failed = 0;
for (const [status, name, err] of results) {
  console.log(`${status}  ${name}${err ? `\n        ${err}` : ''}`);
  if (status === 'FAIL') failed++;
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
