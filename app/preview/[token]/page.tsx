import { notFound } from "next/navigation";
import { verifyPreviewToken } from "@/lib/preview";
import { Cairo } from "next/font/google";
import { PreviewControls } from "@/components/admin/PreviewControls";
import "./preview.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata = {
  title: "معاينة المقال",
  description: "معاينة المقال قبل النشر",
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const article = await verifyPreviewToken(token);

  if (!article) {
    notFound();
  }

  return (
    <div className={`${cairo.variable} min-h-screen bg-zinc-50`}>
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-md">
        <div className="flex items-center justify-center gap-4">
          <span>وضع المعاينة - هذا المقال غير منشور بعد</span>
          <a
            href="/admin"
            className="bg-white text-amber-600 px-3 py-1 rounded text-xs font-semibold hover:bg-amber-50 transition-colors"
          >
            العودة للوحة التحكم
          </a>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Article Header */}
        <header className="mb-8">
          {/* Categories */}
          {article.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.categories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-medium"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 mb-4 leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              {article.author.image && (
                <img
                  src={article.author.image}
                  alt={article.author.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="font-medium">{article.author.name}</span>
            </div>
            <span>•</span>
            <span>
              {new Intl.DateTimeFormat("ar-SA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(article.createdAt)}
            </span>
            {article.publishedAt && (
              <>
                <span>•</span>
                <span>نُشر في{" "}
                  {new Intl.DateTimeFormat("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(article.publishedAt)}
                </span>
              </>
            )}
            <span>•</span>
            <span>
              {calculateReadingTime(article.content)} دقيقة قراءة
            </span>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 rounded bg-zinc-100 text-zinc-700 text-xs"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {article.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
            <img
              src={article.featuredImage.largeUrl || article.featuredImage.url}
              alt={article.featuredImage.altText || article.title}
              className="w-full h-auto"
            />
            {article.featuredImage.caption && (
              <p className="text-sm text-zinc-600 text-center mt-2 px-4">
                {article.featuredImage.caption}
              </p>
            )}
          </div>
        )}

        {/* Excerpt */}
        {article.excerpt && (
          <div className="mb-8 p-4 bg-zinc-100 rounded-lg border-r-4 border-zinc-900">
            <p className="text-lg font-medium text-zinc-800 leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        )}

        {/* Article Body */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-p:leading-relaxed prose-a:text-zinc-900 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-strong:text-zinc-900 prose-code:text-zinc-900 prose-pre:bg-zinc-100 prose-blockquote:border-r-zinc-900"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-zinc-500">
              <p>آخر تحديث:{" "}
                {new Intl.DateTimeFormat("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(article.updatedAt)}
              </p>
            </div>
          </div>
        </footer>
      </article>

      {/* Preview Controls */}
      <PreviewControls articleId={article.id} />
    </div>
  );
}

// Helper function to calculate reading time
function calculateReadingTime(content: string): number {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, "");
  // Count words in Arabic (approximately)
  const words = text.split(/\s+/).length;
  // Average reading speed: 200 words per minute
  return Math.max(1, Math.ceil(words / 200));
}

// Generate static params for static generation (optional)
export function generateStaticParams() {
  return [];
}
