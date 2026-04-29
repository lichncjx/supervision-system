import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';

export const metadata: Metadata = {
  title: {
    default: '公司督办管理系统（禁止上传涉密信息）',
    template: '%s | 公司督办管理系统（禁止上传涉密信息）',
  },
  description: '公司督办管理系统（禁止上传涉密信息） - 跟踪和管理重点工作、主要工作、待办事项',
  keywords: ['督办', '管理', '工作跟踪', '审批'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}