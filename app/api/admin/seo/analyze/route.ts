import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { analyzeArticle, ArticleContent } from '@/lib/seo';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for SEO analysis request
const analyzeSchema = z.object({
  title: z.string().min(1, { message: 'العنوان مطلوب' }),
  content: z.string(),
  excerpt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
  slug: z.string().optional(),
  hasFeaturedImage: z.boolean().default(false),
  imageCount: z.number().default(0),
  imagesWithAlt: z.number().default(0),
  articleId: z.string().optional(), // If provided, save analysis to DB
});

// POST - Analyze article content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = analyzeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Prepare article content for analysis
    const articleContent: ArticleContent = {
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      focusKeyword: data.focusKeyword,
      slug: data.slug,
      hasFeaturedImage: data.hasFeaturedImage,
      imageCount: data.imageCount,
      imagesWithAlt: data.imagesWithAlt,
    };

    // Run SEO analysis
    const analysis = analyzeArticle(articleContent);

    // If articleId provided, save/update analysis in database
    if (data.articleId) {
      // Verify article exists and belongs to user
      const article = await prisma.article.findFirst({
        where: {
          id: data.articleId,
          authorId: session.user.id,
        },
      });

      if (!article) {
        return NextResponse.json(
          { error: 'المقال غير موجود' },
          { status: 404 }
        );
      }

      // Update article SEO score
      await prisma.article.update({
        where: { id: data.articleId },
        data: { seoScore: analysis.percentage },
      });

      // Prepare JSON data for Prisma
      const suggestionsJson = JSON.parse(JSON.stringify(analysis.suggestions));
      const criteriaJson = JSON.parse(JSON.stringify(
        analysis.criteria.map(c => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          status: c.status,
          score: c.score,
          maxScore: c.maxScore,
          value: c.value,
        }))
      ));

      // Upsert SEO analysis
      await prisma.seoAnalysis.upsert({
        where: { articleId: data.articleId },
        update: {
          score: analysis.percentage,
          suggestions: suggestionsJson,
          criteria: criteriaJson,
          analyzedAt: new Date(),
        },
        create: {
          articleId: data.articleId,
          score: analysis.percentage,
          suggestions: suggestionsJson,
          criteria: criteriaJson,
        },
      });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        score: analysis.score,
        maxScore: analysis.maxScore,
        percentage: analysis.percentage,
        status: analysis.status,
        categories: analysis.categories,
        criteria: analysis.criteria,
        suggestions: analysis.suggestions,
        analyzedAt: analysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error('SEO analysis error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحليل SEO' },
      { status: 500 }
    );
  }
}

// GET - Get saved SEO analysis for an article
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'معرف المقال مطلوب' },
        { status: 400 }
      );
    }

    // Get saved SEO analysis
    const seoAnalysis = await prisma.seoAnalysis.findUnique({
      where: { articleId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            seoScore: true,
            authorId: true,
          },
        },
      },
    });

    if (!seoAnalysis) {
      return NextResponse.json(
        { error: 'لم يتم العثور على تحليل SEO لهذا المقال' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (seoAnalysis.article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: {
        score: seoAnalysis.score,
        suggestions: seoAnalysis.suggestions,
        criteria: seoAnalysis.criteria,
        analyzedAt: seoAnalysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error('Get SEO analysis error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب تحليل SEO' },
      { status: 500 }
    );
  }
}
