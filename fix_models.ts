import * as fs from 'fs';
const file = './services/geminiService.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/gemini-3-pro-preview/g, 'gemini-3.1-pro-preview');
fs.writeFileSync(file, code);
console.log('Fixed models');
