'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Settings, Monitor, Smartphone, RefreshCw, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Orientation, StyleSettings, PoseDetail, ClothingDetail } from '@/types';
import TagSelector from '@/components/TagSelector';

interface SettingsStepProps {
  settings: StyleSettings;
  characterNames: string[];
  onConfirm: (settings: StyleSettings) => void;
  onBack: () => void;
}

export const BODY_OPTIONS = [
  '正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲',
  '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然',
  '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧',
];

export const EXPRESSION_OPTIONS = [
  '淡然微笑，嘴角微微上扬', '冷酷面无表情，眼神锐利', '温柔含笑，眼神柔和',
  '微微惊讶，眼眸睁大', '害羞低头，面带红晕', '傲娇嘟嘴，脸颊微鼓',
  '忧郁沉思，目光看向下方', '妩媚撩发，嘴角带笑',
];

export const CAMERA_OPTIONS = [
  '正面平视，标准半身中景', '低角度仰拍，突出人物高大', '高角度俯拍，显娇小可爱',
  '侧面45度，轮廓分明', '怼脸特写，面部占满画面', '广角全景，人物与场景融合',
  '背影镜头，营造神秘感', '鱼眼透视，夸张戏剧效果',
];

const TOP_OPTIONS = [
  '白色交领上衣，轻薄透气', '黑色皮质夹克，金属拉链', '露肩蕾丝衫，精致花边',
  '学院风西装外套，挺括有型', '和服振袖，华丽纹样', '哥特风衬衫，暗色系',
  '运动背心，简约贴身', '针织毛衣，柔软温暖',
];

const BOTTOM_OPTIONS = [
  '百褶裙，裙摆飘逸', '黑色修身长裤', '热短裤，青春活力',
  '和服袴，传统优雅', '哥特风长裙，层叠裙摆', '牛仔长裤，休闲随性',
  '荷叶边短裙，甜美可爱', '灯笼裤，宽松舒适',
];

const SHOES_OPTIONS = [
  '木屐，日式传统', '长筒靴，帅气干练', '运动鞋，休闲舒适',
  '高跟鞋，优雅气质', '赤足，自然随性', '玛丽珍鞋，复古可爱',
  '战斗靴，硬朗风格', '乐福鞋，学院气质',
];

const ACCESSORY_OPTIONS = [
  '腰间红色丝带，随风飘动', '精致耳环，闪烁光芒', '皮质手套，帅气利落',
  '宝石项链，华丽点缀', '发带束发，清新可爱', '墨镜，酷感十足',
  '帽子，遮阳又造型', '围巾，飘逸柔软',
];

const BACKGROUND_CATEGORIES: { label: string; options: string[] }[] = [
  {
    label: '城市街拍',
    options: [
      '雨夜霓虹街头，湿漉漉的地面倒映彩色灯光', '黄昏天台，城市天际线剪影',
      '夏日午后林荫道，斑驳树影', '高空俯瞰都市，云层环绕',
      '地铁站台，冷色调荧光灯', '樱花街道，粉色花瓣飘落',
      '赛博朋克暗巷，全息广告牌闪烁', '老旧胡同，暖黄路灯',
    ],
  },
  {
    label: '自然风光',
    options: [
      '晨雾弥漫的针叶林，阳光穿透树冠', '黄昏时分的海边悬崖，海浪拍打礁石',
      '星空下的草原，银河横跨天际', '秋日枫林，红色落叶铺满小径',
      '雪后初晴的白桦林，雪地反光', '日出时分的山巅，云海翻涌',
      '薄雾笼罩的湖泊，倒影如画', '暴风雨前的乌云压境，电闪雷鸣',
    ],
  },
  {
    label: '室内空间',
    options: [
      '午后阳光的书房，百叶窗条纹光影', '温馨的咖啡厅，柔光台灯',
      '哥特式教堂，彩色玻璃窗光线', '日式榻榻米房间，纸门透过的柔光',
      '现代极简客厅，落地窗外城市夜景', '老旧图书馆，尘封的书架与暖光',
      '华丽宫殿大厅，水晶吊灯', '昏暗的酒吧，霓虹灯与烟雾',
    ],
  },
  {
    label: '幻想世界',
    options: [
      '浮空岛屿，瀑布倾泻入云海', '水晶洞穴，发光矿石点缀',
      '天空之城，齿轮与蒸汽朋克机械', '深海宫殿，珊瑚与发光水母',
      '魔法学院塔楼，魔法书与烛光', '废墟遗迹，藤蔓缠绕石柱',
      '极光笼罩的冰原，神秘光芒', '虚空之境，破碎的几何浮石',
    ],
  },
];

const ART_STYLE_OPTIONS = [
  '日系动漫插画，赛璐璐平涂', '日系厚涂，笔触厚重有质感', '游戏CG插画，电影级光影',
  '韩漫风格，精致唯美', '新海诚风格，光影绝美', '京都动画风，清新细腻',
  '吉卜力手绘，温暖治愈', '国风工笔画，古典雅致', '赛博朋克，霓虹暗调',
  '浮世绘，日式传统版画', '概念艺术，电影分镜感', '3D渲染，虚幻引擎5质感',
  '海报风格，竖版构图，视觉冲击力强，适合宣传展示',
  '公告风格，横版横幅，包含标题文字区域，信息清晰',
  '电影宣传风格，电影级光影，叙事感强，适合剧照海报',
];

const LIGHTING_OPTIONS = [
  '逆光剪影，金色轮廓光', '丁达尔效应，光柱穿透雾气', '霓虹灯光，赛博朋克色彩',
  '柔和自然光，清晨氛围', '月光清冷，蓝调夜景', '烛光暖黄，温馨私密',
  '电影布光，三点式专业打光', '侧光戏剧性，强烈明暗对比', '顶光神秘，深邃阴影',
  '底光诡异，恐怖氛围',
];

const COMPOSITION_OPTIONS = [
  '正面特写，面部占满画面', '半身中景，腰部以上', '全身构图，人物完整呈现',
  '低角度仰视，突出高大感', '高角度俯视，显渺小可爱', '侧面45度，轮廓分明',
  '背影构图，留白想象空间', '广角全景，人物融入场景',
];

const BG_CAT_LABELS = BACKGROUND_CATEGORIES.map((c) => c.label);

export default function SettingsStep({ settings: initial, characterNames, onConfirm, onBack }: SettingsStepProps) {
  const [orientation, setOrientation] = useState<Orientation>(initial.orientation);
  const [pose, setPose] = useState<PoseDetail>(initial.pose);
  const [clothing, setClothing] = useState<ClothingDetail>(initial.clothing);
  const [background, setBackground] = useState(initial.background);
  const [artStyle, setArtStyle] = useState(initial.artStyle);
  const [lighting, setLighting] = useState(initial.lighting);
  const [composition, setComposition] = useState(initial.composition);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [bgCategory, setBgCategory] = useState<string>('');

  const [hotOptions, setHotOptions] = useState<Record<string, string[]> | null>(null);

  // prefer hot options, fallback to hardcoded
  const bodyOpts = hotOptions?.body ?? BODY_OPTIONS;
  const expressionOpts = hotOptions?.expression ?? EXPRESSION_OPTIONS;
  const cameraOpts = hotOptions?.camera ?? CAMERA_OPTIONS;
  const topOpts = hotOptions?.top ?? TOP_OPTIONS;
  const bottomOpts = hotOptions?.bottom ?? BOTTOM_OPTIONS;
  const shoesOpts = hotOptions?.shoes ?? SHOES_OPTIONS;
  const accessoryOpts = hotOptions?.accessory ?? ACCESSORY_OPTIONS;
  const bgCategories = hotOptions?.background
    ? [{ label: '热门场景', options: hotOptions.background }, ...BACKGROUND_CATEGORIES]
    : BACKGROUND_CATEGORIES;

  useEffect(() => {
    let cancelled = false;
    const loadHotOptions = async () => {
      try {
        const res = await fetch('/api/hot-options');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setHotOptions(data);
        }
      } catch { /* silent fallback to hardcoded */ }
    };
    loadHotOptions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setOrientation(initial.orientation);
    setPose(initial.pose);
    setClothing(initial.clothing);
    setBackground(initial.background);
    setArtStyle(initial.artStyle);
    setLighting(initial.lighting);
    setComposition(initial.composition);
  }, [initial]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const names = characterNames.join(', ');
      const res = await fetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterNames: names, orientation }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `推荐失败 (${res.status})`);
      }
      const data = await res.json();
      if (data.pose) setPose(data.pose);
      if (data.clothing) setClothing(data.clothing);
      if (data.background) setBackground(data.background);
      if (data.artStyle) setArtStyle(data.artStyle);
      if (data.lighting) setLighting(data.lighting);
      if (data.composition) setComposition(data.composition);
    } catch (e) {
      console.error('Auto generate style error:', e);
      setError('AI 推荐失败，请手动选择或重试');
    } finally {
      setGenerating(false);
    }
  };

  const currentBgOptions = bgCategory
    ? bgCategories.find((c) => c.label === bgCategory)?.options ?? []
    : [];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          步骤 2：画面设置
        </CardTitle>
        <CardDescription>选择画幅方向，AI 自动推荐热门风格搭配</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 画幅方向 */}
        <div className="space-y-3">
          <Label>画幅方向</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setOrientation('portrait')}
              className={'flex flex-col items-center gap-3 p-5 rounded-lg border-2 transition-all ' +
                (orientation === 'portrait'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50')}
            >
              <Smartphone className={'w-10 h-10 ' + (orientation === 'portrait' ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="font-medium">手机壁纸</p>
                <p className="text-xs text-muted-foreground mt-1">竖屏 9:16</p>
              </div>
              {orientation === 'portrait' && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={'flex flex-col items-center gap-3 p-5 rounded-lg border-2 transition-all ' +
                (orientation === 'landscape'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50')}
            >
              <Monitor className={'w-10 h-10 ' + (orientation === 'landscape' ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="font-medium">电脑壁纸</p>
                <p className="text-xs text-muted-foreground mt-1">横屏 16:9</p>
              </div>
              {orientation === 'landscape' && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* AI 推荐 */}
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">风格搭配</Label>
          <Button variant="default" size="sm" onClick={handleAutoGenerate} disabled={generating}>
            {generating ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1.5" />}
            {generating ? '生成中...' : 'AI 热门推荐'}
          </Button>
        </div>
        {error && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleAutoGenerate} disabled={generating} className="ml-3 shrink-0">
              <RefreshCw className="w-3 h-3 mr-1" /> 重试
            </Button>
          </div>
        )}

        {/* loading 骨架 */}
        {generating && (
          <div className="space-y-3">
            {['身体姿态','表情','镜头角度','上装','下装','鞋子','配饰','场景背景','画风','光影','构图'].map((n) => (
              <div key={n} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* 标签选择器区域 */}
        {!generating && (
          <div className="space-y-5">
            {/* 姿势 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">姿势</h4>
              <TagSelector label="身体姿态" tags={bodyOpts} value={pose.body} onChange={(v) => setPose((p) => ({ ...p, body: v }))} />
              <TagSelector label="表情" tags={expressionOpts} value={pose.expression} onChange={(v) => setPose((p) => ({ ...p, expression: v }))} />
              <TagSelector label="镜头角度" tags={cameraOpts} value={pose.camera} onChange={(v) => setPose((p) => ({ ...p, camera: v }))} />
            </div>

            {/* 服饰 — 2x2 网格 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">服饰</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TagSelector label="上装" tags={topOpts} value={clothing.top} onChange={(v) => setClothing((c) => ({ ...c, top: v }))} />
                <TagSelector label="下装" tags={bottomOpts} value={clothing.bottom} onChange={(v) => setClothing((c) => ({ ...c, bottom: v }))} />
                <TagSelector label="鞋子" tags={shoesOpts} value={clothing.shoes} onChange={(v) => setClothing((c) => ({ ...c, shoes: v }))} />
                <TagSelector label="配饰" tags={accessoryOpts} value={clothing.accessory} onChange={(v) => setClothing((c) => ({ ...c, accessory: v }))} />
              </div>
            </div>

            {/* 场景背景 — 两级 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">场景背景</h4>
              <div className="flex flex-wrap gap-2">
                {bgCategories.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setBgCategory(bgCategory === c.label ? '' : c.label)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full border transition-all',
                      bgCategory === c.label
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-muted bg-background hover:border-primary/50'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {bgCategory && (
                <TagSelector
                  label="具体场景"
                  tags={currentBgOptions}
                  value={background}
                  onChange={setBackground}
                />
              )}
            </div>

            {/* 画风 */}
            <TagSelector label="画风" tags={ART_STYLE_OPTIONS} value={artStyle} onChange={setArtStyle} />

            {/* 光影 */}
            <TagSelector label="光影" tags={LIGHTING_OPTIONS} value={lighting} onChange={setLighting} />

            {/* 构图 */}
            <TagSelector label="构图" tags={COMPOSITION_OPTIONS} value={composition} onChange={setComposition} />
          </div>
        )}

        {/* 搭配预览 */}
        {!generating && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">当前搭配预览</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {pose.body && <span>姿态：{pose.body}</span>}
              {pose.expression && <span>表情：{pose.expression}</span>}
              {pose.camera && <span>镜头：{pose.camera}</span>}
              {clothing.top && <span>上装：{clothing.top}</span>}
              {clothing.bottom && <span>下装：{clothing.bottom}</span>}
              {clothing.shoes && <span>鞋子：{clothing.shoes}</span>}
              {clothing.accessory && <span>配饰：{clothing.accessory}</span>}
              {background && <span>背景：{background}</span>}
              {artStyle && <span>画风：{artStyle}</span>}
              {lighting && <span>光影：{lighting}</span>}
              {composition && <span>构图：{composition}</span>}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> 上一步
        </Button>
        <Button
          onClick={() => onConfirm({ orientation, pose, clothing, background, artStyle, lighting, composition })}
          className="flex-1"
        >
          确认并继续 <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
