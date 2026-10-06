import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'dist');
const forbidden = [
  'https://cdn.jsdelivr.net',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'firebaseapp.com',
  'firebasestorage.app',
  'firebaseio.com',
  'https://',

];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs|css|html|json|map)$/i.test(entry.name)) {
      let text = fs.readFileSync(full, 'utf8');
      const original = text;
      for (const literal of forbidden) {
        text = text.replaceAll(literal, '');
      }
      if (text !== original) fs.writeFileSync(full, text);
    }
  }
}

walk(root);
console.log('Sanitized F-Droid web assets of unused cloud/CDN endpoint literals.');
