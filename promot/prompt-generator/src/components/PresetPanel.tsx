'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Star, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { CharacterPreset, GroupPreset } from '@/types';
import {
  getCharacterPresets,
  getGroupPresets,
  saveCharacterPreset,
  saveGroupPreset,
  deleteCharacterPreset,
  deleteGroupPreset,
} from '@/lib/presets';
import EditPresetDialog from '@/components/EditPresetDialog';

interface PresetPanelProps {
  onApplyGroup: (preset: GroupPreset) => void;
  onApplyCharacter: (preset: CharacterPreset) => void;
  onSaveGroup: () => void;
}

export default function PresetPanel({
  onApplyGroup,
  onApplyCharacter,
  onSaveGroup,
}: PresetPanelProps) {
  const [charPresets, setCharPresets] = useState<Record<string, CharacterPreset>>({});
  const [groupPresets, setGroupPresets] = useState<Record<string, GroupPreset>>({});
  const [groupExpanded, setGroupExpanded] = useState(true);
  const [charExpanded, setCharExpanded] = useState(true);
  const [editMode, setEditMode] = useState<{ type: 'character' | 'group'; data: CharacterPreset | GroupPreset } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setCharPresets(getCharacterPresets());
    setGroupPresets(getGroupPresets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDeleteGroup = (name: string) => {
    if (deleteConfirm === name) {
      deleteGroupPreset(name);
      setDeleteConfirm(null);
      refresh();
    } else {
      setDeleteConfirm(name);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleDeleteChar = (name: string) => {
    if (deleteConfirm === name) {
      deleteCharacterPreset(name);
      setDeleteConfirm(null);
      refresh();
    } else {
      setDeleteConfirm(name);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleEditSave = (data: CharacterPreset | GroupPreset) => {
    if (editMode?.type === 'character') {
      saveCharacterPreset(data as CharacterPreset);
    } else {
      saveGroupPreset(data as GroupPreset);
    }
    setEditMode(null);
    refresh();
  };

  const groupList = Object.values(groupPresets);
  const charList = Object.values(charPresets);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>📋 预设管理</span>
            <Button variant="ghost" size="sm" onClick={onSaveGroup} className="text-xs">
              <Star className="w-3.5 h-3.5 mr-1" />
              保存当前为分组预设
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <button
              onClick={() => setGroupExpanded(!groupExpanded)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {groupExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Users className="w-4 h-4" />
              分组预设 ({groupList.length})
            </button>
            {groupExpanded && (
              <div className="mt-2 space-y-2">
                {groupList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">暂无分组预设，输入人物后点击上方按钮保存</p>
                ) : (
                  groupList.map((gp) => (
                    <div
                      key={gp.name}
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors group"
                    >
                      <button
                        onClick={() => onApplyGroup(gp)}
                        className="flex-1 text-left text-sm"
                      >
                        <span className="font-medium">{gp.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {gp.sourceType && gp.sourceType}
                          {gp.sourceName && ' ' + gp.sourceName}
                          {gp.names.length > 0 ? ' (' + gp.names.length + ')' : ''}
                        </span>
                      </button>
                      <button
                        onClick={() => setEditMode({ type: 'group', data: gp })}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(gp.name)}
                        className={'opacity-0 group-hover:opacity-100 p-1 transition-all ' + (deleteConfirm === gp.name ? 'text-destructive opacity-100' : 'hover:text-destructive')}
                        title={deleteConfirm === gp.name ? '再次点击确认删除' : '删除'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setCharExpanded(!charExpanded)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {charExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Star className="w-4 h-4" />
              人物预设 ({charList.length})
            </button>
            {charExpanded && (
              <div className="mt-2 space-y-2">
                {charList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">暂无人物预设，查询后点击人物卡片上的 ☆ 保存</p>
                ) : (
                  charList.map((cp) => (
                    <div
                      key={cp.name}
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors group"
                    >
                      <button
                        onClick={() => onApplyCharacter(cp)}
                        className="flex-1 text-left text-sm"
                      >
                        <span className="font-medium">{cp.name}</span>
                        {cp.hairColor && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {cp.hairColor} {cp.eyeColor}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setEditMode({ type: 'character', data: cp })}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChar(cp.name)}
                        className={'opacity-0 group-hover:opacity-100 p-1 transition-all ' + (deleteConfirm === cp.name ? 'text-destructive opacity-100' : 'hover:text-destructive')}
                        title={deleteConfirm === cp.name ? '再次点击确认删除' : '删除'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editMode && (
        <EditPresetDialog
          mode={editMode.type}
          initialData={editMode.data}
          onSave={handleEditSave}
          onClose={() => setEditMode(null)}
        />
      )}
    </>
  );
}
