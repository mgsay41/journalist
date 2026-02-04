import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Journalist CMS';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create email verification record
 */
export async function createEmailVerification(
  email: string,
  userId?: string,
  expiresInHours: number = 24
): Promise<string> {
  const token = generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Delete any existing unverified tokens for this email
  await prisma.emailVerification.deleteMany({
    where: {
      email,
      verifiedAt: null,
    },
  });

  // Create new verification record
  await prisma.emailVerification.create({
    data: {
      email,
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify email token
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!verification) {
    return { success: false, error: 'رمز التحقق غير صالح' };
  }

  if (verification.verifiedAt) {
    return { success: false, error: 'تم استخدام رمز التحقق هذا بالفعل' };
  }

  if (verification.expiresAt < new Date()) {
    return { success: false, error: 'رمز التحقق منتهي الصلاحية' };
  }

  // Mark as verified
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { verifiedAt: new Date() },
  });

  return { success: true, email: verification.email };
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  type: 'signup' | 'change' = 'signup'
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('Resend not configured: RESEND_API_KEY not set');
    return { success: false, error: 'خدمة البريد الإلكتروني غير متوفرة' };
  }

  const verificationUrl = `${BASE_URL}/auth/verify-email?token=${token}`;

  const subject = type === 'signup'
    ? 'تحقق من بريدك الإلكتروني'
    : 'تأكيد تغيير البريد الإلكتروني';

  const htmlContent = type === 'signup'
    ? getSignupVerificationTemplate(email, verificationUrl)
    : getEmailChangeTemplate(email, verificationUrl);

  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'فشل إرسال بريد التحقق' };
  }
}

/**
 * Send verification email and create token
 */
export async function sendEmailVerification(
  email: string,
  userId?: string,
  type: 'signup' | 'change' = 'signup'
): Promise<{ success: boolean; error?: string }> {
  const token = await createEmailVerification(email, userId);
  return sendVerificationEmail(email, token, type);
}

/**
 * Get signup verification email template (Arabic)
 */
function getSignupVerificationTemplate(email: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحقق من بريدك الإلكتروني</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>مرحباً بك!</h1>
    </div>
    <div class="content">
      <p>شكراً للتسجيل في موقعنا. نحتاج إلى التحقق من بريدك الإلكتروني لتفعيل حسابك.</p>
      <p><strong>البريد الإلكتروني:</strong> ${email}</p>
      <p>لإكمال عملية التسجيل، يرجى النقر على الزر أدناه للتحقق من بريدك الإلكتروني:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">التحقق من البريد الإلكتروني</a>
      </div>
      <p style="font-size: 14px; color: #666;">أو انسخ والصق الرابط التالي في متصفحك:</p>
      <p style="font-size: 12px; word-break: break-all; color: #666;">${verificationUrl}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">يصبح رمز التحقق غير صالح بعد 24 ساعة.</p>
    </div>
    <div class="footer">
      <p>إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني.</p>
      <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get email change verification template (Arabic)
 */
function getEmailChangeTemplate(email: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تأكيد تغيير البريد الإلكتروني</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>تغيير البريد الإلكتروني</h1>
    </div>
    <div class="content">
      <p>لقد طلبت تغيير عنوان البريد الإلكتروني لحسابك.</p>
      <p><strong>البريد الإلكتروني الجديد:</strong> ${email}</p>
      <div class="warning">
        <p><strong>ملاحظة مهمة:</strong> لم يتم تغيير بريدك الإلكتروني بعد. يجب عليك التحقق من البريد الجديد لإكمال عملية التغيير.</p>
      </div>
      <p>لإكمال عملية تغيير البريد الإلكتروني، يرجى النقر على الزر أدناه:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">تأكيد تغيير البريد الإلكتروني</a>
      </div>
      <p style="font-size: 14px; color: #666;">أو انسخ والصق الرابط التالي في متصفحك:</p>
      <p style="font-size: 12px; word-break: break-all; color: #666;">${verificationUrl}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">يصبح رمز التحقق غير صالح بعد 24 ساعة.</p>
    </div>
    <div class="footer">
      <p>إذا لم تطلب تغيير البريد الإلكتروني، يمكنك تجاهل هذا البريد الإلكتروني safely.</p>
      <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Check if Resend is configured
 */
export function isEmailConfigured(): boolean {
  return !!resend;
}
