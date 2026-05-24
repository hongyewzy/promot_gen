import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 生图提示词生成器',
  description: '输入人物，AI 自动查询形象特征，融合参考壁纸风格，生成双语生图提示词',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='zh-CN'>
      <body>{children}</body>
    </html>
  );
}
