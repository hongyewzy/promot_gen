import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Copy, Sparkles, CheckCircle } from 'lucide-react';
import type { CharacterInfo, StyleAnalysis, PromptResult } from '@/types';

interface PromptStepProps {
  character: CharacterInfo;
  styleAnalysis: StyleAnalysis;
  promptResult: PromptResult | null;
  onBack: () => void;
  onReset: () => void;
}

export default function PromptStep({ character, styleAnalysis, promptResult, onBack, onReset }: PromptStepProps) {
  const [result, setResult] = useState<PromptResult | null>(promptResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generatePrompt = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, styleAnalysis }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
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

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Step 3: Prompt Generation
        </CardTitle>
        <CardDescription>Generate bilingual AI image prompts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Character Summary</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {character.name}</p>
              <p><span className="text-muted-foreground">Hair:</span> {character.hairColor}, {character.hairstyle}</p>
              <p><span className="text-muted-foreground">Eyes:</span> {character.eyeColor}</p>
              <p><span className="text-muted-foreground">Skin:</span> {character.skinTone}</p>
              <p><span className="text-muted-foreground">Build:</span> {character.height}, {character.build}</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Style Summary</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Style:</span> {styleAnalysis.style}</p>
              <p><span className="text-muted-foreground">Action:</span> {styleAnalysis.action}</p>
              <p><span className="text-muted-foreground">Expression:</span> {styleAnalysis.expression}</p>
              <p><span className="text-muted-foreground">Lighting:</span> {styleAnalysis.lighting}</p>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!result && !loading && (
          <Button onClick={generatePrompt} className="w-full" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Prompt
          </Button>
        )}
        {loading && (
          <div className="space-y-4">
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-full" /></div>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Chinese Prompt</h4>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.chinese, 'chinese')}>
                  {copiedField === 'chinese' ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedField === 'chinese' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Textarea value={result.chinese} readOnly className="min-h-[100px] resize-none bg-muted/30" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">English Prompt (Midjourney)</h4>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.english, 'english')}>
                  {copiedField === 'english' ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedField === 'english' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Textarea value={result.english} readOnly className="min-h-[100px] resize-none bg-muted/30 font-mono text-sm" />
            </div>
            <Button variant="outline" onClick={generatePrompt} className="w-full" disabled={loading}>
              <RefreshCw className={"w-4 h-4 mr-2 " + (loading ? 'animate-spin' : '')} />
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button variant="secondary" onClick={onReset} className="flex-1">
          Start Over
        </Button>
      </CardFooter>
    </Card>
  );
}
