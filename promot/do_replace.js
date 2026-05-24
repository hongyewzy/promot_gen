const fs = require('fs');
const path = 'D:\\桌面\\promot\\prompt-generator\\src\\app\\api\\prompt\\route.ts';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '    let userPrompt = `';
const startIdx = content.indexOf(startMarker);
const feedbackIdx = content.indexOf('if (feedback)', startIdx);
const searchBack = content.substring(startIdx, feedbackIdx - startIdx);
const lastBT = searchBack.lastIndexOf('`;');
const absEnd = startIdx + lastBT + 2;

console.log('Start:', startIdx, 'End:', absEnd);

const newBlock = "    let userPrompt = `请根据以下人物信息生成 AI 生图提示词。\n\n人物信息：\n- 姓名：${displayName}\n- 发色：${character.hairColor}\n- 发型：${character.hairstyle}\n- 瞳色：${character.eyeColor}\n- 肤色：${character.skinColor}\n- 衣着：${character.clothing}\n- 其他特征：${character.other}`;\n\n    if (s.pose || s.clothing || s.background) {\n      userPrompt += '\\n\\n风格搭配：';\n      if (s.pose) userPrompt += '\\n- 姿势：' + s.pose;\n      if (s.clothing) userPrompt += '\\n- 服饰：' + s.clothing;\n      if (s.background) userPrompt += '\\n- 背景：' + s.background;\n    }\n\n    userPrompt += `\n\n请按以下模板结构生成风格描述：\n[核心描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [风格质感] + [光影氛围]\n\n- 核心描述：年龄、身份\n- 面部细节：肤色、眼神、瞳色、五官特征\n- 发型发色：长度、质感、细节\n- 服装配饰：材质、装饰、配饰\n- 动作姿势：站姿/坐姿/回眸/俯视/怼脸拍等\n- 风格质感：高级CG插画、BJD质感、伪厚涂、8K超清等\n- 光影氛围：镜头视角、光线、环境\n\n重要：在描述中请使用「${displayName}」作为人物标识，确保生图工具能准确识别该角色。\n\n参考示例：\n\"20多岁古代男子，高级CG概念插画，模糊感，高清晰度，额前碎发，背景全黑，黑发全披发，精致五官，冷白皮，戴黑色斗笠围黑纱，黑夜窗边茶桌，冷酷眼神仰拍，歪头侧脸，手拿酒壶，怼脸拍。\"\n\n请返回 JSON 格式：\n{\n  \"chinese\": \"完整的中文描述，将人物特征和风格特征融合成一段流畅的文字\",\n  \"english\": \"英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar ${aspectRatio} --v 6\"\n}`;\n";

const newContent = content.substring(0, startIdx) + newBlock + content.substring(absEnd);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done. New file length:', newContent.length);