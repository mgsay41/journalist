'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { Alert } from '@/components/ui/Alert';

interface ImageData {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  altText: string | null;
  caption: string | null;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: ImageData) => void;
  title?: string;
  allowUpload?: boolean;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'اختر صورة',
  allowUpload = true,
}: ImagePickerModalProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch images
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '18',
        sortBy: 'uploadedAt',
        sortOrder: 'desc',
      });

      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/images?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في جلب الصور');
      }

      setImages(data.images);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, fetchImages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setSearch('');
      setPage(1);
      setUploadError(null);
    }
  }, [isOpen]);

  // Handle image upload
  const handleUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/admin/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في رفع الصورة');
      }

      // Refresh images list
      fetchImages();

      // Auto-select the first uploaded image
      if (data.images && data.images.length > 0) {
        setSelectedImage(data.images[0]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'فشل في رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        {/* Search & Upload */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="بحث في الصور..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {allowUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Spinner size="sm" />
                    <span className="mr-2">جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    رفع صورة
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Errors */}
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {uploadError && (
          <Alert variant="error" onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}

        {/* Image Grid */}
        <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto w-12 h-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-gray-500">لا توجد صور</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImage?.id === image.id
                      ? 'ring-2 ring-black ring-offset-2'
                      : 'hover:opacity-80'
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  <Image
                    src={image.thumbnailUrl || image.url}
                    alt={image.altText || image.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 16vw"
                  />
                  {selectedImage?.id === image.id && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              السابق
            </Button>
            <span className="text-sm text-gray-600">
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              التالي
            </Button>
          </div>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
            <div className="relative w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
              <Image
                src={selectedImage.thumbnailUrl || selectedImage.url}
                alt={selectedImage.altText || selectedImage.filename}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedImage.filename}</p>
              <p className="text-sm text-gray-500">
                {selectedImage.width} × {selectedImage.height} بكسل
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedImage}>
            اختيار الصورة
          </Button>
        </div>
      </div>
    </Modal>
  );
}
