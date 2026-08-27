import { db } from './lib/admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runImport() {
    // Usage: node scripts/import-firestore.js [backup-file-path] [optional-new-uid]
    const backupFilePath = process.argv[2];
    const newUserId = process.argv[3];

    if (!backupFilePath) {
        console.error('Please provide the path to the backup JSON file.');
        console.log('Usage: npm run import -- <path-to-json> [optional-new-uid]');
        process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), backupFilePath);
    if (!fs.existsSync(absolutePath)) {
        console.error('Backup file not found at:', absolutePath);
        process.exit(1);
    }

    console.log(`Starting Firestore import from: ${backupFilePath}...`);
    if (newUserId) {
        console.log(`Mapping all documents to New User ID: ${newUserId}`);
    }

    try {
        const rawData = fs.readFileSync(absolutePath, 'utf8');
        const backupData = JSON.parse(rawData);

        const collections = Object.keys(backupData);

        for (const collectionName of collections) {
            const docs = backupData[collectionName];
            const docIds = Object.keys(docs);

            console.log(`Importing ${docIds.length} documents into collection: ${collectionName}...`);

            // Using a basic loop for now. For very large datasets, batches would be better.
            let count = 0;
            for (const docId of docIds) {
                const docData = docs[docId];

                // Optional: Override userId if provided
                if (newUserId && docData.userId) {
                    docData.userId = newUserId;
                }

                await db.collection(collectionName).doc(docId).set(docData);
                count++;
                if (count % 10 === 0) {
                    process.stdout.write('.');
                }
            }
            console.log(`\nFinished importing ${collectionName}.`);
        }

        console.log('\nImport completed successfully!');

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        process.exit();
    }
}

runImport();
