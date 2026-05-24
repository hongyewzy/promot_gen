import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';

// 内存缓存
let cache: { data: Record<string, string[]>; expires: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

// 写死兜底选项
const FALLBACK: Record<string, string[]> = {
  body: ['正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲', '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然', '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧'],
  expression: ['淡然微笑，嘴角微微上扬', '冷酷面无表情，眼神锐利', '温柔含笑，眼神柔和', '微微惊讶，眼眸睁大', '害羞低头，面带红晕', '傲娇嘟嘴，脸颊微鼓', '忧郁沉思，目光看向下方', '妩媚撩发，嘴角带笑'],
  camera: ['正面平视，标准半身中景', '低角度仰拍，突出人物高大', '高角度俯拍，显娇小可爱', '侧面45度，轮廓分明', '怼脸特写，面部占满画面', '广角全景，人物与场景融合', '背影镜头，营造神秘感', '鱼眼透视，夸张戏剧效果'],
  top: ['白色交领上衣，轻薄透气', '黑色皮质夹克，金属拉链', '露肩蕾丝衫，精致花边', '学院风西装外套，挺括有型', '和服振袖，华丽纹样', '哥特风衬衫，暗色系', '运动背心，简约贴身', '针织毛衣，柔软温暖'],
  bottom: ['百褶裙，裙摆飘逸', '黑色修身长裤', '热短裤，青春活力', '和服袴，传统优雅', '哥特风长裙，层叠裙摆', '牛仔长裤，休闲随性', '荷叶边短裙，甜美可爱', '灯笼裤，宽松舒适'],
  shoes: ['木屐，日式传统', '长筒靴，帅气干练', '运动鞋，休闲舒适', '高跟鞋，优雅气质', '赤足，自然随性', '玛丽珍鞋，复古可爱', '战斗靴，硬朗风格', '乐福鞋，学院气质'],
  accessory: ['腰间红色丝带，随风飘动', '精致耳环，闪烁光芒', '皮质手套，帅气利落', '宝石项链，华丽点缀', '发带束发，清新可爱', '墨镜，酷感十足', '帽子，遮阳又造型', '围巾，飘逸柔软'],
  background: ['雨夜霓虹街头，湿漉漉的地面倒映彩色灯光', '黄昏天台，城市天际线剪影', '夏日午后林荫道，斑驳树影', '晨雾弥漫的针叶林，阳光穿透树冠', '黄昏时分的海边悬崖，海浪拍打礁石', '星空下的草原，银河横跨天际', '午后阳光的书房，百叶窗条纹光影', '浮空岛屿，瀑布倾泻入云海'],
};

export async function GET(_req: NextRequest) {
  try {
    // 检查缓存
    if (cache && cache.expires > Date.now()) {
      return NextResponse.json({ ...cache.data, cached: true, updatedAt: new Date(cache.expires - CACHE_TTL).toISOString() });
    }

    // 调用 LongCat 搜索热门选项
    const prompt = `你是二次元 AI 生图提示词专家。请搜索当前网上最热门、最出片的二次元人物生图选项。

请从以下维度各推荐 8 个当前最热门的选项（不要写死的经典选项，要搜最新的流行趋势）：
1. 身体姿态（pose）
2. 表情（expression）
3. 镜头角度（camera）
4. 上装（top）
5. 下装（bottom）
6. 鞋子（shoes）
7. 配饰（accessory）
8. 背景场景（background）

搜索范围不限，只要是热门的人物相关选项即可。最终生成的图片风格是二次元动漫插画风格。

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "body": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "expression": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "camera": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "top": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "bottom": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "shoes": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "accessory": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "background": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s 超时

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    clearTimeout(timeout);

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);

    let result: Record<string, string[]>;

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        const keys = ['body', 'expression', 'camera', 'top', 'bottom', 'shoes', 'accessory', 'background'];
        const valid = keys.every((k) => Array.isArray(parsed[k]) && parsed[k].length >= 5);
        if (valid) {
          result = parsed;
        } else {
          console.error('Hot options: invalid response format, using fallback');
          result = FALLBACK;
        }
      } catch {
        console.error('Hot options: JSON parse failed, using fallback');
        result = FALLBACK;
      }
    } else {
      console.error('Hot options: no JSON found, using fallback');
      result = FALLBACK;
    }

    cache = { data: result, expires: Date.now() + CACHE_TTL };

    return NextResponse.json({ ...result, cached: false, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Hot options API error:', e);
    return NextResponse.json({ ...FALLBACK, cached: false, updatedAt: new Date().toISOString(), error: '搜索失败，使用默认选项' });
  }
}
