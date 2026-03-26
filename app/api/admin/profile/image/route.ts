import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * POST /api/admin/profile/image
 * Upload a profile avatar image to Cloudinary and return the URL.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Rate limit: 10 uploads per minute
    const rateLimitResult = await checkRateLimit(request, {
      limit: 10,
      window: 60,
      identifier: `profile:image:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'لم يتم رفع أي صورة' }, { status: 400 });
    }

    const mimeType = file.type;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. الأنواع المسموح بها: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'حجم الصورة يتجاوز الحد الأقصى (5 ميجابايت)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = (file instanceof File ? file.name : null) || `avatar-${session.user.id}`;

    const result = await uploadToCloudinary(buffer, filename, 85);

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفع الصورة' },
      { status: 500 }
    );
  }
}
