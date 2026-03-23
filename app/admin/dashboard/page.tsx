import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArticleStatusBadge } from '@/components/ui/Badge';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { SparklineChart } from '@/components/admin/SparklineChart';
import { getTrendFillColor } from '@/lib/utils/trend-colors';
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

  const periodLabels: Record<string, string> = {
    today: 'اليوم',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    all: 'كل الوقت',
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Welcome Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border px-6 py-8 md:px-8">
        <div className="absolute inset-0 bg-linear-to-l from-accent/8 to-transparent pointer-events-none" />
        <div className="absolute -bottom-12 -start-12 w-48 h-48 rounded-full bg-accent/5 pointer-events-none" />
        <div className="absolute top-4 start-32 w-24 h-24 rounded-full bg-accent/3 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1 h-6 rounded-full bg-accent shrink-0" />
              <p className="text-sm text-muted-foreground font-medium">
                {new Intl.DateTimeFormat('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
              </p>
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">لوحة التحكم</h1>
          </div>
          <Link href="/admin/articles/new">
            <Button variant="primary" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              مقال جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stats Cards with Period Selector ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 rounded-full bg-accent" />
            <h2 className="text-base font-bold text-foreground">إحصائيات عامة</h2>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground hidden sm:block">الفترة الزمنية:</span>
            <div className="flex gap-0.5 bg-muted rounded-xl p-1">
              {(['today', 'week', 'month', 'all'] as const).map((p) => (
                <Link
                  key={p}
                  href={`/admin/dashboard?period=${p}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                    period === p
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {periodLabels[p]}
                </Link>
              ))}
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

      {/* ─── Quick Actions ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 rounded-full bg-accent" />
            <CardTitle>إجراءات سريعة</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                href: '/admin/articles/new',
                label: 'إنشاء مقال جديد',
                description: 'اكتب وانشر محتوى جديداً',
                iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
              },
              {
                href: '/admin/media/images',
                label: 'إدارة الصور',
                description: 'رفع وتنظيم مكتبة الوسائط',
                iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
              },
              {
                href: '/admin/categories',
                label: 'إدارة التصنيفات',
                description: 'تنظيم وتصنيف المحتوى',
                iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group relative flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-muted/60 transition-all duration-200 no-underline overflow-hidden"
              >
                <span
                  className="absolute inset-x-0 top-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right rounded-full"
                  aria-hidden="true"
                />
                <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors duration-200">
                  <svg
                    className="w-5 h-5 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{action.description}</p>
                </div>
                <svg
                  className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent/60 rotate-180 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Recent Articles ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-5 rounded-full bg-accent" />
              <CardTitle>المقالات الأخيرة</CardTitle>
            </div>
            <Link href="/admin/articles" className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">
              عرض الكل ←
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">لا توجد مقالات</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed">
                ابدأ بإنشاء أول مقال لك. يمكنك كتابة المحتوى، إضافة الوسائط، ونشره للقراء.
              </p>
              <Link href="/admin/articles/new">
                <Button variant="primary">إنشاء مقال جديد</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-xl hover:bg-muted/60 transition-all duration-150"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      article.status === 'published' ? 'bg-success' :
                      article.status === 'draft' ? 'bg-warning' :
                      article.status === 'scheduled' ? 'bg-accent' : 'bg-muted-foreground'
                    }`} />
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground text-sm leading-tight group-hover:text-accent transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {article.author.name} • {new Date(article.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <ArticleStatusBadge status={article.status as 'draft' | 'published' | 'scheduled' | 'archived'} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Scheduled Articles ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 rounded-full bg-accent" />
            <CardTitle>المقالات المجدولة</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {scheduledArticles.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">لا توجد مقالات مجدولة</p>
              <p className="text-xs text-muted-foreground">جدولة النشر للمقالات تظهر هنا</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {scheduledArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-xl hover:bg-muted/60 transition-all duration-150"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-accent" />
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground text-sm leading-tight group-hover:text-accent transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {article.author.name} • {new Date(article.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <ArticleStatusBadge status="scheduled" />
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

function StatsCard({ title, value, icon, color, suffix, trend, chartData }: StatsCardProps) {
  const configs = {
    primary: { bar: 'bg-accent',      iconBg: 'bg-accent/10',   iconColor: 'text-accent',   valueColor: 'text-foreground' },
    success: { bar: 'bg-success',     iconBg: 'bg-success/10',  iconColor: 'text-success',  valueColor: 'text-success'    },
    warning: { bar: 'bg-warning',     iconBg: 'bg-warning/10',  iconColor: 'text-warning',  valueColor: 'text-warning'    },
    info:    { bar: 'bg-accent/70',   iconBg: 'bg-accent/8',    iconColor: 'text-accent',   valueColor: 'text-accent'     },
  };

  const cfg = configs[color];

  const icons = {
    total:     'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    published: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    draft:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    scheduled: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    images:    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    views:     'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    seo:       'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  };

  const chartColor = trend
    ? getTrendFillColor(trend.direction, color !== 'warning')
    : '#C8892A';

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Colored accent bar on the inline-start edge (right in RTL) */}
      <div className={`absolute inset-y-0 start-0 w-1 ${cfg.bar}`} />

      <div className="p-5 ps-6 space-y-3">
        {/* Label + icon roundel */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none pt-0.5">
            {title}
          </p>
          <div className={`shrink-0 w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
            <svg className={`w-4 h-4 ${cfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icons[icon as keyof typeof icons] || icons.total} />
            </svg>
          </div>
        </div>

        {/* Large value + trend pill */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-4xl font-bold tracking-tight leading-none ${cfg.valueColor}`}>
            {value.toLocaleString('ar-SA')}
          </span>
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
          {trend && trend.value > 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.direction === 'up'   ? 'bg-success/10 text-success' :
              trend.direction === 'down' ? 'bg-danger/10 text-danger'   :
                                          'bg-muted text-muted-foreground'
            }`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—'}
              {trend.value}%
            </span>
          )}
        </div>

        {/* Sparkline */}
        {chartData && chartData.length > 0 && (
          <div className="h-10">
            <SparklineChart
              data={chartData}
              width={240}
              height={40}
              strokeWidth={1.5}
              color={chartColor}
              showFill={true}
              showDots={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
