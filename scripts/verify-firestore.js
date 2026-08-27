import { db } from './lib/admin.js';

async function checkData() {
    const boxesSnapshot = await db.collection('boxes').limit(5).get();
    console.log('--- BOXES ---');
    boxesSnapshot.forEach(doc => {
        console.log(`ID: ${doc.id}, userId: ${doc.data().userId}`);
    });

    const itemsSnapshot = await db.collection('items').limit(5).get();
    console.log('\n--- ITEMS ---');
    itemsSnapshot.forEach(doc => {
        console.log(`ID: ${doc.id}, userId: ${doc.data().userId}`);
    });
    process.exit();
}

checkData();
