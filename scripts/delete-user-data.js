import { db, auth } from './lib/admin.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deleteUserData() {
    let input = process.argv[2];
    let targetUid = '';
    let targetEmail = '';

    try {
        // Mode 1: Interactive Selection (No argument provided)
        if (!input) {
            console.log('\n--- Fetching User List ---');
            const listUsersResult = await auth.listUsers(100);
            const users = listUsersResult.users;

            if (users.length === 0) {
                console.log('No users found in Firebase Auth.');
                process.exit(0);
            }

            console.log('\nRegistered Users:');
            users.forEach((user, index) => {
                console.log(`[${index + 1}] ${user.email.padEnd(30)} | UID: ${user.uid}`);
            });

            const choice = await question('\nSelect a number, or enter an email/UID: ');
            const index = parseInt(choice) - 1;

            if (index >= 0 && index < users.length) {
                targetUid = users[index].uid;
                targetEmail = users[index].email;
            } else {
                input = choice; // Fallback to treat input as email/uid
            }
        }

        // Mode 2: Direct lookup by Email or UID (if not already found)
        if (!targetUid && input) {
            if (input.includes('@')) {
                console.log(`Looking up user by email: ${input}...`);
                const user = await auth.getUserByEmail(input);
                targetUid = user.uid;
                targetEmail = user.email;
            } else {
                console.log(`Looking up user by UID: ${input}...`);
                const user = await auth.getUser(input);
                targetUid = user.uid;
                targetEmail = user.email;
            }
        }

        if (!targetUid) {
            throw new Error('No valid user identified.');
        }

        // Final Safeguard - Confirmation
        console.log(`\n\n****************************************************`);
        console.log(`* WARNING: IRREVERSIBLE DATA DELETION              *`);
        console.log(`****************************************************`);
        console.log(`* Target User:  ${targetEmail}`);
        console.log(`* Target UID:   ${targetUid}`);
        console.log(`* Collections:  boxes, items`);
        console.log(`****************************************************`);
        
        const confirm = await question(`\nTo confirm deletion of ALL data for this user, type "DELETE": `);
        
        if (confirm !== 'DELETE') {
            console.log('\nOperation cancelled. No data was deleted.');
            process.exit(0);
        }

        console.log('\nStarting deletion process...');

        const collections = ['boxes', 'items'];
        
        for (const collectionName of collections) {
            const snapshot = await db.collection(collectionName).where('userId', '==', targetUid).get();
            
            if (snapshot.empty) {
                console.log(`- ${collectionName.padEnd(6)}: No documents found.`);
                continue;
            }

            console.log(`- ${collectionName.padEnd(6)}: Deleting ${snapshot.size} documents...`);
            
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`  Done.`);
        }

        console.log('\nCleanup completed successfully!');

    } catch (error) {
        console.error('\nError:', error.message);
    } finally {
        rl.close();
        process.exit();
    }
}

deleteUserData();
