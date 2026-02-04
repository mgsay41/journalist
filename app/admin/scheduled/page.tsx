import * as React from "react";
import { Suspense } from "react";
import { getScheduledQueue } from "@/lib/publishing";
import { Loading } from "@/components/ui/Loading";

export const metadata = {
  title: "المقالات المجدولة",
  description: "إدارة جدولة نشر المقالات",
};

export default async function ScheduledPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">
          المقالات المجدولة
        </h1>
        <p className="text-zinc-600 mt-1">
          إدارة ومراقبة المقالات المجدولة للنشر
        </p>
      </div>

      <Suspense fallback={<Loading />}>
        <ScheduledQueueList />
      </Suspense>
    </div>
  );
}

async function ScheduledQueueList() {
  const queue = await getScheduledQueue(50);

  return (
    <div className="space-y-8">
      {/* Ready to Publish Section */}
      {queue.readyToPublish.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            جاهز للنشر الآن ({queue.readyToPublish.length})
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              هذه المقالات جاهزة للنشر (تم تجاوز وقت الجدولة)
            </p>
            <ScheduledArticlesList articles={queue.readyToPublish} />
          </div>
        </section>
      )}

      {/* Upcoming Scheduled Section */}
      {queue.upcoming.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            جدولة النشر القادمة ({queue.upcoming.length})
          </h2>
          <ScheduledArticlesList articles={queue.upcoming} />
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            جدولة النشر القادمة
          </h2>
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8 text-center">
            <p className="text-zinc-500">لا توجد مقالات مجدولة للنشر</p>
          </div>
        </section>
      )}

      {/* Recently Published Section */}
      {queue.recentlyPublished.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            نُشر مؤخراً ({queue.recentlyPublished.length})
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-3">
              مقالات نُشرت خلال الـ 24 ساعة الماضية
            </p>
            <RecentArticlesList articles={queue.recentlyPublished} />
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduledArticlesList({ articles }: { articles: any[] }) {
  if (articles.length === 0) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8 text-center">
        <p className="text-zinc-500">لا توجد مقالات</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
              العنوان
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
              وقت النشر المحدد
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
              المؤلف
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700">
              التصنيفات
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700 w-32">
              إجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-zinc-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900">{article.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {article.slug}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                {article.scheduledAt && (
                  <div className="text-sm">
                    <p className="text-zinc-900 font-medium">
                      {new Intl.DateTimeFormat("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(article.scheduledAt))}
                    </p>
                    <CountdownTimer targetDate={new Date(article.scheduledAt)} />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600">
                {article.author.name}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {article.categories.slice(0, 2).map((cat: any) => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800"
                    >
                      {cat.name}
                    </span>
                  ))}
                  {article.categories.length > 2 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800">
                      +{article.categories.length - 2}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <a
                    href={`/admin/articles/${article.id}/edit`}
                    className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                  >
                    تعديل
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentArticlesList({ articles }: { articles: any[] }) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {articles.map((article) => (
        <div
          key={article.id}
          className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-3"
        >
          <div className="flex-1">
            <p className="font-medium text-zinc-900">{article.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {article.author.name} •{" "}
              {new Intl.DateTimeFormat("ar-SA", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(article.publishedAt))}
            </p>
          </div>
          <a
            href={`/admin/articles/${article.id}/edit`}
            className="text-sm text-zinc-600 hover:text-zinc-900 underline"
          >
            عرض
          </a>
        </div>
      ))}
    </div>
  );
}

// Client component for countdown timer
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = React.useState(
    targetDate.getTime() - Date.now()
  );

  React.useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(targetDate.getTime() - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, timeLeft]);

  if (timeLeft <= 0) {
    return <p className="text-xs text-amber-600">الآن</p>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days} يوم`);
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (minutes > 0) parts.push(`${minutes} دقيقة`);

  return (
    <p className="text-xs text-zinc-500">
      متبقي: {parts.length > 0 ? parts.join(" و ") : "أقل من دقيقة"}
    </p>
  );
}
