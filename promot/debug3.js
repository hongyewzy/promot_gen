const fs = require('fs');
const content = fs.readFileSync('D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts', 'utf8');
const startIdx = content.indexOf('let userPrompt = ');
const searchBack = content.substring(startIdx, startIdx + 600);
// Print char codes around position 489
for (let i = 485; i < 495; i++) {
  console.log(i, searchBack.charCodeAt(i), JSON.stringify(searchBack[i]));
}