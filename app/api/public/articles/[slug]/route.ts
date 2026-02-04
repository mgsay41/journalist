import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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
        videos: true,
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
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if article is published
    if (article.status !== 'published' || !article.publishedAt || article.publishedAt > new Date()) {
      return NextResponse.json(
        { error: 'Article not available' },
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

    return NextResponse.json(formattedArticle);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
