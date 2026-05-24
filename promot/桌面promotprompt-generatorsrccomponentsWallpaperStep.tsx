import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefreshCw, ArrowRight, ArrowLeft, ImageIcon, Check } from 'lucide-react';
import type { WallpaperInfo, StyleAnalysis } from '@/types';

interface WallpaperStepProps {
  characterName: string;
  selectedWallpaper: WallpaperInfo | null;
  styleAnalysis: StyleAnalysis | null;
  onConfirm: (wallpaper: WallpaperInfo, analysis: StyleAnalysis) => void;
  onBack: () => void;
}

export default function WallpaperStep({ characterName, selectedWallpaper, styleAnalysis, onConfirm, onBack }: WallpaperStepProps) {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<WallpaperInfo | null>(selectedWallpaper);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(styleAnalysis);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(characterName);

  const fetchWallpapers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wallpaper?q=' + encodeURIComponent(searchQuery));
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWallpapers(data.wallpapers);
      setSelected(null);
      setAnalysis(null);
    } catch {
      setError('Failed to load wallpapers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallpapers(); }, []);

  const handleSelect = async (wp: WallpaperInfo) => {
    setSelected(wp);
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: wp.url }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setError('Failed to analyze wallpaper style');
    } finally {
      setAnalyzing(false);
    }
  };

  const analysisFields: { key: keyof StyleAnalysis; label: string }[] = [
    { key: 'style', label: 'Style' },
    { key: 'action', label: 'Action/Pose' },
    { key: 'expression', label: 'Expression' },
    { key: 'clothing', label: 'Clothing' },
    { key: 'background', label: 'Background' },
    { key: 'lighting', label: 'Lighting' },
    { key: 'colorPalette', label: 'Color Palette' },
  ];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Step 2: Wallpaper Selection
        </CardTitle>
        <CardDescription>Select a wallpaper to extract style features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search wallpapers..." className="flex-1" />
          <Button onClick={fetchWallpapers} disabled={loading}>
            <RefreshCw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} />
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {loading && wallpapers.length === 0 && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />)}
          {wallpapers.map((wp) => (
            <button key={wp.id} onClick={() => handleSelect(wp)}
              className={"relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary " + (selected?.id === wp.id ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}>
              <img src={wp.thumbnailUrl} alt="wallpaper" className="w-full h-full object-cover" loading="lazy" />
              {selected?.id === wp.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="bg-primary text-primary-foreground rounded-full p-1"><Check className="w-4 h-4" /></div>
                </div>
              )}
            </button>
          ))}
        </div>
        {(analyzing || analysis) && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium">Style Analysis</h3>
            {analyzing && !analysis && analysisFields.map((f) => <div key={f.key} className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-full" /></div>)}
            {analysis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <div className="text-sm bg-background rounded px-3 py-1.5 border">{analysis[f.key]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={() => selected && analysis && onConfirm(selected, analysis)} disabled={!selected || !analysis || analyzing} className="flex-1">
            Confirm & Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
