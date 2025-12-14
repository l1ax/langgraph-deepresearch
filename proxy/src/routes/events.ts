import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import {eventPersistence} from '../services/eventPersistence.js';

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

/**
 * 清空事件缓冲区，将所有事件保存到数据库
 */
router.post('/flush', async (req: Request, res: Response) => {
  try {
    await eventPersistence.flush();
    res.json({ message: 'Events flushed successfully', status: 'success' });
  } catch (error) {
    console.error('[Proxy] Error flushing events:', error);
    res.status(500).json({ error: 'Failed to flush events', status: 'error' });
  }
});

export default router;
