'use client';

/**
 * Camera Upload Button Component
 * Provides quick camera access for capturing images on mobile devices
 */

import { useState, useRef } from 'react';
import { TouchButton } from '@/components/ui/TouchButton';
import { useHaptic } from '@/lib/mobile/haptic-feedback';

interface CameraUploadButtonProps {
  onCapture: (file: File, preview: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  accept?: string;  // Default: 'image/*'
  quality?: number; // Image quality 0-1, default: 0.9
}

export function CameraUploadButton({
  onCapture,
  disabled = false,
  className = '',
  variant = 'ghost',
  accept = 'image/*',
  quality = 0.9,
}: CameraUploadButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const haptic = useHaptic();

  const handleClick = () => {
    haptic.medium();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    haptic.light();

    try {
      // Create preview
      const preview = await createImagePreview(file, quality);

      // Trigger callback
      onCapture(file, preview);
      haptic.success();
    } catch (error) {
      console.error('Error processing image:', error);
      haptic.error();
    } finally {
      setIsProcessing(false);

      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Create optimized preview from file
  const createImagePreview = (file: File, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas for resizing/compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate dimensions (max 1920px for mobile efficiency)
          const maxDimension = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }

              const reader = new FileReader();
              reader.onload = (e) => {
                resolve(e.target?.result as string);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = reject;
        img.src = e.target?.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <>
      <TouchButton
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        haptic
        hapticType="selection"
        className={className}
        icon={
          <svg
            className={`w-5 h-5 ${isProcessing ? 'animate-pulse' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isProcessing ? (
              // Loading icon
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            ) : (
              // Camera icon
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </>
            )}
          </svg>
        }
      >
        {isProcessing ? 'جاري المعالجة...' : 'التقاط صورة'}
      </TouchButton>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        // Multiple attributes for camera capture
        multiple={false}
      />
    </>
  );
}

export default CameraUploadButton;
