import { db } from './lib/admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const backupDir = path.resolve(__dirname, '../.backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `firestore-backup-${timestamp}.json`);

async function runBackup() {
    console.log('Starting Firestore backup using Firebase Admin SDK...');

    try {
        const collections = ['boxes', 'items'];
        const backupData = {};

        for (const collectionName of collections) {
            console.log(`Backing up collection: ${collectionName}...`);
            const snapshot = await db.collection(collectionName).get();
            backupData[collectionName] = {};

            snapshot.forEach(doc => {
                backupData[collectionName][doc.id] = doc.data();
            });

            console.log(`Retrieved ${snapshot.size} documents from ${collectionName}.`);
        }

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

        console.log('\nBackup completed successfully!');
        console.log(`File saved to: ${backupFile}`);

        const stats = fs.statSync(backupFile);
        console.log(`Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error('Backup failed:', error);
    } finally {
        process.exit();
    }
}

runBackup();
