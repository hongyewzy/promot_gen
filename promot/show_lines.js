const fs = require('fs');
const content = fs.readFileSync('D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => console.log((i+1) + ': ' + line));
