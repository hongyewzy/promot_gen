import { readFileSync } from 'fs';
import { join } from 'path';

const SKILL_BASE = 'D:\\桌面\\skills\\ai-image-prompt-perfector\\references';

function loadFile(filename: string): string {
  const filePath = join(SKILL_BASE, filename);
  return readFileSync(filePath, 'utf-8');
}

export function getDimensionsGuide(): string {
  return loadFile('dimensions.md');
}

export function getPatternsGuide(): string {
  return loadFile('patterns.md');
}

export function getToolsGuide(): string {
  return loadFile('tools.md');
}

export function getSkillSystemPrompt(): string {
  return [
    '## 6维度提示词诊断框架',
    getDimensionsGuide(),
    '',
    '## 提示词优化模式与模板',
    getPatternsGuide(),
    '',
    '## 目标工具参数语法',
    getToolsGuide(),
  ].join('\n');
}
