import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/events - 获取指定 thread 的所有事件
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const threadId = searchParams.get('threadId');

        if (!threadId) {
            return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
        }

        const events = await prisma.event.findMany({
            where: { threadId },
            orderBy: { sequence: 'asc' },
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

// POST /api/events - 创建或更新事件（upsert）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { threadId, events } = body as {
            threadId: string;
            events: Array<{
                id: string;
                eventType: string;
                status: string;
                content: unknown;
                parentId?: string;
                sequence: number;
            }>;
        };

        if (!threadId || !events || !Array.isArray(events)) {
            return NextResponse.json(
                { error: 'threadId and events array are required' },
                { status: 400 }
            );
        }

        // 使用事务批量 upsert 事件
        const result = await prisma.$transaction(
            events.map((event) =>
                prisma.event.upsert({
                    where: { id: event.id },
                    create: {
                        id: event.id,
                        threadId,
                        eventType: event.eventType,
                        status: event.status,
                        content: event.content as object,
                        parentId: event.parentId,
                        sequence: event.sequence,
                    },
                    update: {
                        eventType: event.eventType,
                        status: event.status,
                        content: event.content as object,
                        parentId: event.parentId,
                        sequence: event.sequence,
                    },
                })
            )
        );

        return NextResponse.json({ success: true, count: result.length }, { status: 201 });
    } catch (error) {
        console.error('Error upserting events:', error);
        return NextResponse.json({ error: 'Failed to upsert events' }, { status: 500 });
    }
}

// DELETE /api/events - 删除指定 thread 的所有事件
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const threadId = searchParams.get('threadId');

        if (!threadId) {
            return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
        }

        await prisma.event.deleteMany({
            where: { threadId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting events:', error);
        return NextResponse.json({ error: 'Failed to delete events' }, { status: 500 });
    }
}

/**
 * Status 优先级：finished > error > running > pending
 * 返回更"完成"的 status
 */
function getStatusPriority(status: string): number {
    switch (status) {
        case 'finished': return 4;
        case 'error': return 3;
        case 'running': return 2;
        case 'pending': return 1;
        default: return 0;
    }
}

/**
 * 比较两个 status，返回更"完成"的那个
 */
function getMostCompleteStatus(status1: string, status2: string): string {
    return getStatusPriority(status1) >= getStatusPriority(status2) ? status1 : status2;
}

// PATCH /api/events - 智能同步 state events 与数据库
// 比对相同 event 的 status，保留更"完成"的版本
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { threadId, events: stateEvents } = body as {
            threadId: string;
            events: Array<{
                id: string;
                eventType: string;
                status: string;
                content: unknown;
                parentId?: string;
            }>;
        };

        if (!threadId || !stateEvents || !Array.isArray(stateEvents)) {
            return NextResponse.json(
                { error: 'threadId and events array are required' },
                { status: 400 }
            );
        }

        // 获取数据库中已有的 events（包含完整信息用于比对）
        const dbEvents = await prisma.event.findMany({
            where: { threadId },
        });
        const dbEventsMap = new Map(dbEvents.map(e => [e.id, e]));

        // 分类处理
        const eventsToCreate: Array<{
            id: string;
            eventType: string;
            status: string;
            content: unknown;
            parentId?: string;
        }> = [];
        const eventsToUpdate: Array<{
            id: string;
            status: string;
            content: unknown;
        }> = [];

        for (const stateEvent of stateEvents) {
            const dbEvent = dbEventsMap.get(stateEvent.id);

            if (!dbEvent) {
                // 数据库中没有这个 event，需要创建
                eventsToCreate.push(stateEvent);
            } else {
                // 两边都有，比较 status
                const moreCompleteStatus = getMostCompleteStatus(dbEvent.status, stateEvent.status);
                
                // 如果 state 的 status 更完整，更新数据库
                if (moreCompleteStatus === stateEvent.status && stateEvent.status !== dbEvent.status) {
                    eventsToUpdate.push({
                        id: stateEvent.id,
                        status: stateEvent.status,
                        content: stateEvent.content,
                    });
                }
            }
        }

        // 执行数据库操作
        let created = 0;
        let updated = 0;

        if (eventsToCreate.length > 0) {
            // 获取当前最大 sequence
            const maxSeqResult = await prisma.event.aggregate({
                where: { threadId },
                _max: { sequence: true },
            });
            let nextSequence = (maxSeqResult._max.sequence ?? 0) + 1;

            await prisma.$transaction(
                eventsToCreate.map((event) =>
                    prisma.event.create({
                        data: {
                            id: event.id,
                            threadId,
                            eventType: event.eventType,
                            status: event.status,
                            content: event.content as object,
                            parentId: event.parentId,
                            sequence: nextSequence++,
                        },
                    })
                )
            );
            created = eventsToCreate.length;
        }

        if (eventsToUpdate.length > 0) {
            await prisma.$transaction(
                eventsToUpdate.map((event) =>
                    prisma.event.update({
                        where: { id: event.id },
                        data: {
                            status: event.status,
                            content: event.content as object,
                        },
                    })
                )
            );
            updated = eventsToUpdate.length;
        }

        console.log(`[Events API] Sync result for thread ${threadId}: created=${created}, updated=${updated}`);
        return NextResponse.json({ success: true, created, updated });
    } catch (error) {
        console.error('Error syncing events:', error);
        return NextResponse.json({ error: 'Failed to sync events' }, { status: 500 });
    }
}

