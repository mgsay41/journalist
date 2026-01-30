/**
 * Admin Navigation Configuration
 *
 * Defines the structure for the admin sidebar navigation.
 * All labels are in Arabic as per requirements.
 */

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: number | string;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const adminNavConfig: NavSection[] = [
  {
    title: 'الرئيسية',
    items: [
      {
        title: 'لوحة التحكم',
        href: '/admin/dashboard',
        icon: 'dashboard',
      },
    ],
  },
  {
    title: 'المحتوى',
    items: [
      {
        title: 'المقالات',
        href: '/admin/articles',
        icon: 'articles',
        children: [
          {
            title: 'جميع المقالات',
            href: '/admin/articles',
            icon: 'list',
          },
          {
            title: 'إضافة جديد',
            href: '/admin/articles/new',
            icon: 'plus',
          },
          {
            title: 'التصنيفات',
            href: '/admin/categories',
            icon: 'folder',
          },
          {
            title: 'الوسوم',
            href: '/admin/tags',
            icon: 'tag',
          },
        ],
      },
    ],
  },
  {
    title: 'الوسائط',
    items: [
      {
        title: 'ألبوم الصور',
        href: '/admin/media/images',
        icon: 'image',
      },
      {
        title: 'الفيديوهات',
        href: '/admin/media/videos',
        icon: 'video',
      },
    ],
  },
  {
    title: 'التحليلات',
    items: [
      {
        title: 'الإحصائيات',
        href: '/admin/analytics',
        icon: 'chart',
      },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      {
        title: 'إعدادات الموقع',
        href: '/admin/settings',
        icon: 'settings',
      },
    ],
  },
];

// Helper function to check if a path is active
export function isActivePath(path: string, currentPath: string): boolean {
  if (path === currentPath) return true;
  // Check if current path starts with the nav path (for nested routes)
  if (currentPath.startsWith(path + '/')) return true;
  return false;
}

// Helper function to get the active nav item
export function getActiveNavItem(path: string): NavItem | null {
  for (const section of adminNavConfig) {
    for (const item of section.items) {
      if (isActivePath(item.href, path)) return item;
      if (item.children) {
        for (const child of item.children) {
          if (isActivePath(child.href, path)) return child;
        }
      }
    }
  }
  return null;
}

// Helper function to get breadcrumbs for a path
export interface Breadcrumb {
  title: string;
  href: string;
}

export function getBreadcrumbs(path: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [
    { title: 'الرئيسية', href: '/admin/dashboard' },
  ];

  // Track added hrefs to avoid duplicates
  const addedHrefs = new Set<string>(['/admin/dashboard']);

  for (const section of adminNavConfig) {
    for (const item of section.items) {
      if (isActivePath(item.href, path)) {
        // Add parent item if not already added
        if (!addedHrefs.has(item.href)) {
          breadcrumbs.push({ title: item.title, href: item.href });
          addedHrefs.add(item.href);
        }
        if (item.children) {
          for (const child of item.children) {
            // Add child if active, not the current path, and not already added
            if (isActivePath(child.href, path) && child.href !== path && !addedHrefs.has(child.href)) {
              breadcrumbs.push({ title: child.title, href: child.href });
              addedHrefs.add(child.href);
            }
          }
        }
      }
    }
  }

  return breadcrumbs;
}

// SVG icon paths for navigation
export const navIcons: Record<string, string> = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  articles: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  plus: 'M12 4v16m8-8H4',
  folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};
