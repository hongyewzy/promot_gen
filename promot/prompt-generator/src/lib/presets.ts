import type { CharacterPreset, GroupPreset } from '@/types';

const CHAR_PRESETS_KEY = 'character_presets';
const GROUP_PRESETS_KEY = 'group_presets';

// -- Utility functions --

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__preset_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// -- Character Preset CRUD --

export function getCharacterPresets(): Record<string, CharacterPreset> {
  if (!isLocalStorageAvailable()) return {};
  return safeParse<Record<string, CharacterPreset>>(
    window.localStorage.getItem(CHAR_PRESETS_KEY),
    {}
  );
}

export function getCharacterPreset(name: string): CharacterPreset | null {
  const presets = getCharacterPresets();
  return presets[name] || null;
}

export function saveCharacterPreset(preset: CharacterPreset): void {
  const presets = getCharacterPresets();
  presets[preset.name] = preset;
  window.localStorage.setItem(CHAR_PRESETS_KEY, JSON.stringify(presets));
}

export function deleteCharacterPreset(name: string): void {
  const presets = getCharacterPresets();
  delete presets[name];
  window.localStorage.setItem(CHAR_PRESETS_KEY, JSON.stringify(presets));
}

// -- Group Preset CRUD --

export function getGroupPresets(): Record<string, GroupPreset> {
  if (!isLocalStorageAvailable()) return {};
  return safeParse<Record<string, GroupPreset>>(
    window.localStorage.getItem(GROUP_PRESETS_KEY),
    {}
  );
}

export function getGroupPreset(name: string): GroupPreset | null {
  const presets = getGroupPresets();
  return presets[name] || null;
}

export function saveGroupPreset(preset: GroupPreset): void {
  const presets = getGroupPresets();
  presets[preset.name] = preset;
  window.localStorage.setItem(GROUP_PRESETS_KEY, JSON.stringify(presets));
}

export function deleteGroupPreset(name: string): void {
  const presets = getGroupPresets();
  delete presets[name];
  window.localStorage.setItem(GROUP_PRESETS_KEY, JSON.stringify(presets));
}
