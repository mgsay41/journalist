'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Loading';

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
      <div className="flex flex-col gap-0" style={{ minHeight: '480px' }}>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="بحث في الصور..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent border-0 border-b border-gray-200 py-2 pr-6 pl-0 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-800 transition-colors duration-200"
              style={{ direction: 'rtl' }}
            />
          </div>

          {/* Upload button */}
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isUploading ? (
                  <>
                    <Spinner size="sm" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span>رفع صورة</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* ── Error messages ── */}
        {(error || uploadError) && (
          <div className="mt-3">
            {error && (
              <div className="flex items-center justify-between text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors mr-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {uploadError && (
              <div className="flex items-center justify-between text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
                <span>{uploadError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors mr-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Image Grid ── */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[320px] max-h-[380px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <Spinner size="lg" />
              <span className="text-xs text-gray-300">جاري التحميل...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-300"
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
              </div>
              <p className="text-sm text-gray-400">لا توجد صور متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {images.map((image) => {
                const isSelected = selectedImage?.id === image.id;
                return (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className={`
                      group relative aspect-square rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? 'border-gray-900 shadow-sm shadow-gray-200'
                        : 'border-gray-100 hover:border-gray-300'
                      }
                    `}
                  >
                    <Image
                      src={image.thumbnailUrl || image.url}
                      alt={image.altText || image.filename}
                      fill
                      className={`object-cover transition-transform duration-300 ${
                        isSelected ? '' : 'group-hover:scale-105'
                      }`}
                      sizes="(max-width: 640px) 25vw, 16vw"
                    />
                    {/* Hover overlay */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                    )}
                    {/* Selected overlay + check */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shadow-sm">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 pt-4 space-y-3">

          {/* Selected preview */}
          {selectedImage && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                <Image
                  src={selectedImage.thumbnailUrl || selectedImage.url}
                  alt={selectedImage.altText || selectedImage.filename}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium text-gray-800 truncate leading-snug">
                  {selectedImage.filename}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedImage.width} × {selectedImage.height}
                </p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Pagination + Actions */}
          <div className="flex items-center justify-between">
            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span className="text-xs text-gray-400 px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-150"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedImage}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                اختيار الصورة
              </button>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
