import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/users - 获取所有用户
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        threads: {
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - 创建用户（使用 Supabase Auth ID）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 使用 upsert：如果用户存在则更新时间戳，否则创建
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        // 只更新 updatedAt（自动）
      },
      create: {
        id,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    // 返回更详细的错误信息便于调试
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to create/update user',
      details: errorMessage
    }, { status: 500 });
  }
}
