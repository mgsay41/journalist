import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Loading } from '@/components/ui/Loading';
import { SettingsTabs } from '@/components/admin/SettingsTabs';

async function getSettings(userId: string) {
  const settings = await prisma.settings.findUnique({
    where: { userId },
  });

  // Return default values if no settings exist
  return settings || {
    siteName: 'موقعي',
    siteTagline: null,
    adminEmail: null,
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24',
    defaultMetaTitle: null,
    defaultMetaDescription: null,
    siteKeywords: null,
    googleAnalyticsId: null,
    googleSearchConsole: null,
    facebookHandle: null,
    twitterHandle: null,
    instagramHandle: null,
    youtubeHandle: null,
    maxUploadSize: 10,
    imageQuality: 85,
    storageProvider: 'cloudinary',
    defaultArticleStatus: 'draft',
    autoPublishEnabled: false,
    defaultCategories: null,
    notifyOnPublish: true,
    aiModelPreference: 'gemini-2.5-flash',
    aiResponseLimit: 4096,
    aiFeaturesEnabled: true,
    breakingNewsEnabled: false,
    breakingNewsText: null,
    breakingNewsUrl: null,
  };
}

async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      authorTitle: true,
      twitterUrl: true,
      linkedinUrl: true,
    },
  });

  return user;
}

async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

  return categories;
}

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }

  const [settings, profile, categories] = await Promise.all([
    getSettings(session.user.id),
    getUserProfile(session.user.id),
    getCategories(),
  ]);

  // Ensure profile exists
  if (!profile) {
    redirect('/admin/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">
          إدارة وتكوين إعدادات الموقع
        </p>
      </div>

      {/* Settings Tabs */}
      <Suspense fallback={<Loading />}>
        <SettingsTabs
          initialSettings={settings}
          initialProfile={profile}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
