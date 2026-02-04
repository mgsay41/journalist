import { redirect } from 'next/navigation';
import { verifyEmailToken } from '@/lib/email';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">رمز التحقق مفقود</h1>
          <p className="text-zinc-600 mb-6">لم يتم العثور على رمز التحقق في الرابط.</p>
          <a
            href="/admin/login"
            className="inline-block px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            العودة إلى تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  // Verify the token
  const result = await verifyEmailToken(token);

  // If verification failed, show error
  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">فشل التحقق</h1>
          <p className="text-zinc-600 mb-6">{result.error}</p>
          <a
            href="/admin/login"
            className="inline-block px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            العودة إلى تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  // Verification successful - show success message and redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">تم التحقق بنجاح!</h1>
        <p className="text-zinc-600 mb-2">بريدك الإلكتروني <strong>{result.email}</strong> تم التحقق منه بنجاح.</p>
        <p className="text-zinc-500 text-sm mb-6">جاري تحويلك إلى لوحة التحكم...</p>
        <a
          href="/admin/dashboard"
          className="inline-block px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          الذهاب إلى لوحة التحكم
        </a>

        {/* Auto-redirect script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(() => {
                window.location.href = '/admin/dashboard';
              }, 2000);
            `,
          }}
        />
      </div>
    </div>
  );
}
