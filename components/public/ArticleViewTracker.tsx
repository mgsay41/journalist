'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ArticleViewTrackerProps {
  slug: string;
}

export function ArticleViewTracker({ slug }: ArticleViewTrackerProps) {
  const router = useRouter();

  useEffect(() => {
    // Record view when component mounts
    const recordView = async () => {
      try {
        await fetch(`/api/articles/${slug}/view`, {
          method: 'POST',
        });
      } catch (error) {
        // Silent fail - don't block user from reading if tracking fails
        console.error('Failed to record article view:', error);
      }
    };

    // Small delay to ensure the article is actually being viewed
    const timeoutId = setTimeout(recordView, 1500);
    return () => clearTimeout(timeoutId);
  }, [slug]);

  // Re-record when route changes away (e.g., user closes tab and comes back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const recordView = async () => {
          try {
            await fetch(`/api/articles/${slug}/view`, {
              method: 'POST',
            });
          } catch (error) {
            console.error('Failed to record article view:', error);
          }
        };

        recordView();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slug]);

  return null; // This component doesn't render anything
}
