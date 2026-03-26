import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Invalid slug format');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug format before hitting the database
    const slugValidation = slugSchema.safeParse(slug);
    if (!slugValidation.success) {
      return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 });
    }

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        featuredImage: {
          select: {
            id: true,
            url: true,
            altText: true,
            caption: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            caption: true,
          },
        },
        videos: {
          select: {
            id: true,
            youtubeId: true,
            title: true,
            privacyMode: true,
            startTime: true,
          },
        },
        seoAnalysis: {
          select: {
            score: true,
            criteria: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    // Check if article is published
    if (article.status !== 'published' || !article.publishedAt || article.publishedAt > new Date()) {
      return NextResponse.json(
        { error: 'المقال غير متاح' },
        { status: 403 }
      );
    }

    // Format response
    const formattedArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      featuredImage: article.featuredImage,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      readingTime: article.readingTime,
      author: article.author,
      categories: article.categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
      tags: article.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      images: article.images,
      videos: article.videos,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      focusKeyword: article.focusKeyword,
      seoAnalysis: article.seoAnalysis,
    };

    return NextResponse.json(formattedArticle, {
      // Published articles are immutable — cache at CDN for 1 hour, serve stale for 24 h while revalidating
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المقال' },
      { status: 500 }
    );
  }
}
