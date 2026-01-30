import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Loading } from '@/components/ui/Loading';
import { TagsListClient } from '@/components/admin/TagsListClient';

async function getTags() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          articles: true,
        },
      },
    },
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    articleCount: tag._count.articles,
    createdAt: tag.createdAt.toISOString(),
  }));
}

export default async function TagsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  const tags = await getTags();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">الوسوم</h1>
        <p className="text-muted-foreground mt-1">
          إدارة وتنظيم وسوم المقالات
        </p>
      </div>

      {/* Tags List */}
      <Suspense fallback={<Loading />}>
        <TagsListClient initialTags={tags} />
      </Suspense>
    </div>
  );
}
