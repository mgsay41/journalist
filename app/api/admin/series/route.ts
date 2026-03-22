import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';
import { generateSlug } from '@/lib/utils/slug';

const createSeriesSchema = z.object({
  title: z.string().min(1, { message: 'العنوان مطلوب' }).max(200),
  description: z.string().max(1000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
});

/**
 * GET /api/admin/series - List all series
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const series = await prisma.articleSeries.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { articles: true } },
    },
  });

  return NextResponse.json({ series });
}

/**
 * POST /api/admin/series - Create a series
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await request.json();
  const parsed = createSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, coverImage } = parsed.data;
  let slug = generateSlug(title);

  // Ensure slug uniqueness
  const existing = await prisma.articleSeries.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const series = await prisma.articleSeries.create({
    data: { title, slug, description, coverImage },
  });

  return NextResponse.json({ series }, { status: 201 });
}
