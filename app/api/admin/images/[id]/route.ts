import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { imageUpdateSchema } from '@/lib/validations/image';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single image by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        articles: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        featuredInArticles: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'فشل في جلب الصورة' },
      { status: 500 }
    );
  }
}

// PUT - Update image metadata
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = imageUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'البيانات غير صالحة', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Check if image exists
    const existingImage = await prisma.image.findUnique({
      where: { id },
    });

    if (!existingImage) {
      return NextResponse.json(
        { error: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    // Update image
    const updatedImage = await prisma.image.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { error: 'فشل في تحديث الصورة' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    // Check if image exists and get usage info
    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
            featuredInArticles: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    // Check if image is in use
    const isInUse = image._count.articles > 0 || image._count.featuredInArticles > 0;

    // Check for force delete parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (isInUse && !force) {
      return NextResponse.json(
        {
          error: 'الصورة مستخدمة في مقالات',
          usedInArticles: image._count.articles,
          featuredIn: image._count.featuredInArticles,
          hint: 'أضف ?force=true لحذف الصورة بالقوة',
        },
        { status: 400 }
      );
    }

    // Delete from Cloudinary if has public ID
    if (image.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(image.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await prisma.image.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'تم حذف الصورة بنجاح',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'فشل في حذف الصورة' },
      { status: 500 }
    );
  }
}
