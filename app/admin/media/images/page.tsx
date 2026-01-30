import { Metadata } from 'next';
import ImageAlbumClient from '@/components/admin/ImageAlbumClient';

export const metadata: Metadata = {
  title: 'ألبوم الصور | لوحة التحكم',
  description: 'إدارة صور المقالات',
};

export default function ImageAlbumPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ألبوم الصور</h1>
          <p className="text-gray-600 mt-1">
            إدارة صور الموقع - رفع وتعديل وحذف الصور
          </p>
        </div>
      </div>

      {/* Image Album Client Component */}
      <ImageAlbumClient />
    </div>
  );
}
