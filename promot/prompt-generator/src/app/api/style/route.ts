import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';
import type { Orientation } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { characterNames, orientation } = await req.json() as {
      characterNames: string;
      orientation?: Orientation;
    };

    if (!characterNames) {
      return NextResponse.json({ error: '缺少人物名' }, { status: 400 });
    }

    const orientationText = orientation === 'landscape' ? '横屏（16:9）' : '竖屏（9:16）';


    // 获取热门选项
    let hotOpts: Record<string, string[]> | null = null;
    try {
      const baseUrl = req.headers.get('host') || 'localhost:3000';
      const hotRes = await fetch(`http://${baseUrl}/api/hot-options`);
      if (hotRes.ok) hotOpts = await hotRes.json();
    } catch { /* 使用写死 pool */ }
    const bodyPool = hotOpts?.body ?? [
      '正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲',
      '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然',
      '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧',
    ];
    const expressionPool = hotOpts?.expression ?? [
      '淡然微笑，嘴角微微上扬', '冷酷面无表情，眼神锐利', '温柔含笑，眼神柔和',
      '微微惊讶，眼眸睁大', '害羞低头，面带红晕', '傲娇嘟嘴，脸颊微鼓',
      '忧郁沉思，目光看向下方', '妩媚撩发，嘴角带笑',
    ];
    const cameraPool = hotOpts?.camera ?? [
      '正面平视，标准半身中景', '低角度仰拍，突出人物高大', '高角度俯拍，显娇小可爱',
      '侧面45度，轮廓分明', '怼脸特写，面部占满画面', '广角全景，人物与场景融合',
      '背影镜头，营造神秘感', '鱼眼透视，夸张戏剧效果',
    ];
    const topPool = hotOpts?.top ?? [
      '白色交领上衣，轻薄透气', '黑色皮质夹克，金属拉链', '露肩蕾丝衫，精致花边',
      '学院风西装外套，挺括有型', '和服振袖，华丽纹样', '哥特风衬衫，暗色系',
      '运动背心，简约贴身', '针织毛衣，柔软温暖',
    ];
    const bottomPool = hotOpts?.bottom ?? [
      '百褶裙，裙摆飘逸', '黑色修身长裤', '热短裤，青春活力',
      '和服袴，传统优雅', '哥特风长裙，层叠裙摆', '牛仔长裤，休闲随性',
      '荷叶边短裙，甜美可爱', '灯笼裤，宽松舒适',
    ];
    const shoesPool = hotOpts?.shoes ?? [
      '木屐，日式传统', '长筒靴，帅气干练', '运动鞋，休闲舒适',
      '高跟鞋，优雅气质', '赤足，自然随性', '玛丽珍鞋，复古可爱',
      '战斗靴，硬朗风格', '乐福鞋，学院气质',
    ];
    const accessoryPool = hotOpts?.accessory ?? [
      '腰间红色丝带，随风飘动', '精致耳环，闪烁光芒', '皮质手套，帅气利落',
      '宝石项链，华丽点缀', '发带束发，清新可爱', '墨镜，酷感十足',
      '帽子，遮阳又造型', '围巾，飘逸柔软',
    ];
    const backgroundPool = hotOpts?.background ?? [
      '雨夜霓虹街头，湿漉漉的地面倒映彩色灯光', '黄昏天台，城市天际线剪影',
      '夏日午后林荫道，斑驳树影', '高空俯瞰都市，云层环绕',
      '地铁站台，冷色调荧光灯', '樱花街道，粉色花瓣飘落',
      '赛博朋克暗巷，全息广告牌闪烁', '老旧胡同，暖黄路灯',
      '晨雾弥漫的针叶林，阳光穿透树冠', '黄昏时分的海边悬崖，海浪拍打礁石',
      '星空下的草原，银河横跨天际', '秋日枫林，红色落叶铺满小径',
      '雪后初晴的白桦林，雪地反光', '日出时分的山巅，云海翻涌',
      '薄雾笼罩的湖泊，倒影如画', '暴风雨前的乌云压境，电闪雷鸣',
      '午后阳光的书房，百叶窗条纹光影', '温馨的咖啡厅，柔光台灯',
      '哥特式教堂，彩色玻璃窗光线', '日式榻榻米房间，纸门透过的柔光',
      '现代极简客厅，落地窗外城市夜景', '老旧图书馆，尘封的书架与暖光',
      '华丽宫殿大厅，水晶吊灯', '昏暗的酒吧，霓虹灯与烟雾',
      '浮空岛屿，瀑布倾泻入云海', '水晶洞穴，发光矿石点缀',
      '天空之城，齿轮与蒸汽朋克机械', '深海宫殿，珊瑚与发光水母',
      '魔法学院塔楼，魔法书与烛光', '废墟遗迹，藤蔓缠绕石柱',
      '极光笼罩的冰原，神秘光芒', '虚空之境，破碎的几何浮石',
    ];
    const artStylePool = [
      '日系动漫插画，赛璐璐平涂', '日系厚涂，笔触厚重有质感', '游戏CG插画，电影级光影',
      '韩漫风格，精致唯美', '新海诚风格，光影绝美', '京都动画风，清新细腻',
      '吉卜力手绘，温暖治愈', '国风工笔画，古典雅致', '赛博朋克，霓虹暗调',
      '浮世绘，日式传统版画', '概念艺术，电影分镜感', '3D渲染，虚幻引擎5质感',
    ];
    const lightingPool = [
      '逆光剪影，金色轮廓光', '丁达尔效应，光柱穿透雾气', '霓虹灯光，赛博朋克色彩',
      '柔和自然光，清晨氛围', '月光清冷，蓝调夜景', '烛光暖黄，温馨私密',
      '电影布光，三点式专业打光', '侧光戏剧性，强烈明暗对比', '顶光神秘，深邃阴影',
      '底光诡异，恐怖氛围',
    ];
    const compositionPool = [
      '正面特写，面部占满画面', '半身中景，腰部以上', '全身构图，人物完整呈现',
      '低角度仰视，突出高大感', '高角度俯视，显渺小可爱', '侧面45度，轮廓分明',
      '背影构图，留白想象空间', '广角全景，人物融入场景',
    ];

    const shuffle = <T>(arr: T[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const pick5 = (pool: string[]) => shuffle(pool).slice(0, 5).join('、');

    const userPrompt = `你是 AI 绘画提示词专家。请为人物「${characterNames}」推荐一套适合${orientationText}画幅的热门生图风格搭配。

从以下热门选项中各选 1 个最适合该人物的（选最热门、最出片的组合）：

**身体姿态**（选1）：${pick5(bodyPool)}

**表情**（选1）：${pick5(expressionPool)}

**镜头角度**（选1）：${pick5(cameraPool)}

**上装**（选1）：${pick5(topPool)}

**下装**（选1）：${pick5(bottomPool)}

**鞋子**（选1）：${pick5(shoesPool)}

**配饰**（选1）：${pick5(accessoryPool)}

**环境背景**（选1）：${pick5(backgroundPool)}

**画风**（选1）：${pick5(artStylePool)}

**光影**（选1）：${pick5(lightingPool)}

**构图**（选1）：${pick5(compositionPool)}

推荐原则：
- 画风优先选择二次元动漫风格（日系插画、赛璐璐平涂、游戏CG插画、二次元立绘等）
- 竖屏（9:16）：优先人物特写感强、姿势有张力的搭配
- 横屏（16:9）：优先场景开阔、背景有层次感的搭配
- 必须结合人物性格特点来选

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "pose": {
    "body": "选择的身体姿态",
    "expression": "选择的表情",
    "camera": "选择的镜头角度"
  },
  "clothing": {
    "top": "选择的上装",
    "bottom": "选择的下装",
    "shoes": "选择的鞋子",
    "accessory": "选择的配饰"
  },
  "background": "选择的背景",
  "artStyle": "选择的画风",
  "lighting": "选择的光影",
  "composition": "选择的构图"
}`;

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Style API: no JSON found:', text.substring(0, 300));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Style API: JSON parse failed:', (parseErr as Error).message);
      console.error('Style API: raw JSON string:', jsonStr.substring(0, 300));
      // 尝试修复常见问题后重新解析
      try {
        const fixed = jsonStr
          .replace(/,\s*}/g, '}')   // 移除尾部逗号
          .replace(/,\s*]/g, ']')   // 数组尾部逗号
          .replace(/\n/g, '\\n')    // 未转义换行
          .replace(/\r/g, '');      // 回车符
        parsed = JSON.parse(fixed);
      } catch (retryErr) {
        console.error('Style API: retry parse also failed:', (retryErr as Error).message);
        return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
      }
    }

    if (parsed.error) {
      console.error('Style API error:', parsed.error);
      return NextResponse.json({ error: '推荐失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      pose: parsed.pose || { body: '', expression: '', camera: '' },
      clothing: parsed.clothing || { top: '', bottom: '', shoes: '', accessory: '' },
      background: parsed.background || '',
      artStyle: parsed.artStyle || '',
      lighting: parsed.lighting || '',
      composition: parsed.composition || '',
    });
  } catch (e) {
    console.error('Style API error:', e);
    const msg = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ error: `推荐失败：${msg}` }, { status: 500 });
  }
}
