import { NextRequest, NextResponse } from "next/server";
import { publishScheduledArticles } from "@/lib/publishing";

// POST /api/cron/publish-scheduled - Cron job endpoint for auto-publishing
// Configure in vercel.json or platform cron settings to run every 5-15 minutes
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (recommended for production)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await publishScheduledArticles();

    return NextResponse.json({
      success: true,
      published: result.published,
      errors: result.errors.length,
      details: result.errors,
    });
  } catch (error) {
    console.error("Error in cron publish:", error);
    return NextResponse.json(
      { error: "فشل في النشر التلقائي" },
      { status: 500 }
    );
  }
}

// Also allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  try {
    // Simple auth check for testing
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized - Provide CRON_SECRET in Authorization header" },
        { status: 401 }
      );
    }

    const result = await publishScheduledArticles();

    return NextResponse.json({
      success: true,
      published: result.published,
      errors: result.errors.length,
      details: result.errors,
    });
  } catch (error) {
    console.error("Error in cron publish:", error);
    return NextResponse.json(
      { error: "فشل في النشر التلقائي" },
      { status: 500 }
    );
  }
}
