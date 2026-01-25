import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default function HomePage() {
  const buttonStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-base";

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section - Minimal */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 text-foreground tracking-tight">
              نظام إدارة المحتوى للصحفيين
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl mx-auto">
              منصة عربية متكاملة لإدارة المقالات والمحتوى مع دعم كامل للتحسين من محركات البحث
              والمساعد الذكي باستخدام الذكاء الاصطناعي
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/admin/login"
                className={`${buttonStyles} bg-foreground text-background hover:bg-foreground/90`}
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/about"
                className={`${buttonStyles} border border-border bg-background hover:bg-muted`}
              >
                عن النظام
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Minimal */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-16 tracking-tight">
            المميزات الرئيسية
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <CardTitle>إدارة المقالات</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  محرر نصوص غني داعم للغة العربية مع إمكانيات متقدمة للتنسيق والإدراج
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>تحسين محركات البحث</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  تحليل شامل لمحتواك مع اقتراحات ذكية لتحسين ظهورك في محركات البحث
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle>مساعد ذكي</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  استفد من الذكاء الاصطناعي لإنشاء محتوى أفضل وتوفير الوقت في الكتابة
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle>إدارة الوسائط</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ألبوم صور متكامل مع دعم الفيديو ومعاينة فورية للمحتوى
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>الجدولة والنشر</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  خطط محتواك مسبقاً وانشر مقالاتك في الأوقات المثالية للوصول
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="border border-border-subtle hover:border-border transition-colors">
              <CardHeader>
                <div className="w-10 h-10 border border-border rounded-md flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle>الإحصائيات والتحليلات</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  تابع أداء مقالاتك واحصل على رؤى قيمة لتحسين محتواك
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Minimal */}
      <section className="py-20 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight">
            جاهز للبدء؟
          </h2>
          <p className="text-muted-foreground mb-10 text-lg max-w-md mx-auto">
            سجل دخولك الآن وابدأ في إنشاء محتوى عربي مميز
          </p>
          <Link
            href="/admin/login"
            className={`${buttonStyles} bg-foreground text-background hover:bg-foreground/90`}
          >
            تسجيل الدخول
          </Link>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} نظام إدارة المحتوى للصحفيين. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </main>
  );
}
