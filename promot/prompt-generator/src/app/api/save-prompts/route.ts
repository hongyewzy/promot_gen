import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

const SCRIPT_DIR = join(process.cwd(), 'gpt-script');
const PROMPTS_FILE = join(SCRIPT_DIR, 'prompts.txt');
const BAT_FILE = join(SCRIPT_DIR, '启动.bat');

export async function POST(req: NextRequest) {
  try {
    const { prompts } = await req.json() as { prompts: string[] };

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: '提示词为空' }, { status: 400 });
    }

    // 确保目录存在
    await mkdir(SCRIPT_DIR, { recursive: true });

    // 写入 prompts.txt，格式：数字. 中文提示词
    const content = prompts
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n\n');

    await writeFile(PROMPTS_FILE, content, 'utf-8');

    // 自动运行 bat 脚本，传入文件路径
    // Windows 上 .bat 需要通过 cmd.exe 执行，使用 shell: true
    try {
      const child = spawn('cmd.exe', ['/c', BAT_FILE, PROMPTS_FILE], {
        cwd: SCRIPT_DIR,
        windowsHide: false,
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', (err) => console.error('Spawn error:', err));
      child.unref();
    } catch (spawnErr) {
      console.error('Spawn bat error:', spawnErr);
    }

    return NextResponse.json({
      success: true,
      file: PROMPTS_FILE,
      count: prompts.length,
    });
  } catch (e) {
    console.error('Save prompts error:', e);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
