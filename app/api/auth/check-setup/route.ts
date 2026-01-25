import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/check-setup
 *
 * Check if the system has been set up (has an admin user)
 * Used to determine whether to show first-time setup or login page
 */
export async function GET() {
  try {
    // Check if any users exist in the database
    const userCount = await prisma.user.count();

    return NextResponse.json({
      hasAdmin: userCount > 0,
    });
  } catch (error) {
    console.error('Check setup error:', error);
    return NextResponse.json(
      { error: 'فشل في التحقق من حالة الإعداد' },
      { status: 500 }
    );
  }
}
