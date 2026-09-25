import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

dotenv.config();

const jsDirectoryPath = path.join('public', 'integrate');
const cssDirectoryPath = 'public/integrate'; // für css-minify als relativen Pfad
const originalJsFilePath = path.join(jsDirectoryPath, 'pulse.js');
const tempJsFilePath = path.join(jsDirectoryPath, 'temp_pulse.js');
const jsMinifiedFilePath = path.join(jsDirectoryPath, 'pulse.min.js');
const originalCssFilePath = path.join(cssDirectoryPath, 'pulse.css');

fs.copyFileSync(originalJsFilePath, tempJsFilePath);
let jsContent = fs.readFileSync(tempJsFilePath, 'utf-8');
jsContent = jsContent.replace(/%%HOST_URL%%/g, process.env.HOST_URL);
fs.writeFileSync(tempJsFilePath, jsContent);
execSync(`npx uglify-js --compress --mangle -o ${jsMinifiedFilePath} -- ${tempJsFilePath}`);
fs.unlinkSync(tempJsFilePath);
console.log(`JavaScript minified: ${jsMinifiedFilePath}`);

execSync(`npx css-minify -f ${originalCssFilePath} -o ${cssDirectoryPath}`);
console.log(`CSS minified in: ${cssDirectoryPath}`);
