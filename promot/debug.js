const fs = require('fs');
const content = fs.readFileSync('D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts', 'utf8');
const startIdx = content.indexOf('let userPrompt = ');
const feedbackIdx = content.indexOf('if (feedback)', startIdx);
const searchBack = content.substring(startIdx, feedbackIdx - startIdx);

let idx = 0;
while ((idx = searchBack.indexOf(';', idx)) !== -1) {
  console.log('Found at', idx, ':', JSON.stringify(searchBack.substring(Math.max(0,idx-10), idx+5)));
  idx++;
}