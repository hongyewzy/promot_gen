const fs = require('fs');
const content = fs.readFileSync('D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts', 'utf8');
const startIdx = content.indexOf('let userPrompt = ');
const searchBack = content.substring(startIdx, startIdx + 600);

// Check what indexOf finds
const needle = '';
console.log('needle charCode:', needle.charCodeAt(0));
const simpleIdx = searchBack.indexOf(needle);
console.log('First backtick at:', simpleIdx);
const simpleIdx2 = searchBack.indexOf(needle, simpleIdx + 1);
console.log('Second backtick at:', simpleIdx2);
const simpleIdx3 = searchBack.indexOf(needle, simpleIdx2 + 1);
console.log('Third backtick at:', simpleIdx3);