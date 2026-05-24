import { useState, useEffect } from 'react';
import StepIndicator from '@/components/StepIndicator';
import CharacterStep from '@/components/CharacterStep';
import WallpaperStep from '@/components/WallpaperStep';
import PromptStep from '@/components/PromptStep';
import type { CharacterInfo, WallpaperInfo, StyleAnalysis, PromptResult } from '@/types';

const STEPS = ['Character', 'Wallpaper', 'Prompt'];

export default function Home() {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [wallpaper, setWallpaper] = useState<WallpaperInfo | null>(null);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);

  useEffect(() => {
    if (step === 3 && character && styleAnalysis && !promptResult) {
      generatePrompt();
    }
  }, [step]);

  const generatePrompt = async () => {
    if (!character || !styleAnalysis) return;
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, styleAnalysis }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromptResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCharacterConfirm = (c: CharacterInfo) => {
    setCharacter(c);
    setStep(2);
  };

  const handleWallpaperConfirm = (wp: WallpaperInfo, analysis: StyleAnalysis) => {
    setWallpaper(wp);
    setStyleAnalysis(analysis);
    setPromptResult(null);
    setStep(3);
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleReset = () => {
    setStep(1);
    setCharacter(null);
    setWallpaper(null);
    setStyleAnalysis(null);
    setPromptResult(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AI Prompt Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate AI image prompts from character descriptions
          </p>
        </div>
        <StepIndicator currentStep={step} steps={STEPS} />
        <div className="mt-8">
          {step === 1 && <CharacterStep character={character} onConfirm={handleCharacterConfirm} />}
          {step === 2 && character && (
            <WallpaperStep characterName={character.name} selectedWallpaper={wallpaper} styleAnalysis={styleAnalysis} onConfirm={handleWallpaperConfirm} onBack={handleBack} />
          )}
          {step === 3 && character && styleAnalysis && (
            <PromptStep character={character} styleAnalysis={styleAnalysis} promptResult={promptResult} onBack={handleBack} onReset={handleReset} />
          )}
        </div>
      </div>
    </main>
  );
}
