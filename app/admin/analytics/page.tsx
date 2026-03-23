import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import {
  getAnalyticsOverview,
  getTopArticles,
  getViewsChartData,
  getStatusDistribution,
  getCategoryDistribution,
  getMostUsedTags,
  getPublishingFrequency,
  getAverageArticleLength,
} from "@/lib/analytics";
import { AnalyticsStatsCard } from "@/components/admin/AnalyticsStatsCard";
import Link from "next/link";

export const metadata = {
  title: "التحليلات والإحصائيات",
  description: "عرض تحليلات الموقع والإحصائيات",
};

async function getAnalyticsData() {
  const [
    overview,
    topArticles,
    viewsChart,
    statusDist,
    categoryDist,
    topTags,
    publishingFreq,
    avgLength,
  ] = await Promise.all([
    getAnalyticsOverview(),
    getTopArticles({ limit: 10 }),
    getViewsChartData(30),
    getStatusDistribution(),
    getCategoryDistribution(),
    getMostUsedTags(10),
    getPublishingFrequency(6),
    getAverageArticleLength(),
  ]);

  return {
    overview,
    topArticles,
    viewsChart,
    statusDist,
    categoryDist,
    topTags,
    publishingFreq,
    avgLength,
  };
}

export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          التحليلات والإحصائيات
        </h1>
        <p className="text-muted-foreground mt-1">
          نظرة عامة على أداء الموقع والمحتوى
        </p>
      </div>

      <Suspense fallback={<Loading />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}

async function AnalyticsDashboard() {
  const data = await getAnalyticsData();

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">تصدير التقارير:</label>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/analytics/export?format=csv&period=all"
            className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
          >
            <svg className="w-4 h-4 ms-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير CSV
          </a>
          <a
            href="/api/admin/analytics/export?format=json&period=all"
            className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
          >
            <svg className="w-4 h-4 ms-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير JSON
          </a>
        </div>
      </div>

      {/* Overview Stats */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          نظرة عامة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsStatsCard
            title="إجمالي المشاهدات"
            value={data.overview.totalViews.toLocaleString("ar-SA")}
          />
          <AnalyticsStatsCard
            title="المشاهدات هذا الشهر"
            value={data.overview.viewsThisMonth.toLocaleString("ar-SA")}
          />
          <AnalyticsStatsCard
            title="المقالات المنشورة"
            value={data.overview.publishedArticles}
          />
          <AnalyticsStatsCard
            title="متوسط درجة SEO"
            value={`${data.overview.averageSeoScore}%`}
          />
        </div>
      </section>

      {/* Most Viewed Articles */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          المقالات الأكثر مشاهدة
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  العنوان
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  المشاهدات
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  تاريخ النشر
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-24">
                  إجراء
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.topArticles.length > 0 ? (
                data.topArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{article.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {article.views.toLocaleString("ar-SA")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {article.publishedAt
                        ? new Intl.DateTimeFormat("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }).format(article.publishedAt)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    لا توجد بيانات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Content Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            حالة المقالات
          </h2>
          <div className="space-y-3">
            {data.statusDist.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground capitalize">
                    {item.status === "draft" && "مسودة"}
                    {item.status === "published" && "منشور"}
                    {item.status === "scheduled" && "مجدول"}
                    {item.status === "archived" && "أرشيف"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {item.count}
                  </span>
                  <span className="text-xs text-muted-foreground w-10">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Categories */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            الأقسام الأكثر نشاطاً
          </h2>
          <div className="space-y-3">
            {data.categoryDist.slice(0, 5).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {cat.articleCount}
                  </span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">متوسط وقت القراءة</p>
          <p className="text-xl font-semibold text-foreground">
            {data.overview.averageReadingTime} دقيقة
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">متوسط طول المقال</p>
          <p className="text-xl font-semibold text-foreground">
            {data.avgLength.toLocaleString("ar-SA")} كلمة
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">إجمالي المقالات</p>
          <p className="text-xl font-semibold text-foreground">
            {data.overview.totalArticles}
          </p>
        </div>
      </div>
    </div>
  );
}
