const fs = require('fs');
const content = fs.readFileSync('D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts', 'utf8');
const startIdx = content.indexOf('let userPrompt = ');
const feedbackIdx = content.indexOf('if (feedback)', startIdx);
const searchBack = content.substring(startIdx, feedbackIdx - startIdx);

// Find LAST backtick-semicolon
let lastIdx = -1;
let idx = 0;
while ((idx = searchBack.indexOf(';', idx)) !== -1) {
  lastIdx = idx;
  idx++;
}
console.log('Last backtick-semicolon at:', lastIdx);
console.log('Context:', JSON.stringify(searchBack.substring(lastIdx-10, lastIdx+10)));

// The actual end is startIdx + lastIdx + 2 (to include the ';)
const absEnd = startIdx + lastIdx + 2;
console.log('absEnd:', absEnd);
console.log('Content at absEnd:', JSON.stringify(content.substring(absEnd, absEnd + 30)));