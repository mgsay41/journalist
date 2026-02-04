import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { uploadToCloudinary, generateImageUrls, validateImage } from '@/lib/cloudinary';
import { imageQuerySchema, imageDeleteSchema } from '@/lib/validations/image';
import { checkRateLimit, RateLimits } from '@/lib/security/rate-limit';
import { validateFileUpload, getClientIp } from '@/lib/security/middleware';

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

    // Rate limiting: 10 uploads per minute per user
    const rateLimitResult = await checkRateLimit(request, {
      limit: 10,
      window: 60, // 1 minute
      identifier: `upload:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      const resetAt = rateLimitResult?.resetAt || Date.now() + 60000;
      return NextResponse.json(
        {
          error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetAt).toISOString(),
            'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Get user's settings for upload limits and quality
    const userSettings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    const maxUploadSize = userSettings?.maxUploadSize
      ? userSettings.maxUploadSize * 1024 * 1024 // Convert MB to bytes
      : 10 * 1024 * 1024; // 10MB default
    const imageQuality = userSettings?.imageQuality;

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
      // Validate file type and size first (quick check)
      const validation = validateImage(file.type, file.size, maxUploadSize);
      if (!validation.valid) {
        errors.push({ filename: file.name, error: validation.error });
        continue;
      }

      // Comprehensive validation with magic number check
      const secureValidation = await validateFileUpload(file, {
        maxSize: maxUploadSize,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
      });

      if (!secureValidation.valid) {
        errors.push({ filename: file.name, error: secureValidation.error });
        continue;
      }

      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary with user's quality setting
        const uploadResult = await uploadToCloudinary(buffer, file.name, imageQuality);

        // Generate URLs for different sizes with user's quality setting
        const urls = generateImageUrls(uploadResult.public_id, imageQuality);

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

    const response = NextResponse.json({
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `تم رفع ${uploadedImages.length} صورة، فشل ${errors.length}`
        : `تم رفع ${uploadedImages.length} صورة بنجاح`,
    }, { status: 201 });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult!.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult!.resetAt).toISOString());

    return response;
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
