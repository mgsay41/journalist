import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }),
  name: z.string().max(100).optional(),
});

/**
 * POST /api/public/newsletter
 * Subscribe to the newsletter
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 subscriptions per hour per IP
  const rateLimit = await checkRateLimit(request, { limit: 5, window: 3600, identifier: 'newsletter:subscribe' });
  if (rateLimit && !rateLimit.success) {
    return NextResponse.json({ error: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, name } = parsed.data;

  // Upsert: resubscribe if previously unsubscribed
  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing) {
    if (existing.active) {
      return NextResponse.json({ message: 'أنت مشترك بالفعل في النشرة البريدية.' });
    }
    // Reactivate
    await prisma.subscriber.update({
      where: { email },
      data: { active: true, unsubscribedAt: null, subscribedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: 'تم تجديد اشتراكك في النشرة البريدية.' });
  }

  await prisma.subscriber.create({
    data: { email, name: name || null, active: true },
  });

  return NextResponse.json({ success: true, message: 'تم الاشتراك بنجاح! شكراً لك.' });
}
