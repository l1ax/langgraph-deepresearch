'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F4F8]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-100">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">认证失败</h1>
        <p className="text-slate-600 max-w-md">
          GitHub 登录过程中出现错误，请重试。
        </p>
        <Button asChild className="mt-4">
          <Link href="/deepResearch">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}


