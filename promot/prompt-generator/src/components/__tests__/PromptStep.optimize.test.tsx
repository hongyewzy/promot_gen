import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PromptStep from '../PromptStep';
import type { CharacterInfo, StyleSettings } from '@/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCharacters: CharacterInfo[] = [
  {
    name: '测试角色',
    hairColor: '黑色',
    hairstyle: '长直发',
    eyeColor: '棕色',
    skinColor: '白皙',
    bodyType: '苗条',
    featuredMark: '',
    age: 20,
  },
];

const mockSettings: StyleSettings = {
  orientation: 'portrait',
  pose: { body: '站立', expression: '微笑', camera: '平视' },
  clothing: { top: 'T恤', bottom: '长裤', shoes: '运动鞋', accessory: '' },
  background: '教室',
  artStyle: '日系动漫',
  lighting: '自然光',
  composition: '半身',
};

describe('PromptStep 优化功能', () => {
  const defaultProps = {
    characters: mockCharacters,
    settings: mockSettings,
    promptResult: null,
    onBack: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('生成提示词后每个角色卡片显示"优化提示词"按钮', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        chinese: '[测试角色]一位20岁的少女，黑色长直发',
      }),
    });

    render(<PromptStep {...defaultProps} />);

    // 点击批量生成
    fireEvent.click(screen.getByText(/批量生成/));

    // 等待生成完成，优化按钮应该出现
    await waitFor(() => {
      expect(screen.getByText('优化提示词')).toBeInTheDocument();
    });
  });

  it('点击优化按钮调用 /api/optimize 并显示诊断分数', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chinese: '[测试角色]一位20岁的少女',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          diagnosis: {
            dimensions: [
              { name: '主体', score: 2, suggestion: '充分' },
              { name: '场景', score: 1, suggestion: '可以更具体' },
              { name: '风格', score: 2, suggestion: '明确' },
              { name: '镜头', score: 0, suggestion: '缺少镜头信息' },
              { name: '氛围', score: 1, suggestion: '可以更丰富' },
              { name: '细节', score: 1, suggestion: '需要更多修饰' },
            ],
            totalScore: 7,
          },
          optimized: '优化后的提示词内容',
        }),
      });

    render(<PromptStep {...defaultProps} />);

    // 先生成
    fireEvent.click(screen.getByText(/批量生成/));
    await waitFor(() => {
      expect(screen.getByText('优化提示词')).toBeInTheDocument();
    });

    // 点击优化
    fireEvent.click(screen.getByText('优化提示词'));

    // 等待优化完成，显示诊断分数
    await waitFor(() => {
      expect(screen.getByText(/诊断得分：7\/12/)).toBeInTheDocument();
    });

    // 验证调用了 /api/optimize
    expect(mockFetch).toHaveBeenCalledWith('/api/optimize', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('优化结果中显示 6 个维度的分数', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chinese: '[测试角色]一位20岁的少女',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          diagnosis: {
            dimensions: [
              { name: '主体', score: 2, suggestion: '充分' },
              { name: '场景', score: 1, suggestion: '可以更具体' },
              { name: '风格', score: 2, suggestion: '明确' },
              { name: '镜头', score: 0, suggestion: '缺少' },
              { name: '氛围', score: 1, suggestion: '可以更丰富' },
              { name: '细节', score: 1, suggestion: '需要更多修饰' },
            ],
            totalScore: 7,
          },
          optimized: '优化后的提示词',
        }),
      });

    render(<PromptStep {...defaultProps} />);

    fireEvent.click(screen.getByText(/批量生成/));
    await waitFor(() => {
      expect(screen.getByText('优化提示词')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('优化提示词'));

    await waitFor(() => {
      // 6个维度标签都应该显示
      expect(screen.getByText('主体')).toBeInTheDocument();
      expect(screen.getByText('场景')).toBeInTheDocument();
      expect(screen.getByText('风格')).toBeInTheDocument();
      expect(screen.getByText('镜头')).toBeInTheDocument();
      expect(screen.getByText('氛围')).toBeInTheDocument();
      expect(screen.getByText('细节')).toBeInTheDocument();
    });
  });
});
