'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/Loading';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  isValidYouTubeUrl,
  parseYouTubeStartTime,
  formatDuration,
  buildYouTubeWatchUrl,
} from '@/lib/youtube';

interface VideoEmbedData {
  videoId: string;
  title?: string;
  privacyMode: boolean;
  startTime: number;
}

interface VideoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (video: VideoEmbedData) => void;
  title?: string;
}

export default function VideoPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'إدراج فيديو YouTube',
}: VideoPickerModalProps) {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Extracted video ID from URL
  const videoId = url ? extractYouTubeId(url) : null;

  // Auto-parse start time from URL
  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setError(null);

    // Try to extract start time from URL
    const parsedStartTime = parseYouTubeStartTime(newUrl);
    if (parsedStartTime > 0) {
      setStartTime(parsedStartTime);
    }
  }, []);

  // Handle insert
  const handleInsert = useCallback(() => {
    if (!url) {
      setError('الرجاء إدخال رابط الفيديو');
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setError('رابط YouTube غير صالح');
      return;
    }

    const extractedId = extractYouTubeId(url);
    if (!extractedId) {
      setError('لم يتم التعرف على معرف الفيديو');
      return;
    }

    setLoading(true);

    // Simulate a small delay for UX
    setTimeout(() => {
      onSelect({
        videoId: extractedId,
        title: customTitle || undefined,
        privacyMode,
        startTime,
      });

      // Reset form
      setUrl('');
      setCustomTitle('');
      setPrivacyMode(false);
      setStartTime(0);
      setError(null);
      setLoading(false);
      onClose();
    }, 300);
  }, [url, customTitle, privacyMode, startTime, onSelect, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setUrl('');
    setCustomTitle('');
    setPrivacyMode(false);
    setStartTime(0);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        {/* Error */}
        {error && (
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* URL Input */}
        <Input
          label="رابط YouTube"
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          helperText="أدخل رابط الفيديو من YouTube"
        />

        {/* Preview */}
        {videoId && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">معاينة</label>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={getYouTubeThumbnail(videoId, 'high')}
                alt="Video preview"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-600">
                  <svg
                    className="w-8 h-8 text-white mr-[-2px]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-center">
              <a
                href={buildYouTubeWatchUrl(videoId, startTime)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                فتح في YouTube ↗
              </a>
            </div>
          </div>
        )}

        {/* Title */}
        <Input
          label="العنوان (اختياري)"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="عنوان مخصص للفيديو"
          helperText="يظهر أسفل الفيديو في المقال"
        />

        {/* Start Time */}
        <Input
          label="وقت البدء (بالثواني)"
          type="number"
          min={0}
          value={startTime}
          onChange={(e) => setStartTime(parseInt(e.target.value, 10) || 0)}
          placeholder="0"
          helperText={
            startTime > 0
              ? `سيبدأ التشغيل عند ${formatDuration(startTime)}`
              : 'اتركه صفر للبدء من البداية'
          }
        />

        {/* Privacy Mode */}
        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <input
            type="checkbox"
            checked={privacyMode}
            onChange={(e) => setPrivacyMode(e.target.checked)}
            className="rounded"
          />
          <div>
            <div className="text-sm font-medium">وضع الخصوصية المحسّن</div>
            <div className="text-xs text-muted-foreground">
              يستخدم youtube-nocookie.com لتقليل تتبع المستخدمين
            </div>
          </div>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!videoId || loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="ml-2" />
                جاري الإدراج...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                إدراج الفيديو
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
