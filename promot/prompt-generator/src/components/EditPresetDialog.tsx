'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import type { CharacterPreset, GroupPreset, SourceType } from '@/types';

interface EditPresetDialogProps {
  mode: 'character' | 'group';
  initialData?: CharacterPreset | GroupPreset | null;
  onSave: (data: CharacterPreset | GroupPreset) => void;
  onClose: () => void;
}

const sourceOptions: SourceType[] = ['游戏', '动漫', '漫画', '小说'];

export default function EditPresetDialog({
  mode,
  initialData,
  onSave,
  onClose,
}: EditPresetDialogProps) {
  const isCharacter = mode === 'character';

  const [charName, setCharName] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [hairstyle, setHairstyle] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [skinColor, setSkinColor] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [featuredMark, setFeaturedMark] = useState('');
  const [charSourceType, setCharSourceType] = useState<SourceType | ''>('');
  const [charSourceName, setCharSourceName] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupSourceType, setGroupSourceType] = useState<SourceType | ''>('');
  const [groupSourceName, setGroupSourceName] = useState('');
  const [namesText, setNamesText] = useState('');

  useEffect(() => {
    if (initialData) {
      if (isCharacter) {
        const d = initialData as CharacterPreset;
        setCharName(d.name);
        setHairColor(d.hairColor);
        setHairstyle(d.hairstyle);
        setEyeColor(d.eyeColor);
        setSkinColor(d.skinColor);
        setBodyType(d.bodyType);
        setFeaturedMark(d.featuredMark);
        setCharSourceType(d.sourceType || '');
        setCharSourceName(d.sourceName || '');
      } else {
        const d = initialData as GroupPreset;
        setGroupName(d.name);
        setGroupSourceType(d.sourceType);
        setGroupSourceName(d.sourceName);
        setNamesText(d.names.join(', '));
      }
    }
  }, [initialData, isCharacter]);

  const handleSave = () => {
    if (isCharacter) {
      if (!charName.trim()) return;
      onSave({
        name: charName.trim(),
        hairColor,
        hairstyle,
        eyeColor,
        skinColor,
        bodyType,
        featuredMark,
        sourceType: charSourceType || undefined,
        sourceName: charSourceName || undefined,
      } as CharacterPreset);
    } else {
      if (!groupName.trim()) return;
      const names = namesText
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      onSave({
        name: groupName.trim(),
        sourceType: groupSourceType,
        sourceName: groupSourceName,
        names,
      } as GroupPreset);
    }
  };

  const canSave = isCharacter ? charName.trim() : groupName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">
            {initialData ? '编辑' : '新建'}
            {isCharacter ? '人物预设' : '分组预设'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {isCharacter ? (
            <>
              <div className="space-y-1.5">
                <Label>人物姓名 *</Label>
                <Input value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="如：八重神子" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>发色</Label>
                  <Input value={hairColor} onChange={(e) => setHairColor(e.target.value)} placeholder="如：粉紫色渐变" />
                </div>
                <div className="space-y-1.5">
                  <Label>发型</Label>
                  <Input value={hairstyle} onChange={(e) => setHairstyle(e.target.value)} placeholder="如：长直发" />
                </div>
                <div className="space-y-1.5">
                  <Label>瞳色</Label>
                  <Input value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} placeholder="如：紫色" />
                </div>
                <div className="space-y-1.5">
                  <Label>肤色</Label>
                  <Input value={skinColor} onChange={(e) => setSkinColor(e.target.value)} placeholder="如：白皙" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>身高体型</Label>
                <Input value={bodyType} onChange={(e) => setBodyType(e.target.value)} placeholder="如：168cm苗条" />
              </div>
              <div className="space-y-1.5">
                <Label>标志性特征</Label>
                <Input value={featuredMark} onChange={(e) => setFeaturedMark(e.target.value)} placeholder="如：狐耳、泪痣" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>来源类型</Label>
                  <select
                    value={charSourceType}
                    onChange={(e) => setCharSourceType(e.target.value as SourceType | '')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">无</option>
                    {sourceOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>来源名称</Label>
                  <Input value={charSourceName} onChange={(e) => setCharSourceName(e.target.value)} placeholder="如：原神" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>预设组名 *</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="如：原神" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>来源类型</Label>
                  <select
                    value={groupSourceType}
                    onChange={(e) => setGroupSourceType(e.target.value as SourceType | '')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">无</option>
                    {sourceOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>来源名称</Label>
                  <Input value={groupSourceName} onChange={(e) => setGroupSourceName(e.target.value)} placeholder="如：原神" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>人物列表（逗号分隔）</Label>
                <Textarea
                  value={namesText}
                  onChange={(e) => setNamesText(e.target.value)}
                  placeholder="如：八重神子, 胡桃, 雷电影"
                  rows={4}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {initialData ? '更新' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
