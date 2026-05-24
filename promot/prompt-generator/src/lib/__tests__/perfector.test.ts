import { getDimensionsGuide, getPatternsGuide, getToolsGuide, getSkillSystemPrompt } from '../perfector';

describe('perfector', () => {
  describe('getDimensionsGuide', () => {
    it('返回非空字符串', () => {
      const result = getDimensionsGuide();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('包含6个维度', () => {
      const result = getDimensionsGuide();
      expect(result).toContain('主体');
      expect(result).toContain('场景');
      expect(result).toContain('风格');
      expect(result).toContain('镜头');
      expect(result).toContain('氛围');
      expect(result).toContain('细节');
    });

    it('包含评分标准', () => {
      const result = getDimensionsGuide();
      expect(result).toContain('0分');
      expect(result).toContain('1分');
      expect(result).toContain('2分');
    });
  });

  describe('getPatternsGuide', () => {
    it('返回非空字符串', () => {
      const result = getPatternsGuide();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('包含精确描述映射表', () => {
      const result = getPatternsGuide();
      expect(result).toContain('模糊描述');
      expect(result).toContain('精确描述');
    });

    it('包含模板', () => {
      const result = getPatternsGuide();
      expect(result).toContain('模板');
    });
  });

  describe('getToolsGuide', () => {
    it('返回非空字符串', () => {
      const result = getToolsGuide();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('包含 Midjourney 参数', () => {
      const result = getToolsGuide();
      expect(result).toContain('Midjourney');
      expect(result).toContain('--ar');
    });

    it('包含 Stable Diffusion 参数', () => {
      const result = getToolsGuide();
      expect(result).toContain('Stable Diffusion');
    });
  });

  describe('getSkillSystemPrompt', () => {
    it('返回非空字符串', () => {
      const result = getSkillSystemPrompt();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('包含全部三个指南的内容', () => {
      const result = getSkillSystemPrompt();
      // 来自 dimensions
      expect(result).toContain('主体');
      // 来自 patterns
      expect(result).toContain('模糊描述');
      // 来自 tools
      expect(result).toContain('Midjourney');
    });

    it('skill 知识量合理（大于 5000 字符）', () => {
      const result = getSkillSystemPrompt();
      expect(result.length).toBeGreaterThan(5000);
    });
  });
});
