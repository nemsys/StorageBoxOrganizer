#!/usr/bin/env node
/**
 * Access control for Storage Box Organizer.
 *
 * Anyone can create an account — the Firebase web API key ships inside the
 * client bundle, so sign-up cannot be gated in the UI. What *is* gated is the
 * data: `firestore.rules` refuses every read and write unless the account
 * carries the `approved` custom claim. This script is how that claim is
 * granted and revoked, and therefore the only way anyone gets to spend the
 * project's free-tier quota.
 *
 * Usage:
 *   npm run access                  # list every account and its status
 *   npm run access grant <email>    # let someone in  (email or uid)
 *   npm run access revoke <email>   # lock someone out (email or uid)
 *
 * A newly granted account picks the claim up on its next token refresh — the
 * app's "Check again" button forces one, and signing out and back in always
 * works.
 */
import { auth, projectId } from './lib/admin.js';

const USAGE = `
Usage:
  npm run access                  list every account and its approval status
  npm run access grant  <email>   approve an account (email or uid)
  npm run access revoke <email>   remove approval (email or uid)
`;

async function findUser(input) {
    return input.includes('@')
        ? await auth.getUserByEmail(input)
        : await auth.getUser(input);
}

async function list() {
    const { users } = await auth.listUsers(1000);

    if (users.length === 0) {
        console.log('No accounts exist in this project yet.');
        return;
    }

    console.log(`\nAccounts in ${projectId}:\n`);
    for (const user of users) {
        const ok = user.customClaims?.approved === true;
        const mark = ok ? '  APPROVED' : '  blocked ';
        console.log(`${mark}  ${(user.email || '(no email)').padEnd(34)}  ${user.uid}`);
    }

    const approved = users.filter((u) => u.customClaims?.approved === true).length;
    console.log(`\n${approved} of ${users.length} approved.\n`);
}

async function setApproval(input, approved) {
    const user = await findUser(input);

    // setCustomUserClaims replaces the whole claims object, so merge rather
    // than clobber anything else that may have been set on the account.
    const claims = { ...(user.customClaims || {}) };
    if (approved) {
        claims.approved = true;
    } else {
        delete claims.approved;
    }

    await auth.setCustomUserClaims(user.uid, claims);

    console.log(
        approved
            ? `\nApproved ${user.email || user.uid}.\n\n` +
              'They will get in on their next token refresh — the "Check again"\n' +
              'button in the app forces one, and signing out and back in always works.\n'
            : `\nRevoked ${user.email || user.uid}.\n\n` +
              'Their existing ID token stays valid for up to an hour; after that\n' +
              'every read and write is refused. Their data is left untouched.\n'
    );
}

async function main() {
    const [command, target] = process.argv.slice(2);

    try {
        if (!command || command === 'list') {
            await list();
        } else if (command === 'grant' || command === 'revoke') {
            if (!target) {
                console.error(`\n"${command}" needs an email or uid.\n${USAGE}`);
                process.exitCode = 1;
                return;
            }
            await setApproval(target, command === 'grant');
        } else {
            console.error(`\nUnknown command "${command}".\n${USAGE}`);
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('\nError:', error.message, '\n');
        process.exitCode = 1;
    }
}

main();
