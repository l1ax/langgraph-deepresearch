import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';

const router: Router = Router();

/**
 * Events API
 *
 * 注意：事件持久化由 runs.ts 中的 SSE 流处理自动完成
 * 这里只提供读取功能
 */

// GET /events - 获取指定 thread 的所有事件
router.get('/', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.query;

    if (!threadId) {
      return res.status(400).json({ error: 'threadId is required' });
    }

    const events = await prisma.event.findMany({
      where: { threadId: threadId as string },
      orderBy: { sequence: 'asc' },
    });

    res.json(events);
  } catch (error) {
    console.error('[Proxy] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
