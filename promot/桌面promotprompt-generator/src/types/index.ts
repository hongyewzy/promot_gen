export interface CharacterInfo {
  name: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  hairstyle: string;
  height: string;
  build: string;
  distinctiveFeatures: string;
}

export interface WallpaperInfo {
  id: string;
  url: string;
  thumbnailUrl: string;
  author: string;
}

export interface StyleAnalysis {
  style: string;
  action: string;
  expression: string;
  clothing: string;
  background: string;
  lighting: string;
  colorPalette: string;
}

export interface PromptResult {
  chinese: string;
  english: string;
}
