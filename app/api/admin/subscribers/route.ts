import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/admin/subscribers
 * List all newsletter subscribers
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const [subscribers, total, active] = await Promise.all([
    prisma.subscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        subscribedAt: true,
      },
    }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { active: true } }),
  ]);

  return NextResponse.json({ subscribers, total, active });
}
