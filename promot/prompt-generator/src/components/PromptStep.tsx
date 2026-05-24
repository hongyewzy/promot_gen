'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Copy, Sparkles, CheckCircle, MessageSquareText, Download, FileText, Wand2, BarChart3 } from 'lucide-react';
import type { CharacterInfo, StyleSettings, PromptResult } from '@/types';
import { BODY_OPTIONS, EXPRESSION_OPTIONS, CAMERA_OPTIONS } from '@/components/SettingsStep';

interface PromptStepProps {
  characters: CharacterInfo[];
  settings: StyleSettings;
  promptResult: PromptResult | null;
  onBack: () => void;
  onReset: () => void;
}

export default function PromptStep({ characters, settings, promptResult, onBack, onReset }: PromptStepProps) {
  const [results, setResults] = useState<Map<number, PromptResult>>(new Map());
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const generateVariedSettings = (
    baseSettings: StyleSettings,
    characterIndex: number
  ): StyleSettings => {
    if (characterIndex === 0) {
      return baseSettings;
    }
    const pickDifferent = (options: readonly string[], baseValue: string): string => {
      const filtered = options.filter((opt) => opt !== baseValue);
      const pool = filtered.length > 0 ? filtered : options;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    return {
      ...baseSettings,
      pose: {
        body: pickDifferent(BODY_OPTIONS, baseSettings.pose.body),
        expression: pickDifferent(EXPRESSION_OPTIONS, baseSettings.pose.expression),
        camera: pickDifferent(CAMERA_OPTIONS, baseSettings.pose.camera),
      },
    };
  };

  const generateAll = async () => {
    setLoadingIdx(-1);
    setError('');
    const newResults = new Map<number, PromptResult>();

    let hasError = false;
    for (let i = 0; i < characters.length; i++) {
      setLoadingIdx(i);
      try {
        const variedSettings = generateVariedSettings(settings, i);
        const res = await fetch('/api/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characters: [characters[i]],
            settings: variedSettings,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          // 统一在提示词末尾追加画幅方向标签
          if (data.chinese) {
            data.chinese = data.chinese + orientationTag;
          }
          newResults.set(i, data);
          setResults(new Map(newResults));
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = (errData as { error?: string }).error || `请求失败 (${res.status})`;
          setError(errMsg);
          hasError = true;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '网络请求失败');
        hasError = true;
      }
      if (hasError) break;
    }

    setLoadingIdx(null);

    // 自动保存到 gpt脚本 目录并运行 bat
    if (newResults.size > 0) {
      const prompts: string[] = [];
      characters.forEach((_, idx) => {
        const r = newResults.get(idx);
        if (r) prompts.push(r.chinese);
      });
      if (prompts.length > 0) {
        try {
          await fetch('/api/save-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompts }),
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } catch { /* 静默失败 */ }
      }
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error('Copy to clipboard error:', e);
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const [optimizingIdx, setOptimizingIdx] = useState<number | null>(null);
  const [optimizedResults, setOptimizedResults] = useState<Map<number, { optimized: string; diagnosis: { dimensions: { name: string; score: number; suggestion: string }[]; totalScore: number } }>>(new Map());

  const handleOptimize = async (idx: number) => {
    const result = results.get(idx);
    if (!result) return;

    setOptimizingIdx(idx);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: result.chinese }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimizedResults((prev) => new Map(prev).set(idx, data));
      }
    } catch { /* 静默失败 */ }
    setOptimizingIdx(null);
  };

  const orientationTag = settings.orientation === 'portrait' ? '【手机壁纸·竖屏9:16构图】' : '【电脑壁纸·横屏16:9构图】';
  const isGenerating = loadingIdx !== null;

  const exportTxt = () => {
    const lines: string[] = [];

    characters.forEach((char, idx) => {
      const result = results.get(idx);
      if (!result) return;
      const sourceTag = char.sourceName ? `[${char.sourceName}，${char.name}]` : `[${char.name}]`;
      lines.push(`${idx + 1}. ${sourceTag}${result.chinese}`);
      lines.push('');
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    a.download = `AI生图提示词_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          步骤 3：生成提示词
        </CardTitle>
        <CardDescription>AI 将为每个人物单独生成一份中文生图提示词</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 人物信息 */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">人物信息（{characters.length} 人）</h4>
          <div className="text-sm space-y-2">
            {characters.map((char, idx) => (
              <div key={idx} className={idx > 0 ? 'pt-2 border-t border-border/50' : ''}>
                <p className="font-medium text-xs text-muted-foreground mb-1">人物 {idx + 1}：{char.name}</p>
                <p><span className="text-muted-foreground">发色：</span>{char.hairColor} · <span className="text-muted-foreground">瞳色：</span>{char.eyeColor}</p>
                {char.age !== undefined && char.age > 0 && <p><span className="text-muted-foreground">年龄：</span>{char.age < 18 ? '少女' : `${char.age}岁`}</p>}
                {char.featuredMark && <p><span className="text-muted-foreground">特征：</span>{char.featuredMark}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* 画面设置 */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">画面设置</h4>
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">方向：</span>{settings.orientation === 'portrait' ? '手机壁纸（竖屏 9:16）' : '电脑壁纸（横屏 16:9）'}</p>
            {settings.pose.body && <p><span className="text-muted-foreground">姿态：</span>{settings.pose.body}</p>}
            {settings.pose.expression && <p><span className="text-muted-foreground">表情：</span>{settings.pose.expression}</p>}
            {settings.pose.camera && <p><span className="text-muted-foreground">镜头：</span>{settings.pose.camera}</p>}
            {settings.clothing.top && <p><span className="text-muted-foreground">上装：</span>{settings.clothing.top}</p>}
            {settings.clothing.bottom && <p><span className="text-muted-foreground">下装：</span>{settings.clothing.bottom}</p>}
            {settings.clothing.shoes && <p><span className="text-muted-foreground">鞋子：</span>{settings.clothing.shoes}</p>}
            {settings.clothing.accessory && <p><span className="text-muted-foreground">配饰：</span>{settings.clothing.accessory}</p>}
            {settings.background && <p><span className="text-muted-foreground">背景：</span>{settings.background}</p>}
            {settings.artStyle && <p><span className="text-muted-foreground">画风：</span>{settings.artStyle}</p>}
            {settings.lighting && <p><span className="text-muted-foreground">光影：</span>{settings.lighting}</p>}
            {settings.composition && <p><span className="text-muted-foreground">构图：</span>{settings.composition}</p>}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* 生成按钮 */}
        {results.size === 0 && !isGenerating && (
          <Button onClick={generateAll} className="w-full" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            批量生成 {characters.length} 份提示词
          </Button>
        )}

        {/* 生成中 */}
        {isGenerating && loadingIdx !== null && loadingIdx >= 0 && (
          <div className="p-4 bg-muted/30 rounded-lg text-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              正在生成 {characters[loadingIdx]?.name} 的提示词...（{loadingIdx + 1}/{characters.length}）
            </p>
          </div>
        )}

        {/* 自动保存提示 */}
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>已自动保存到 D:\桌面\gpt脚本\prompts.txt 并开始运行</span>
          </div>
        )}

        {/* 结果列表 */}
        {results.size > 0 && (
          <div className="space-y-6">
            {characters.map((char, idx) => {
              const result = results.get(idx);
              return (
                <div key={idx} className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium">{char.name}</span>
                    {!result && loadingIdx === idx && (
                      <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
                    )}
                    {!result && loadingIdx !== idx && !isGenerating && (
                      <span className="text-xs text-muted-foreground ml-auto">生成失败</span>
                    )}
                  </div>
                  {result && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">中文提示词</h4>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOptimize(idx)} disabled={optimizingIdx === idx}>
                            {optimizingIdx === idx ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                            {optimizingIdx === idx ? '优化中...' : '优化提示词'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.chinese, `chinese-${idx}`)}>
                            {copiedField === `chinese-${idx}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                            {copiedField === `chinese-${idx}` ? '已复制' : '复制'}
                          </Button>
                        </div>
                      </div>
                      <Textarea value={result.chinese} readOnly className="min-h-[120px] resize-none bg-muted/30" />

                      {/* 优化结果 */}
                      {optimizedResults.has(idx) && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-medium">Skill 优化结果</h4>
                            <span className="text-xs text-muted-foreground">
                              诊断得分：{optimizedResults.get(idx)?.diagnosis.totalScore}/12
                            </span>
                          </div>
                          {/* 诊断维度 */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {optimizedResults.get(idx)?.diagnosis.dimensions.map((dim, dimIdx) => (
                              <div key={dimIdx} className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">{dim.name}</span>
                                <span className={`font-medium ${dim.score === 2 ? 'text-green-500' : dim.score === 1 ? 'text-yellow-500' : 'text-red-400'}`}>
                                  {'●'.repeat(dim.score)}{'○'.repeat(2 - dim.score)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* 优化后提示词 */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">优化后提示词</span>
                              <Button variant="ghost" size="sm" onClick={() => {
                                const text = optimizedResults.get(idx)?.optimized || '';
                                navigator.clipboard.writeText(text);
                              }}>
                                <Copy className="w-3 h-3 mr-1" /> 复制
                              </Button>
                            </div>
                            <Textarea
                              value={optimizedResults.get(idx)?.optimized || ''}
                              readOnly
                              className="min-h-[80px] resize-none bg-primary/5 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!isGenerating && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateAll} className="flex-1" disabled={isGenerating}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  全部重新生成
                </Button>
                <Button variant="default" onClick={exportTxt} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  导出 TXT
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> 上一步
        </Button>
        <Button variant="secondary" onClick={onReset} className="flex-1">
          重新开始
        </Button>
      </CardFooter>
    </Card>
  );
}
