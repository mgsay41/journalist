import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export interface SiteSettings {
  siteName: string;
  siteTagline: string | null;
}

/**
 * Get cached site settings (siteName + siteTagline) for public pages.
 * Cached for 1 hour, invalidated when settings are saved (via 'settings' cache tag).
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const settings = await prisma.settings.findFirst({
        select: {
          siteName: true,
          siteTagline: true,
        },
      });
      return {
        siteName: settings?.siteName ?? 'الموقع الصحفي',
        siteTagline: settings?.siteTagline ?? null,
      };
    } catch {
      return { siteName: 'الموقع الصحفي', siteTagline: null };
    }
  },
  ['site-settings'],
  { revalidate: 3600, tags: ['settings'] }
);
