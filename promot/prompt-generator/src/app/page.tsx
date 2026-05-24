'use client';

import { useState } from 'react';
import StepIndicator from '@/components/StepIndicator';
import CharacterStep from '@/components/CharacterStep';
import SettingsStep from '@/components/SettingsStep';
import PromptStep from '@/components/PromptStep';
import type { CharacterInfo, StyleSettings, PromptResult, SourceType } from '@/types';
import { defaultSettings } from '@/types';

const STEPS = ['人物查询', '画面设置', '生成提示词'];

export default function Home() {
  const [step, setStep] = useState(1);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [sourceName, setSourceName] = useState('');
  const [settings, setSettings] = useState<StyleSettings>(defaultSettings());
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);

  const handleCharacterConfirm = (chars: CharacterInfo[], st: SourceType | '', sn: string) => {
    setCharacters(chars);
    setSourceType(st);
    setSourceName(sn);
    setPromptResult(null);
    setStep(2);
  };

  const handleSettingsConfirm = (s: StyleSettings) => {
    setSettings(s);
    setPromptResult(null);
    setStep(3);
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleReset = () => {
    setStep(1);
    setCharacters([]);
    setSourceType('');
    setSourceName('');
    setSettings(defaultSettings());
    setPromptResult(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AI 生图提示词生成器
          </h1>
          <p className="text-muted-foreground mt-2">
            输入人物，AI 自动查询形象特征，生成双语生图提示词
          </p>
        </div>
        <StepIndicator currentStep={step} steps={STEPS} />
        <div className="mt-8">
          {step === 1 && (
            <CharacterStep
              characters={characters}
              sourceType={sourceType}
              sourceName={sourceName}
              onConfirm={handleCharacterConfirm}
              onSourceTypeChange={setSourceType}
              onSourceNameChange={setSourceName}
            />
          )}
          {step === 2 && characters.length > 0 && (
            <SettingsStep
              settings={settings}
              characterNames={characters.map((c) => c.name)}
              onConfirm={handleSettingsConfirm}
              onBack={handleBack}
            />
          )}
          {step === 3 && characters.length > 0 && (
            <PromptStep
              characters={characters}
              settings={settings}
              promptResult={promptResult}
              onBack={handleBack}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </main>
  );
}
