import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { updateSettingsSchema } from '@/lib/validations/settings';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * GET /api/admin/settings
 * Get user settings (creates default if not exists)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Get or create settings for the user
    let settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    // If settings don't exist, create default settings
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: session.user.id,
          siteName: 'موقعي',
          timezone: 'Asia/Riyadh',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24',
          maxUploadSize: 10,
          imageQuality: 85,
          storageProvider: 'cloudinary',
          defaultArticleStatus: 'draft',
          autoPublishEnabled: false,
          notifyOnPublish: true,
          aiModelPreference: 'gemini-3-flash',
          aiResponseLimit: 4096,
          aiFeaturesEnabled: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الإعدادات' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update user settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Rate limiting: 30 settings updates per minute
    const rateLimitResult = await checkRateLimit(request, {
      limit: 30,
      window: 60,
      identifier: `settings:update:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Get or create settings
    let settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      // Create settings if not exists
      settings = await prisma.settings.create({
        data: {
          userId: session.user.id,
          ...validation.data,
        },
      });
    } else {
      // Update existing settings
      settings = await prisma.settings.update({
        where: { userId: session.user.id },
        data: validation.data,
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الإعدادات' },
      { status: 500 }
    );
  }
}
