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
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">
          التحليلات والإحصائيات
        </h1>
        <p className="text-zinc-600 mt-1">
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
          <label className="text-sm text-zinc-600">تصدير التقارير:</label>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/analytics/export?format=csv&period=all"
            className="inline-flex items-center px-3 py-2 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير CSV
          </a>
          <a
            href="/api/admin/analytics/export?format=json&period=all"
            className="inline-flex items-center px-3 py-2 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير JSON
          </a>
        </div>
      </div>

      {/* Overview Stats */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
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
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          المقالات الأكثر مشاهدة
        </h2>
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
                  العنوان
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
                  المشاهدات
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
                  تاريخ النشر
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700 w-24">
                  إجراء
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {data.topArticles.length > 0 ? (
                data.topArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{article.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {article.views.toLocaleString("ar-SA")}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
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
                        className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
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
        <section className="bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          حالة المقالات
          </h2>
          <div className="space-y-3">
            {data.statusDist.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 capitalize">
                    {item.status === "draft" && "مسودة"}
                    {item.status === "published" && "منشور"}
                    {item.status === "scheduled" && "مجدول"}
                    {item.status === "archived" && "أرشيف"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-900">
                    {item.count}
                  </span>
                  <span className="text-xs text-zinc-500 w-10">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Categories */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          الأقسام الأكثر نشاطاً
          </h2>
          <div className="space-y-3">
            {data.categoryDist.slice(0, 5).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between">
                <span className="text-sm text-zinc-700">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">
                    {cat.articleCount}
                  </span>
                  <div className="w-20 bg-zinc-100 rounded-full h-2">
                    <div
                      className="bg-zinc-900 h-2 rounded-full"
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
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-sm text-zinc-600 mb-1">متوسط وقت القراءة</p>
          <p className="text-xl font-semibold text-zinc-900">
            {data.overview.averageReadingTime} دقيقة
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-sm text-zinc-600 mb-1">متوسط طول المقال</p>
          <p className="text-xl font-semibold text-zinc-900">
            {data.avgLength.toLocaleString("ar-SA")} كلمة
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-sm text-zinc-600 mb-1">إجمالي المقالات</p>
          <p className="text-xl font-semibold text-zinc-900">
            {data.overview.totalArticles}
          </p>
        </div>
      </div>
    </div>
  );
}
