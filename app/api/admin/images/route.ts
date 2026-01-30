import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { uploadToCloudinary, generateImageUrls, validateImage } from '@/lib/cloudinary';
import { imageQuerySchema, imageDeleteSchema } from '@/lib/validations/image';

// GET - List images with pagination, filtering, and sorting
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = imageQuerySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'uploadedAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      unused: searchParams.get('unused') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'معلمات البحث غير صالحة', details: queryResult.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, sortBy, sortOrder, unused } = queryResult.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { altText: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter for unused images (not in any article and not featured)
    if (unused === true) {
      where.AND = [
        { articles: { none: {} } },
        { featuredInArticles: { none: {} } },
      ];
    }

    // Get images with pagination
    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              articles: true,
              featuredInArticles: true,
            },
          },
        },
      }),
      prisma.image.count({ where }),
    ]);

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'فشل في جلب الصور' },
      { status: 500 }
    );
  }
}

// POST - Upload new image(s)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم تحديد أي ملفات' },
        { status: 400 }
      );
    }

    const uploadedImages = [];
    const errors = [];

    for (const file of files) {
      // Validate file
      const validation = validateImage(file.type, file.size);
      if (!validation.valid) {
        errors.push({ filename: file.name, error: validation.error });
        continue;
      }

      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(buffer, file.name);

        // Generate URLs for different sizes
        const urls = generateImageUrls(uploadResult.public_id);

        // Save to database
        const image = await prisma.image.create({
          data: {
            url: urls.original,
            thumbnailUrl: urls.thumbnail,
            mediumUrl: urls.medium,
            largeUrl: urls.large,
            cloudinaryPublicId: uploadResult.public_id,
            filename: file.name,
            fileSize: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
            mimeType: file.type,
          },
        });

        uploadedImages.push(image);
      } catch (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
        errors.push({
          filename: file.name,
          error: 'فشل في رفع الصورة'
        });
      }
    }

    // Return results
    if (uploadedImages.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'فشل في رفع جميع الصور', errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `تم رفع ${uploadedImages.length} صورة، فشل ${errors.length}`
        : `تم رفع ${uploadedImages.length} صورة بنجاح`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'فشل في رفع الصور' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete images
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = imageDeleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'البيانات غير صالحة', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { ids } = validation.data;

    // Get images with their Cloudinary public IDs
    const images = await prisma.image.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        cloudinaryPublicId: true,
        _count: {
          select: {
            articles: true,
            featuredInArticles: true,
          },
        },
      },
    });

    // Check if any image is in use
    const inUseImages = images.filter(
      img => img._count.articles > 0 || img._count.featuredInArticles > 0
    );

    if (inUseImages.length > 0) {
      return NextResponse.json(
        {
          error: 'بعض الصور مستخدمة في مقالات ولا يمكن حذفها',
          inUseCount: inUseImages.length,
        },
        { status: 400 }
      );
    }

    // Delete from Cloudinary (in parallel)
    const { deleteFromCloudinary } = await import('@/lib/cloudinary');
    const deletePromises = images
      .filter(img => img.cloudinaryPublicId)
      .map(img => deleteFromCloudinary(img.cloudinaryPublicId!).catch(err => {
        console.error(`Failed to delete ${img.cloudinaryPublicId} from Cloudinary:`, err);
        return null;
      }));

    await Promise.all(deletePromises);

    // Delete from database
    await prisma.image.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      message: `تم حذف ${ids.length} صورة بنجاح`,
      deletedCount: ids.length,
    });
  } catch (error) {
    console.error('Error deleting images:', error);
    return NextResponse.json(
      { error: 'فشل في حذف الصور' },
      { status: 500 }
    );
  }
}
