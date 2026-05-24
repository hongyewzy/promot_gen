const fs = require('fs');
const path = 'D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '    let userPrompt = ';
const startIdx = content.indexOf(startMarker);

const feedbackIdx = content.indexOf('if (feedback)', startIdx);
const searchBack = content.substring(startIdx, feedbackIdx - startIdx);
const lastBT = searchBack.lastIndexOf(';');
const absEnd = startIdx + lastBT + 2;

console.log('Start:', startIdx, 'End:', absEnd);

const oldBlock = content.substring(startIdx, absEnd);
console.log('OLD BLOCK:');
console.log(oldBlock);

const newBlock =     let userPrompt = \请根据以下人物信息生成 AI 生图提示词。

人物信息：
- 姓名：\
- 发色：\
- 发型：\
- 瞳色：\
- 肤色：\
- 衣着：\
- 其他特征：\\;

    if (s.pose || s.clothing || s.background) {
      userPrompt += '\\n\\n风格搭配：';
      if (s.pose) userPrompt += '\\n- 姿势：' + s.pose;
      if (s.clothing) userPrompt += '\\n- 服饰：' + s.clothing;
      if (s.background) userPrompt += '\\n- 背景：' + s.background;
    }

    userPrompt += \

请按以下模板结构生成风格描述：
[核心描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [风格质感] + [光影氛围]

- 核心描述：年龄、身份
- 面部细节：肤色、眼神、瞳色、五官特征
- 发型发色：长度、质感、细节
- 服装配饰：材质、装饰、配饰
- 动作姿势：站姿/坐姿/回眸/俯视/怼脸拍等
- 风格质感：高级CG插画、BJD质感、伪厚涂、8K超清等
- 光影氛围：镜头视角、光线、环境

重要：在描述中请使用「\」作为人物标识，确保生图工具能准确识别该角色。

参考示例：
"20多岁古代男子，高级CG概念插画，模糊感，高清晰度，额前碎发，背景全黑，黑发全披发，精致五官，冷白皮，戴黑色斗笠围黑纱，黑夜窗边茶桌，冷酷眼神仰拍，歪头侧脸，手拿酒壶，怼脸拍。"

请返回 JSON 格式：
{
  "chinese": "完整的中文描述，将人物特征和风格特征融合成一段流畅的文字",
  "english": "英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar \ --v 6"
}\;
;

const newContent = content.substring(0, startIdx) + newBlock + content.substring(absEnd);
fs.writeFileSync(path, newContent, 'utf8');
console.log('File written successfully');
console.log('New block length:', newBlock.length);
