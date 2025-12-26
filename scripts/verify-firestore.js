import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account key
const serviceAccountPath = path.resolve(__dirname, '../.secrets/storageboxorganizer-42466-firebase-adminsdk-fbsvc-a57f8f5307.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

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
