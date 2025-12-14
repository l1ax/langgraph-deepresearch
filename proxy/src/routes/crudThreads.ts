import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';

const router: Router = Router();

// GET /threads - 获取所有对话（可按用户筛选）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const threads = await prisma.thread.findMany({
      where: userId ? { userId: userId as string } : undefined,
      include: {
        user: {
          select: {
            id: true
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(threads);
  } catch (error) {
    console.error('[Proxy] Error fetching threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// PATCH /threads/:id - 更新对话
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const thread = await prisma.thread.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        updatedAt: new Date(),
      },
    });

    res.json(thread);
  } catch (error) {
    console.error('[Proxy] Error updating thread:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// DELETE /threads/:id - 删除对话
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.thread.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Proxy] Error deleting thread:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

export default router;
