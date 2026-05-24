export type SourceType = '游戏' | '动漫' | '漫画' | '小说';

export interface CharacterInfo {
  name: string;
  hairColor: string;
  hairstyle: string;
  eyeColor: string;
  skinColor: string;
  bodyType: string;
  featuredMark: string;
  age?: number;
  sourceType?: SourceType;
  sourceName?: string;
}

export type Orientation = 'portrait' | 'landscape';

export interface PoseDetail {
  body: string;
  expression: string;
  camera: string;
}

export interface ClothingDetail {
  top: string;
  bottom: string;
  shoes: string;
  accessory: string;
}

export interface StyleSettings {
  orientation: Orientation;
  pose: PoseDetail;
  clothing: ClothingDetail;
  background: string;
  artStyle: string;
  lighting: string;
  composition: string;
}

export interface PromptResult {
  chinese: string;
  english: string;
}

export const defaultPose = (): PoseDetail => ({
  body: '',
  expression: '',
  camera: '',
});

export const defaultClothing = (): ClothingDetail => ({
  top: '',
  bottom: '',
  shoes: '',
  accessory: '',
});

export const defaultSettings = (orientation: Orientation = 'portrait'): StyleSettings => ({
  orientation,
  pose: defaultPose(),
  clothing: defaultClothing(),
  background: '',
  artStyle: '',
  lighting: '',
  composition: '',
});

export interface CharacterPreset {
  name: string;
  hairColor: string;
  hairstyle: string;
  eyeColor: string;
  skinColor: string;
  bodyType: string;
  featuredMark: string;
  age?: number;
  sourceType?: SourceType;
  sourceName?: string;
}

export interface GroupPreset {
  name: string;
  sourceType: SourceType | '';
  sourceName: string;
  names: string[];
}