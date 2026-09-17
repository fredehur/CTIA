import * as fs from 'fs';
const path = './services/geminiService.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/gemini-3\.1-pro-preview/g, 'gemini-3-flash-preview');
fs.writeFileSync(path, code);
console.log('Replaced all gemini-3.1-pro-preview with gemini-3-flash-preview');
