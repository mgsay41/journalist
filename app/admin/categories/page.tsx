import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Loading } from '@/components/ui/Loading';
import { CategoriesListClient } from '@/components/admin/CategoriesListClient';

async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: 'asc' },
      },
      _count: {
        select: {
          articles: true,
        },
      },
    },
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    parentId: cat.parentId,
    parent: cat.parent,
    children: cat.children,
    articleCount: cat._count.articles,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }));
}

export default async function CategoriesPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  const categories = await getCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">التصنيفات</h1>
        <p className="text-muted-foreground mt-1">
          إدارة وتنظيم تصنيفات المقالات
        </p>
      </div>

      {/* Categories List */}
      <Suspense fallback={<Loading />}>
        <CategoriesListClient initialCategories={categories} />
      </Suspense>
    </div>
  );
}
