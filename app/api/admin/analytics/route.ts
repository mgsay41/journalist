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

// GET /api/admin/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const period = (searchParams.get("period") || "all") as "today" | "week" | "month" | "all";
    const limit = parseInt(searchParams.get("limit") || "10");
    const days = parseInt(searchParams.get("days") || "30");
    const months = parseInt(searchParams.get("months") || "6");

    switch (type) {
      case "overview":
        const overview = await getAnalyticsOverview(period);
        return NextResponse.json(overview);

      case "top-articles":
        const topArticles = await getTopArticles({ limit });
        return NextResponse.json(topArticles);

      case "views-chart":
        const viewsChart = await getViewsChartData(days);
        return NextResponse.json(viewsChart);

      case "status-distribution":
        const statusDist = await getStatusDistribution();
        return NextResponse.json(statusDist);

      case "category-distribution":
        const categoryDist = await getCategoryDistribution();
        return NextResponse.json(categoryDist);

      case "top-tags":
        const topTags = await getMostUsedTags(limit);
        return NextResponse.json(topTags);

      case "publishing-frequency":
        const frequency = await getPublishingFrequency(months);
        return NextResponse.json(frequency);

      case "average-length":
        const avgLength = await getAverageArticleLength();
        return NextResponse.json({ averageLength: avgLength });

      case "all":
        // Return all analytics data in one response
        const [overviewResult, topArticlesResult, viewsChartResult, statusDistResult, categoryDistResult, topTagsResult, publishingFreqResult, avgLengthResult] =
          await Promise.all([
            getAnalyticsOverview(period),
            getTopArticles({ limit }),
            getViewsChartData(days),
            getStatusDistribution(),
            getCategoryDistribution(),
            getMostUsedTags(limit),
            getPublishingFrequency(months),
            getAverageArticleLength(),
          ]);

        return NextResponse.json({
          overview: overviewResult,
          topArticles: topArticlesResult,
          viewsChart: viewsChartResult,
          statusDist: statusDistResult,
          categoryDist: categoryDistResult,
          topTags: topTagsResult,
          publishingFreq: publishingFreqResult,
          avgLength: avgLengthResult,
        });

      default:
        return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات التحليلات" },
      { status: 500 }
    );
  }
}
