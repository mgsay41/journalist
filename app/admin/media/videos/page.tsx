import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import VideosListClient from '@/components/admin/VideosListClient';

export const metadata: Metadata = {
  title: 'إدارة الفيديوهات | لوحة التحكم',
  description: 'إدارة فيديوهات YouTube المضمنة في المقالات',
};

// Video with article relation type
interface VideoWithArticle {
  id: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string | null;
  thumbnail: string;
  privacyMode: boolean;
  autoplay: boolean;
  startTime: number;
  position: number;
  articleId: string;
  createdAt: Date;
  article: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
}

export default async function VideosPage() {
  // Fetch initial videos with article info
  const videos = await prisma.video.findMany({
    include: {
      article: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  // Get total count
  const totalVideos = await prisma.video.count();

  // Get articles for filter dropdown
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      status: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  // Calculate stats
  const videosWithPrivacyMode = await prisma.video.count({
    where: { privacyMode: true },
  });

  const uniqueArticlesWithVideos = await prisma.video.groupBy({
    by: ['articleId'],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الفيديوهات</h1>
          <p className="text-muted-foreground">
            إدارة فيديوهات YouTube المضمنة في المقالات
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">إجمالي الفيديوهات</div>
          <div className="text-2xl font-bold">{totalVideos}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">مقالات تحتوي فيديوهات</div>
          <div className="text-2xl font-bold">{uniqueArticlesWithVideos.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">وضع الخصوصية</div>
          <div className="text-2xl font-bold">{videosWithPrivacyMode}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">متوسط لكل مقال</div>
          <div className="text-2xl font-bold">
            {uniqueArticlesWithVideos.length > 0
              ? (totalVideos / uniqueArticlesWithVideos.length).toFixed(1)
              : '0'}
          </div>
        </div>
      </div>

      {/* Videos List Client Component */}
      <VideosListClient
        initialVideos={videos as VideoWithArticle[]}
        initialTotal={totalVideos}
        articles={articles}
      />
    </div>
  );
}
