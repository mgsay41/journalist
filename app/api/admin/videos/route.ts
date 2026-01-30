import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { createVideoSchema, bulkVideoSchema } from '@/lib/validations/video';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

/**
 * GET /api/admin/videos
 * List videos with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const articleId = searchParams.get('articleId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { youtubeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (articleId) {
      where.articleId = articleId;
    }

    // Get total count
    const total = await prisma.video.count({ where });

    // Build orderBy
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'position') {
      orderBy.position = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get videos with article info
    const videos = await prisma.video.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الفيديوهات' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/videos
 * Create a new video
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = createVideoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Extract YouTube ID and get thumbnail
    const youtubeId = extractYouTubeId(data.youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json(
        { error: 'رابط YouTube غير صالح' },
        { status: 400 }
      );
    }

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id: data.articleId },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    // Check if video already exists for this article
    const existingVideo = await prisma.video.findFirst({
      where: {
        youtubeId,
        articleId: data.articleId,
      },
    });

    if (existingVideo) {
      return NextResponse.json(
        { error: 'هذا الفيديو موجود بالفعل في المقال' },
        { status: 409 }
      );
    }

    // Get thumbnail
    const thumbnail = getYouTubeThumbnail(youtubeId, 'high');

    // Get the next position for videos in this article
    const maxPosition = await prisma.video.aggregate({
      where: { articleId: data.articleId },
      _max: { position: true },
    });
    const nextPosition = (maxPosition._max.position ?? -1) + 1;

    // Create video
    const video = await prisma.video.create({
      data: {
        youtubeUrl: data.youtubeUrl,
        youtubeId,
        title: data.title || null,
        thumbnail,
        privacyMode: data.privacyMode,
        autoplay: data.autoplay,
        startTime: data.startTime,
        position: data.position ?? nextPosition,
        articleId: data.articleId,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الفيديو' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/videos
 * Bulk delete videos
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = bulkVideoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { videoIds } = validation.data;

    // Delete videos
    const result = await prisma.video.deleteMany({
      where: {
        id: { in: videoIds },
      },
    });

    return NextResponse.json({
      message: `تم حذف ${result.count} فيديو بنجاح`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error deleting videos:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الفيديوهات' },
      { status: 500 }
    );
  }
}
