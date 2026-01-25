import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

/**
 * Admin Dashboard Page
 *
 * Protected route - requires authentication
 * Displays statistics, quick actions, and recent activity
 */
export default async function DashboardPage() {
  // TODO: Fetch real data from database
  // const stats = await getDashboardStats();
  // const recentArticles = await getRecentArticles();

  const stats = {
    totalArticles: 0,
    published: 0,
    drafts: 0,
    scheduled: 0,
    totalImages: 0,
    averageSeoScore: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          لوحة التحكم
        </h1>
        <p className="text-secondary">
          مرحباً بك في نظام إدارة المحتوى للصحفيين
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي المقالات"
          value={stats.totalArticles}
          icon="total"
          color="primary"
        />
        <StatsCard
          title="المنشورة"
          value={stats.published}
          icon="published"
          color="success"
        />
        <StatsCard
          title="المسودات"
          value={stats.drafts}
          icon="draft"
          color="warning"
        />
        <StatsCard
          title="مجدولة"
          value={stats.scheduled}
          icon="scheduled"
          color="info"
        />
      </div>

      {/* Second row of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="إجمالي الصور"
          value={stats.totalImages}
          icon="images"
          color="primary"
        />
        <StatsCard
          title="معدل SEO"
          value={stats.averageSeoScore}
          icon="seo"
          color="success"
          suffix="/ 100"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/admin/articles/new">
              <Button fullWidth variant="primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إنشاء مقال جديد
              </Button>
            </Link>
            <Link href="/admin/media/images">
              <Button fullWidth variant="secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                إدارة الصور
              </Button>
            </Link>
            <Link href="/admin/categories">
              <Button fullWidth variant="secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                إدارة التصنيفات
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Articles */}
      <Card>
        <CardHeader>
          <CardTitle>المقالات الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.totalArticles === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12">
              <svg
                className="w-16 h-16 text-secondary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                لا توجد مقالات
              </h3>
              <p className="text-secondary text-sm max-w-sm mb-6 leading-relaxed">
                ابدأ بإنشاء أول مقال لك. يمكنك كتابة المحتوى، إضافة الوسائط، ونشره للقراء.
              </p>
              <Link href="/admin/articles/new">
                <Button variant="primary">
                  إنشاء مقال جديد
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* TODO: Render recent articles list */}
              <p className="text-secondary text-center py-4">
                لا توجد مقالات حديثة
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Posts */}
      <Card>
        <CardHeader>
          <CardTitle>المقالات المجدولة</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.scheduled === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto text-secondary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-secondary">لا توجد مقالات مجدولة</p>
              <p className="text-sm text-secondary mt-1">
                جدولة النشر للمقالات تظهر هنا
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* TODO: Render scheduled articles */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'info';
  suffix?: string;
}

function StatsCard({ title, value, icon, color, suffix }: StatsCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-blue-600',
  };

  const bgClasses = {
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    info: 'bg-blue-50',
  };

  const icons = {
    total: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    published: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    draft: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    scheduled: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    images: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    seo: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${colorClasses[color]}`}>
                {value}
              </span>
              {suffix && (
                <span className="text-sm text-secondary">{suffix}</span>
              )}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-lg ${bgClasses[color]} flex items-center justify-center`}>
            <svg
              className={`w-6 h-6 ${colorClasses[color]}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={icons[icon as keyof typeof icons] || icons.total}
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
