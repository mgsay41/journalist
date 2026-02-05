import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/articles/[id]/revisions/[revisionId]/restore
 * Restore an article to a specific revision
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, revisionId } = await params;

    // Get the article
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        title: true,
        content: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if user owns the article
    if (article.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the revision
    const revision = await prisma.articleRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Check if revision belongs to this article
    if (revision.articleId !== id) {
      return NextResponse.json(
        { error: 'Revision does not belong to this article' },
        { status: 400 }
      );
    }

    // Create a backup revision of current state before restoring
    await prisma.articleRevision.create({
      data: {
        articleId: id,
        authorId: session.user.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        changeNote: 'Backup before restoring revision',
        isAutoSave: false,
      },
    });

    // Restore the article to the revision state
    const restoredArticle = await prisma.article.update({
      where: { id },
      data: {
        title: revision.title,
        content: revision.content,
        excerpt: revision.excerpt,
        metaTitle: revision.metaTitle,
        metaDescription: revision.metaDescription,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      article: restoredArticle,
      restoredFrom: revision,
    });
  } catch (error) {
    console.error('Error restoring article revision:', error);
    return NextResponse.json(
      { error: 'Failed to restore revision' },
      { status: 500 }
    );
  }
}
