import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

const updateSeriesSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
});

/**
 * PUT /api/admin/series/[id] - Update a series
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const series = await prisma.articleSeries.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ series });
}

/**
 * DELETE /api/admin/series/[id] - Delete a series (articles stay, just unlinked)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;

  // Unlink articles first
  await prisma.article.updateMany({
    where: { seriesId: id },
    data: { seriesId: null, seriesOrder: null },
  });

  await prisma.articleSeries.delete({ where: { id } });

  return NextResponse.json({ message: 'تم حذف السلسلة' });
}
