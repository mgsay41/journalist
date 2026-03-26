import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/articles/[id]/revisions
 * Get all revisions for an article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get revisions with author info
    const revisions = await prisma.articleRevision.findMany({
      where: { articleId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 revisions
    });

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Error fetching article revisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revisions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/articles/[id]/revisions
 * Create a new revision (snapshot of current article state)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { changeNote, isAutoSave = false } = body;

    // Get current article state
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        authorId: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if user owns the article
    if (article.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create revision
    const revision = await prisma.articleRevision.create({
      data: {
        articleId: id,
        authorId: session.user.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        changeNote,
        isAutoSave,
      },
    });

    // Clean up old auto-save revisions (keep only last 10)
    if (isAutoSave) {
      const autoSaveRevisions = await prisma.articleRevision.findMany({
        where: {
          articleId: id,
          isAutoSave: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        select: { id: true },
      });

      if (autoSaveRevisions.length > 0) {
        await prisma.articleRevision.deleteMany({
          where: {
            id: { in: autoSaveRevisions.map(r => r.id) },
          },
        });
      }
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error('Error creating article revision:', error);
    return NextResponse.json(
      { error: 'Failed to create revision' },
      { status: 500 }
    );
  }
}
