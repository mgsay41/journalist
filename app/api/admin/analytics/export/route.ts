/**
 * Analytics Export API Endpoint
 * GET /api/admin/analytics/export?format=csv|json&period=all|today|week|month&startDate=&endDate=
 * Export analytics data as CSV or JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const period = (searchParams.get("period") || "all") as "today" | "week" | "month" | "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch analytics data
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
      getAnalyticsOverview(period),
      getTopArticles({ limit: 50, dateRange: startDate && endDate ? { from: new Date(startDate), to: new Date(endDate) } : undefined }),
      getViewsChartData(30),
      getStatusDistribution(),
      getCategoryDistribution(),
      getMostUsedTags(20),
      getPublishingFrequency(12),
      getAverageArticleLength(),
    ]);

    const exportData = {
      generatedAt: new Date().toISOString(),
      period,
      dateRange: { startDate, endDate },
      overview,
      topArticles,
      viewsChart,
      statusDist,
      categoryDist,
      topTags,
      publishingFreq,
      avgLength,
    };

    if (format === "json") {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="analytics-${period}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // CSV format
    const csvRows: string[] = [];

    // Overview
    csvRows.push(["Overview", "", "", ""].join(","));
    csvRows.push(["Metric", "Value", "", ""].join(","));
    csvRows.push(["Total Views", overview.totalViews.toString(), "", ""].join(","));
    csvRows.push(["Views This Month", overview.viewsThisMonth.toString(), "", ""].join(","));
    csvRows.push(["Published Articles", overview.publishedArticles.toString(), "", ""].join(","));
    csvRows.push(["Average SEO Score", `${overview.averageSeoScore}%`, "", ""].join(","));
    csvRows.push(["Average Reading Time", `${overview.averageReadingTime} minutes`, "", ""].join(","));
    csvRows.push(["Average Article Length", `${avgLength} words`, "", ""].join(","));
    csvRows.push(["", "", "", ""].join(","));

    // Top Articles
    csvRows.push(["Top Articles", "", "", ""].join(","));
    csvRows.push(["Title", "Views", "Published Date", ""].join(","));
    for (const article of topArticles) {
      const title = `"${article.title.replace(/"/g, '""')}"`;
      const views = article.views.toString();
      const publishedDate = article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : "N/A";
      csvRows.push([title, views, publishedDate, ""].join(","));
    }
    csvRows.push(["", "", "", ""].join(","));

    // Status Distribution
    csvRows.push(["Article Status", "", "", ""].join(","));
    csvRows.push(["Status", "Count", "Percentage", ""].join(","));
    for (const item of statusDist) {
      csvRows.push([item.status, item.count.toString(), `${item.percentage}%`, ""].join(","));
    }
    csvRows.push(["", "", "", ""].join(","));

    // Category Distribution
    csvRows.push(["Categories", "", "", ""].join(","));
    csvRows.push(["Category", "Article Count", "Percentage", ""].join(","));
    for (const cat of categoryDist) {
      const name = `"${cat.name}"`;
      csvRows.push([name, cat.articleCount.toString(), `${cat.percentage}%`, ""].join(","));
    }
    csvRows.push(["", "", "", ""].join(","));

    // Top Tags
    csvRows.push(["Top Tags", "", "", ""].join(","));
    csvRows.push(["Tag", "Article Count", "", ""].join(","));
    for (const tag of topTags) {
      const name = `"${tag.name}"`;
      csvRows.push([name, tag.articleCount.toString(), "", ""].join(","));
    }

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Analytics export error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تصدير التحليلات" },
      { status: 500 }
    );
  }
}
