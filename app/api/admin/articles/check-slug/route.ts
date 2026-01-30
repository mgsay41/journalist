import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/admin/articles/check-slug
 * Check if a slug is available
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const excludeId = searchParams.get('excludeId'); // For edit mode - exclude current article

    if (!slug) {
      return NextResponse.json(
        { error: 'الرابط مطلوب' },
        { status: 400 }
      );
    }

    // Check if slug exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    // If excludeId is provided and matches, the slug is available (editing same article)
    const available = !existingArticle || (excludeId && existingArticle.id === excludeId);

    return NextResponse.json({ available, slug });
  } catch (error) {
    console.error('Error checking slug:', error);
    return NextResponse.json(
      { error: 'خطأ في التحقق من الرابط' },
      { status: 500 }
    );
  }
}
