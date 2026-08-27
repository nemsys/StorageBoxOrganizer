/**
 * Shared Firebase Admin SDK bootstrap for the scripts in `scripts/`.
 *
 * The service account key is a real credential and never lives in the repo.
 * It is looked up, in order, from:
 *
 *   1. $GOOGLE_APPLICATION_CREDENTIALS — an absolute path to the JSON key
 *   2. the first *.json file in `.secrets/` (git-ignored)
 *
 * Generate one at: Firebase Console → Project Settings → Service Accounts →
 * "Generate new private key", then drop it in `.secrets/`.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function resolveServiceAccountPath() {
    const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fromEnv) {
        if (!fs.existsSync(fromEnv)) {
            console.error(`GOOGLE_APPLICATION_CREDENTIALS points at a file that does not exist:\n  ${fromEnv}`);
            process.exit(1);
        }
        return fromEnv;
    }

    const secretsDir = path.join(root, '.secrets');
    const keys = fs.existsSync(secretsDir)
        ? fs.readdirSync(secretsDir).filter((f) => f.endsWith('.json')).sort()
        : [];

    if (keys.length === 0) {
        console.error(
            'No service account key found.\n\n' +
            'Put one in .secrets/ (Firebase Console → Project Settings → Service\n' +
            'Accounts → Generate new private key), or point\n' +
            '$GOOGLE_APPLICATION_CREDENTIALS at it.'
        );
        process.exit(1);
    }

    return path.join(secretsDir, keys[0]);
}

const serviceAccount = JSON.parse(fs.readFileSync(resolveServiceAccountPath(), 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });

export const db = getFirestore(app);
export const auth = getAuth(app);
export const projectId = serviceAccount.project_id;
