import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { profileSettingsSchema, passwordChangeSchema } from '@/lib/validations/settings';
import bcrypt from 'bcryptjs';
import { sendEmailVerification } from '@/lib/email';
import { isEmailConfigured } from '@/lib/email';

/**
 * GET /api/admin/profile
 * Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الملف الشخصي' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/profile
 * Update user profile (name, email, image)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, image } = validation.data;

    // Check if email is being changed and if it's already taken
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (existingUser?.email !== email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مستخدم بالفعل' },
          { status: 400 }
        );
      }

      // Check if email service is configured
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: 'خدمة البريد الإلكتروني غير متوفرة. يرجى التواصل مع الدعم الفني.' },
          { status: 503 }
        );
      }

      // Send verification email to the new address
      const result = await sendEmailVerification(email, session.user.id, 'change');

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'فشل إرسال بريد التحقق' },
          { status: 500 }
        );
      }

      // Return pending verification status
      return NextResponse.json({
        message: 'تم إرسال بريد التحقق إلى عنوان البريد الجديد. يرجى التحقق لإكمال تغيير البريد الإلكتروني.',
        requiresVerification: true,
        pendingEmail: email,
      });
    }

    // Update user profile (name and image only, email changed separately after verification)
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الملف الشخصي' },
      { status: 500 }
    );
  }
}
