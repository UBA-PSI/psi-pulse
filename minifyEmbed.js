// Embed v2: lesbare Fassung pulse.js (auch zum Einbetten in fremde Builds) plus minifizierte Fassung.
// Läuft im Build (npm run build); pulse.min.js ist nicht versioniert.
import path from 'path';
import { execSync } from 'child_process';

const embedSrc = path.join('public', 'embed', 'v2', 'pulse.js');
const embedMin = path.join('public', 'embed', 'v2', 'pulse.min.js');
execSync(`npx uglify-js --compress --mangle --comments '/^!/' -o ${embedMin} -- ${embedSrc}`);
console.log(`Embed v2 minified: ${embedMin}`);
