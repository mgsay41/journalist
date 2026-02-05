import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { SparklineChart, getTrendColor, getTrendFillColor } from '@/components/admin/SparklineChart';
import { getDashboardChartsData } from '@/lib/analytics/service';

interface DashboardStats {
  totalArticles: number;
  published: number;
  drafts: number;
  scheduled: number;
  totalImages: number;
  totalViews: number;
  viewsThisMonth: number;
  averageSeoScore: number;
  trends?: {
    viewsTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
    articlesTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
  };
  chartData?: {
    viewsChart: number[];
    articlesChart: number[];
  };
}

interface RecentArticle {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  author: { name: string };
}

async function getDashboardStats(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekDate = new Date(now);
  weekDate.setDate(weekDate.getDate() - weekDate.getDay());
  const startOfWeek = new Date(weekDate.setHours(0, 0, 0, 0));
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  // Previous period dates for trend calculation
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const previousWeekStart = new Date(startOfWeek);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(startOfWeek);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
  const previousDayStart = new Date(startOfDay);
  previousDayStart.setDate(previousDayStart.getDate() - 1);
  const previousDayEnd = new Date(startOfDay);
  previousDayEnd.setMilliseconds(previousDayEnd.getMilliseconds() - 1);

  // Get chart data for sparklines
  const chartData = await getDashboardChartsData(period, 7);

  // Determine date range based on period
  const getDateRange = () => {
    switch (period) {
      case 'today':
        return { gte: startOfDay };
      case 'week':
        return { gte: startOfWeek };
      case 'month':
        return { gte: startOfMonth };
      default:
        return {};
    }
  };

  const dateRange = getDateRange();

  const [totalArticles, published, drafts, scheduled, totalImages, avgSeoScore, totalViewsResult, publishedCountResult] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'published' } }),
    prisma.article.count({ where: { status: 'draft' } }),
    prisma.article.count({ where: { status: 'scheduled' } }),
    prisma.image.count(),
    prisma.seoAnalysis.aggregate({
      _avg: { score: true }
    }),
    prisma.article.aggregate({
      _sum: { views: true },
      where: { status: 'published', publishedAt: dateRange }
    }),
    // Published articles count in period
    prisma.article.count({
      where: { status: 'published', publishedAt: dateRange }
    }),
  ]);

  // Previous period data for trends
  const [prevViewsResult, prevPublishedCountResult] = await Promise.all([
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: 'published',
        publishedAt: period === 'month' ? { gte: previousMonthStart, lte: previousMonthEnd } :
                     period === 'week' ? { gte: previousWeekStart, lte: previousWeekEnd } :
                     period === 'today' ? { gte: previousDayStart, lte: previousDayEnd } :
                     undefined
      },
    }),
    prisma.article.count({
      where: {
        status: 'published',
        publishedAt: period === 'month' ? { gte: previousMonthStart, lte: previousMonthEnd } :
                     period === 'week' ? { gte: previousWeekStart, lte: previousWeekEnd } :
                     period === 'today' ? { gte: previousDayStart, lte: previousDayEnd } :
                     undefined
      },
    }),
  ]);

  const currentViews = totalViewsResult._sum.views || 0;
  const currentArticles = publishedCountResult;
  const prevViews = prevViewsResult._sum.views || 0;
  const prevArticles = prevPublishedCountResult;

  // Calculate trends
  const calculateTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
    const change = ((current - previous) / previous) * 100;
    const direction: 'up' | 'down' | 'neutral' = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    return { value: Math.abs(Math.round(change)), direction };
  };

  return {
    totalArticles,
    published,
    drafts,
    scheduled,
    totalImages,
    totalViews: currentViews,
    viewsThisMonth: totalViewsResult._sum.views || 0,
    averageSeoScore: Math.round(avgSeoScore._avg.score || 0),
    trends: {
      viewsTrend: calculateTrend(currentViews, prevViews),
      articlesTrend: calculateTrend(currentArticles, prevArticles),
    },
    chartData,
  };
}

async function getRecentArticles(): Promise<RecentArticle[]> {
  return prisma.article.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
}

async function getScheduledArticles(): Promise<RecentArticle[]> {
  return prisma.article.findMany({
    where: { status: 'scheduled' },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  });
}

/**
 * Admin Dashboard Page
 *
 * Protected route - requires authentication
 * Displays statistics, quick actions, and recent activity
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = (params.period as 'today' | 'week' | 'month' | 'all') || 'all';

  const [stats, recentArticles, scheduledArticles] = await Promise.all([
    getDashboardStats(period),
    getRecentArticles(),
    getScheduledArticles(),
  ]);

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

      {/* Stats Cards with Period Selector */}
      <div className="space-y-4">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">إحصائيات عامة</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-secondary">الفترة الزمنية:</label>
            <div className="flex gap-1">
              <Link
                href="/admin/dashboard?period=today"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === 'today'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                اليوم
              </Link>
              <Link
                href="/admin/dashboard?period=week"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === 'week'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                هذا الأسبوع
              </Link>
              <Link
                href="/admin/dashboard?period=month"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === 'month'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                هذا الشهر
              </Link>
              <Link
                href="/admin/dashboard?period=all"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                كل الوقت
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={period === 'all' ? 'إجمالي المقالات' : 'المقالات المنشورة'}
            value={period === 'all' ? stats.totalArticles : stats.published}
            icon="total"
            color="primary"
            trend={stats.trends?.articlesTrend}
            chartData={stats.chartData?.articlesChart}
            chartType="articles"
          />
          <StatsCard
            title={period === 'all' ? 'المنشورة' : 'المشاهدات'}
            value={period === 'all' ? stats.published : stats.totalViews}
            icon="published"
            color="success"
            trend={period === 'all' ? undefined : stats.trends?.viewsTrend}
            chartData={period === 'all' ? undefined : stats.chartData?.viewsChart}
            chartType="views"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title={period === 'all' ? 'إجمالي المشاهدات' : 'المشاهدات'}
            value={stats.totalViews}
            icon="views"
            color="primary"
            trend={stats.trends?.viewsTrend}
            chartData={stats.chartData?.viewsChart}
            chartType="views"
          />
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
          {recentArticles.length === 0 ? (
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
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-foreground">{article.title}</h4>
                    <p className="text-sm text-secondary">
                      {article.author.name} • {new Date(article.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    article.status === 'published' ? 'bg-success/10 text-success' :
                    article.status === 'draft' ? 'bg-warning/10 text-warning' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {article.status === 'published' ? 'منشور' :
                     article.status === 'draft' ? 'مسودة' : 'مجدول'}
                  </span>
                </Link>
              ))}
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
          {scheduledArticles.length === 0 ? (
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
              {scheduledArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-foreground">{article.title}</h4>
                    <p className="text-sm text-secondary">
                      {article.author.name} • {new Date(article.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600">
                    مجدول
                  </span>
                </Link>
              ))}
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
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  chartData?: number[];
  chartType?: 'views' | 'articles';
}

function StatsCard({ title, value, icon, color, suffix, trend, chartData, chartType }: StatsCardProps) {
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
    views: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    seo: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  };

  // Determine chart color based on trend and card color
  const chartColor = trend
    ? getTrendFillColor(trend.direction, color !== 'warning')
    : colorClasses[color].includes('primary')
      ? '#3b82f6'
      : colorClasses[color].includes('success')
        ? '#10b981'
        : colorClasses[color].includes('warning')
          ? '#f59e0b'
          : '#3b82f6';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Header with icon */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-secondary mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${colorClasses[color]}`}>
                  {value}
                </span>
                {suffix && (
                  <span className="text-sm text-secondary">{suffix}</span>
                )}
                {trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(trend.direction, color !== 'warning')}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {trend.direction === 'up' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      )}
                      {trend.direction === 'down' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      )}
                      {trend.direction === 'neutral' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      )}
                    </svg>
                    {trend.value > 0 && `${trend.value}%`}
                  </div>
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

          {/* Mini chart */}
          {chartData && chartData.length > 0 && (
            <div className="h-8">
              <SparklineChart
                data={chartData}
                width={240}
                height={32}
                strokeWidth={2}
                color={chartColor}
                showFill={true}
                showDots={false}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
