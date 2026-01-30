import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { updateVideoSchema } from '@/lib/validations/video';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/videos/[id]
 * Get a single video by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
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
    });

    if (!video) {
      return NextResponse.json(
        { error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الفيديو' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/videos/[id]
 * Update a video
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = updateVideoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if video exists
    const existingVideo = await prisma.video.findUnique({
      where: { id },
    });

    if (!existingVideo) {
      return NextResponse.json(
        { error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // Update video
    const video = await prisma.video.update({
      where: { id },
      data: validation.data,
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
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الفيديو' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/videos/[id]
 * Delete a single video
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if video exists
    const existingVideo = await prisma.video.findUnique({
      where: { id },
    });

    if (!existingVideo) {
      return NextResponse.json(
        { error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // Delete video
    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'تم حذف الفيديو بنجاح',
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الفيديو' },
      { status: 500 }
    );
  }
}
