/**
 * @jest-environment node
 */
import { POST } from '../route';

const mockCreate = jest.fn();

// Mock longcat
jest.mock('@/lib/longcat', () => ({
  longcat: {
    messages: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
  LONGCAT_MODEL: 'LongCat-2.0-Preview',
}));

// Mock perfector
jest.mock('@/lib/perfector', () => ({
  getSkillSystemPrompt: jest.fn().mockReturnValue('MOCK_SKILL_KNOWLEDGE'),
}));

function createRequest(body: object) {
  return new Request('http://localhost:3000/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_RESPONSE = {
  diagnosis: {
    dimensions: [
      { name: '主体', score: 1, suggestion: '描述模糊，需要更具体的外貌特征' },
      { name: '场景', score: 2, suggestion: '场景描述充分' },
      { name: '风格', score: 0, suggestion: '缺少艺术风格描述' },
      { name: '镜头', score: 0, suggestion: '缺少构图和视角信息' },
      { name: '氛围', score: 1, suggestion: '有基础氛围词但不够具体' },
      { name: '细节', score: 0, suggestion: '缺少细节修饰词' },
    ],
    totalScore: 4,
  },
  optimized: '一位18岁的中国少女，长发乌黑飘逸，明眸皓齿，身穿白色汉服，站在古老寺庙庭院中，樱花飘落，金色夕阳洒落，柔和光晕，日系动漫插画风格，赛璐璐平涂，特写人像，8K高清，细节丰富',
};

describe('POST /api/optimize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(MOCK_RESPONSE) }],
    });
  });

  it('缺少 prompt 时返回 400', async () => {
    const req = createRequest({ prompt: '' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('正常输入时返回 200 和优化结果', async () => {
    const req = createRequest({ prompt: '一个女孩在花园里' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.optimized).toBeDefined();
    expect(typeof data.optimized).toBe('string');
  });

  it('返回诊断分数', async () => {
    const req = createRequest({ prompt: '一个女孩' });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data.diagnosis).toBeDefined();
    expect(data.diagnosis.totalScore).toBeDefined();
    expect(Array.isArray(data.diagnosis.dimensions)).toBe(true);
    expect(data.diagnosis.dimensions.length).toBe(6);
  });

  it('prompt 中包含 skill 知识', async () => {
    const req = createRequest({ prompt: '一个女孩' });
    await POST(req as any);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain('MOCK_SKILL_KNOWLEDGE');
  });

  it('支持指定目标工具', async () => {
    const req = createRequest({ prompt: '一个女孩', tool: 'Midjourney' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain('Midjourney');
  });
});
