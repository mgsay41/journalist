import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyEmailToken } from '@/lib/email';
import { auth } from '@/lib/auth';

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email and update user email if this is a change request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'رمز التحقق مفقود' },
        { status: 400 }
      );
    }

    // Verify the token
    const result = await verifyEmailToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Check if this is an email change (has userId)
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صالح' },
        { status: 400 }
      );
    }

    // If this is an email change with a userId, update the user's email
    if (verification.userId) {
      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: verification.email },
      });

      if (existingUser && existingUser.id !== verification.userId) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مستخدم بالفعل' },
          { status: 400 }
        );
      }

      // Update user's email
      await prisma.user.update({
        where: { id: verification.userId },
        data: { email: verification.email },
      });
    }

    return NextResponse.json({
      success: true,
      message: verification.userId
        ? 'تم تحديث بريدك الإلكتروني بنجاح'
        : 'تم التحقق من بريدك الإلكتروني بنجاح',
      email: result.email,
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من البريد الإلكتروني' },
      { status: 500 }
    );
  }
}
