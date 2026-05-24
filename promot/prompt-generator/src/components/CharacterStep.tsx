'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, RefreshCw, ArrowRight, User, BookmarkPlus, Star } from 'lucide-react';
import type { CharacterInfo, SourceType, GroupPreset, CharacterPreset } from '@/types';
import { saveCharacterPreset, saveGroupPreset, getCharacterPresets, getCharacterPreset } from '@/lib/presets';
import PresetPanel from '@/components/PresetPanel';

interface CharacterStepProps {
  characters: CharacterInfo[];
  sourceType: SourceType | '';
  sourceName: string;
  onConfirm: (characters: CharacterInfo[], sourceType: SourceType | '', sourceName: string) => void;
  onSourceTypeChange: (t: SourceType | '') => void;
  onSourceNameChange: (v: string) => void;
}

const sourceOptions: SourceType[] = ['游戏', '动漫', '漫画', '小说'];

const fields: { key: keyof CharacterInfo; label: string; placeholder: string; type?: string }[] = [
  { key: 'hairColor', label: '发色', placeholder: '如：银白色渐变、深蓝黑色...' },
  { key: 'hairstyle', label: '发型', placeholder: '如：齐刘海长直发、双丸子头...' },
  { key: 'eyeColor', label: '瞳色', placeholder: '如：琥珀色异瞳、深红色...' },
  { key: 'skinColor', label: '肤色', placeholder: '如：白皙、小麦色、古铜色...' },
  { key: 'age', label: '年龄', placeholder: '如：16', type: 'number' },
  { key: 'bodyType', label: '身高体型', placeholder: '如：165cm苗条、180cm健壮...' },
  { key: 'featuredMark', label: '标志性特征', placeholder: '如：泪痣、兽耳、机械臂、疤痕...' },
];

export default function CharacterStep({
  characters: initialCharacters,
  sourceType: initialSourceType,
  sourceName: initialSourceName,
  onConfirm,
  onSourceTypeChange,
  onSourceNameChange,
}: CharacterStepProps) {
  const [namesInput, setNamesInput] = useState(
    initialCharacters.map((c) => c.name).filter(Boolean).join(', ')
  );
  const [sourceType, setSourceType] = useState<SourceType | ''>(initialSourceType);
  const [sourceName, setSourceName] = useState(initialSourceName);
  const [characters, setCharacters] = useState<CharacterInfo[]>(initialCharacters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
const [showPresets, setShowPresets] = useState(false);
const [showSaveGroupDialog, setShowSaveGroupDialog] = useState(false);
const [newGroupName, setNewGroupName] = useState('');
const [starred, setStarred] = useState<Record<number, boolean>>({});

  const handleSourceTypeChange = (t: SourceType | '') => {
    setSourceType(t);
    onSourceTypeChange(t);
  };

  const handleSourceNameChange = (v: string) => {
    setSourceName(v);
    onSourceNameChange(v);
  };

  const parseNames = (input: string): string[] =>
    input.split(',').map((n) => n.trim()).filter(Boolean);

  const handleBatchSearchWithNames = useCallback(async (names: string[]) => {
    if (names.length === 0) return;

    setLoading(true);
    setError('');

    const newChars: CharacterInfo[] = names.map((name) => ({
      name, hairColor: '', hairstyle: '', eyeColor: '', skinColor: '', bodyType: '', featuredMark: '',
      sourceType: sourceType || undefined,
      sourceName: sourceName || undefined,
    }));
    setCharacters(newChars);

    for (let i = 0; i < names.length; i++) {
      try {
        const res = await fetch('/api/character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: names[i],
            sourceType: sourceType || undefined,
            sourceName: sourceName?.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data: CharacterInfo = await res.json();
          newChars[i] = { ...data, name: data.name || names[i] };
          setCharacters([...newChars]);
        }
      } catch { /* skip */ }
    }

    setLoading(false);
  }, [sourceType, sourceName]);

  const handleBatchSearch = async () => {
    const names = parseNames(namesInput);
    await handleBatchSearchWithNames(names);
  };

  const handleFieldChange = (idx: number, key: keyof CharacterInfo, value: string) => {
    const updated = [...characters];
    updated[idx] = { ...updated[idx], [key]: value };
    setCharacters(updated);
  };

  const handleApplyGroup = useCallback(async (preset: GroupPreset) => {
    handleSourceTypeChange(preset.sourceType);
    handleSourceNameChange(preset.sourceName);
    setShowPresets(false);

    // 尝试从预设中加载每个人物的特征数据，避免重复查询
    const loadedChars: CharacterInfo[] = [];
    const missingNames: string[] = [];

    for (const name of preset.names) {
      const charPreset = getCharacterPreset(name);
      if (charPreset && charPreset.hairColor) {
        loadedChars.push({
          name: charPreset.name,
          hairColor: charPreset.hairColor,
          hairstyle: charPreset.hairstyle,
          eyeColor: charPreset.eyeColor,
          skinColor: charPreset.skinColor,
          bodyType: charPreset.bodyType,
          featuredMark: charPreset.featuredMark,
          age: charPreset.age,
          sourceType: charPreset.sourceType,
          sourceName: charPreset.sourceName,
        });
      } else {
        missingNames.push(name);
      }
    }

    // 所有人物都有预设，直接设置，无需查询
    if (missingNames.length === 0) {
      setCharacters(loadedChars);
      setNamesInput(preset.names.join(', '));
      return;
    }

    // 部分人物需要查询：先设置已有预设的人物 + 空占位
    const allChars = [
      ...loadedChars,
      ...missingNames.map((name) => ({
        name, hairColor: '', hairstyle: '', eyeColor: '', skinColor: '', bodyType: '', featuredMark: '',
        sourceType: (sourceType || undefined) as SourceType | undefined,
        sourceName: (sourceName?.trim() || undefined) as string | undefined,
      })),
    ];
    setCharacters(allChars);
    setNamesInput(preset.names.join(', '));

    // 查询缺失的人物，结果合并到对应位置
    setLoading(true);
    setError('');
    for (let i = 0; i < missingNames.length; i++) {
      const targetIdx = loadedChars.length + i;
      try {
        const res = await fetch('/api/character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: missingNames[i],
            sourceType: (sourceType || undefined) as SourceType | undefined,
            sourceName: (sourceName?.trim() || undefined) as string | undefined,
          }),
        });
        if (res.ok) {
          const data: CharacterInfo = await res.json();
          allChars[targetIdx] = { ...data, name: data.name || missingNames[i] };
          setCharacters([...allChars]);
        }
      } catch { /* skip */ }
    }
    setLoading(false);
  }, [handleSourceTypeChange, handleSourceNameChange, sourceType, sourceName]);

  const handleApplyCharacter = useCallback((preset: CharacterPreset) => {
    // 检查当前是否已有同名且已查询的人物
    const existingIdx = characters.findIndex((c) => c.name === preset.name);
    if (existingIdx >= 0 && characters[existingIdx].hairColor) {
      // 已有且已查询，用预设数据覆盖
      const updated = [...characters];
      updated[existingIdx] = {
        name: preset.name,
        hairColor: preset.hairColor,
        hairstyle: preset.hairstyle,
        eyeColor: preset.eyeColor,
        skinColor: preset.skinColor,
        bodyType: preset.bodyType,
        featuredMark: preset.featuredMark,
        age: preset.age,
        sourceType: preset.sourceType,
        sourceName: preset.sourceName,
      };
      setCharacters(updated);
    } else {
      // 直接填入特征数据，无需查询
      const newChar: CharacterInfo = {
        name: preset.name,
        hairColor: preset.hairColor,
        hairstyle: preset.hairstyle,
        eyeColor: preset.eyeColor,
        skinColor: preset.skinColor,
        bodyType: preset.bodyType,
        featuredMark: preset.featuredMark,
        age: preset.age,
        sourceType: preset.sourceType,
        sourceName: preset.sourceName,
      };
      if (existingIdx >= 0) {
        // 同名但未查询，替换
        const updated = [...characters];
        updated[existingIdx] = newChar;
        setCharacters(updated);
      } else {
        // 新人物，追加
        setCharacters((prev) => [...prev, newChar]);
        setNamesInput((prev) => {
          const names = parseNames(prev);
          if (!names.includes(preset.name)) {
            return prev ? `${prev}, ${preset.name}` : preset.name;
          }
          return prev;
        });
      }
    }
    setShowPresets(false);
  }, [characters]);

  const handleSaveGroupPreset = useCallback(() => {
    if (!newGroupName.trim()) return;
    const names = parseNames(namesInput);
    if (names.length === 0) return;
    saveGroupPreset({
      name: newGroupName.trim(),
      sourceType,
      sourceName,
      names,
    });
    setNewGroupName('');
    setShowSaveGroupDialog(false);
  }, [newGroupName, namesInput, sourceType, sourceName]);

  const handleToggleStar = useCallback((idx: number) => {
    const char = characters[idx];
    if (!char || !char.hairColor) return;
    const isStarred = starred[idx];
    if (isStarred) {
      setStarred((prev) => ({ ...prev, [idx]: false }));
    } else {
      saveCharacterPreset({
        name: char.name,
        hairColor: char.hairColor,
        hairstyle: char.hairstyle,
        eyeColor: char.eyeColor,
        skinColor: char.skinColor,
        bodyType: char.bodyType,
        featuredMark: char.featuredMark,
        age: char.age,
        sourceType: char.sourceType,
        sourceName: char.sourceName,
      });
      setStarred((prev) => ({ ...prev, [idx]: true }));
    }
  }, [characters, starred]);

  useEffect(() => {
    const presets = getCharacterPresets();
    const newStarred: Record<number, boolean> = {};
    characters.forEach((char, idx) => {
      if (presets[char.name]) {
        newStarred[idx] = true;
      }
    });
    setStarred(newStarred);
  }, [characters]);

  const validCount = characters.filter((c) => c.name.trim() && c.hairColor).length;
  const namesCount = parseNames(namesInput).length;
  const canSubmit = namesCount > 0 && validCount === namesCount;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          步骤 1：人物查询
        </CardTitle>
        <CardDescription>输入人物姓名（英文逗号分隔），AI 将批量查询外貌特征</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sourceType">来源类型（可选）</Label>
            <select
              id="sourceType"
              value={sourceType}
              onChange={(e) => handleSourceTypeChange(e.target.value as SourceType | '')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">自动识别</option>
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sourceName">来源名称（可选）</Label>
            <Input
              id="sourceName"
              placeholder="如：崩坏星穹铁道、火影忍者..."
              value={sourceName}
              onChange={(e) => handleSourceNameChange(e.target.value)}
            />
          </div>
        </div>

        {/* 预设面板 */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
            预设
            {showPresets ? ' ▲' : ' ▼'}
          </Button>
        </div>

        {showPresets && (
          <PresetPanel
            onApplyGroup={handleApplyGroup}
            onApplyCharacter={handleApplyCharacter}
            onSaveGroup={() => setShowSaveGroupDialog(true)}
          />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="names">人物姓名</Label>
          <div className="flex gap-2">
            <Input
              id="names"
              placeholder="如：八重神子, 胡桃, 雷电影"
              value={namesInput}
              onChange={(e) => setNamesInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBatchSearch} disabled={loading || !namesInput.trim()}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? '查询中...' : '批量查询'}
            </Button>
          </div>
          {namesCount > 0 && (
            <p className="text-xs text-muted-foreground">
              将查询 {namesCount} 个人物：{parseNames(namesInput).join('、')}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {characters.length > 0 && (
          <div className="space-y-3">
            {characters.map((char, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                  <span className="font-medium">{char.name}</span>
                  {char.hairColor && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {char.hairColor} · {char.eyeColor}
                    </span>
                  )}
                  {!char.hairColor && loading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
                  )}
                  {char.hairColor && (
                    <button
                      onClick={() => handleToggleStar(idx)}
                      className={`ml-2 transition-colors ${
                        starred[idx] ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                      }`}
                      title={starred[idx] ? '已保存为预设' : '保存为人物预设'}
                    >
                      <Star className="w-3.5 h-3.5" fill={starred[idx] ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
                {char.hairColor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <Label htmlFor={`${f.key}-${idx}`} className="text-xs">{f.label}</Label>
                        {f.type === 'number' ? (
                          <Input
                            id={`${f.key}-${idx}`}
                            type="number"
                            min={0}
                            max={999}
                            value={char.age ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...characters];
                              updated[idx] = { ...updated[idx], age: val === '' ? undefined : parseInt(val, 10) || undefined };
                              setCharacters(updated);
                            }}
                            placeholder={f.placeholder}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <Input
                            id={`${f.key}-${idx}`}
                            value={char[f.key] as string}
                            onChange={(e) => handleFieldChange(idx, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {characters.length > 0 && namesInput.trim() && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSaveGroupDialog(true)}
            className="w-full"
          >
            <BookmarkPlus className="w-4 h-4 mr-2" />
            保存当前为分组预设
          </Button>
        )}

        <Button
          onClick={() => onConfirm(characters, sourceType, sourceName)}
          className="w-full"
          disabled={!canSubmit}
        >
          确认 {validCount > 0 ? `${validCount} 个人物` : ''} 并继续
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>

      {/* 保存分组预设弹窗 */}
      {showSaveGroupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">保存分组预设</h3>
              <div className="space-y-1.5">
                <Label>预设组名</Label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="如：原神"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                将保存当前来源设置和 {parseNames(namesInput).length} 个人物
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowSaveGroupDialog(false); setNewGroupName(''); }}>
                  取消
                </Button>
                <Button onClick={handleSaveGroupPreset} disabled={!newGroupName.trim()}>
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
