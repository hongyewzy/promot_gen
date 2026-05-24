/**
 * @jest-environment node
 */
import { POST } from '../route';

// Mock longcat
jest.mock('@/lib/longcat', () => ({
  longcat: {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"chinese": "测试提示词内容"}' }],
      }),
    },
  },
  LONGCAT_MODEL: 'LongCat-2.0-Preview',
}));

// Mock perfector
jest.mock('@/lib/perfector', () => ({
  getSkillSystemPrompt: jest.fn().mockReturnValue('MOCK_SKILL_KNOWLEDGE'),
}));

function createRequest(body: object) {
  return new Request('http://localhost:3000/api/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('缺少人物数据时返回 400', async () => {
    const req = createRequest({ characters: [] });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('正常输入时返回 200 和中文提示词', async () => {
    const req = createRequest({
      characters: [{
        name: '测试角色',
        hairColor: '黑色',
        hairstyle: '长直发',
        eyeColor: '棕色',
        skinColor: '白皙',
        bodyType: '苗条',
        featuredMark: '',
        age: 20,
      }],
      settings: {
        orientation: 'portrait',
        pose: { body: '站立', expression: '微笑', camera: '平视' },
        clothing: { top: 'T恤', bottom: '长裤', shoes: '运动鞋', accessory: '' },
        background: '教室',
        artStyle: '日系动漫',
        lighting: '自然光',
        composition: '半身',
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chinese).toBeDefined();
    expect(typeof data.chinese).toBe('string');
  });

  it('生成的提示词包含角色名前缀', async () => {
    const req = createRequest({
      characters: [{
        name: '胡桃',
        hairColor: '深棕色',
        hairstyle: '双马尾',
        eyeColor: '红色',
        skinColor: '白皙',
        bodyType: '娇小',
        featuredMark: '梅花瞳',
      }],
    });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data.chinese).toContain('胡桃');
  });

  it('prompt 中包含画幅方向信息', async () => {
    const { longcat } = require('@/lib/longcat');
    const req = createRequest({
      characters: [{
        name: '测试',
        hairColor: '黑',
        hairstyle: '短发',
        eyeColor: '蓝',
        skinColor: '白',
        bodyType: '中等',
        featuredMark: '',
      }],
      settings: {
        orientation: 'landscape',
        pose: { body: '', expression: '', camera: '' },
        clothing: { top: '', bottom: '', shoes: '', accessory: '' },
        background: '',
        artStyle: '',
        lighting: '',
        composition: '',
      },
    });
    await POST(req as any);

    const callArgs = longcat.messages.create.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain('横屏');
    expect(userMessage).toContain('16:9');
  });

  it('prompt 中包含 skill 知识', async () => {
    const { longcat } = require('@/lib/longcat');
    const req = createRequest({
      characters: [{
        name: '测试',
        hairColor: '黑',
        hairstyle: '短发',
        eyeColor: '蓝',
        skinColor: '白',
        bodyType: '中等',
        featuredMark: '',
      }],
    });
    await POST(req as any);

    const callArgs = longcat.messages.create.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain('MOCK_SKILL_KNOWLEDGE');
  });
});
