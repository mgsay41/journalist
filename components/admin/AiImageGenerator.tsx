'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';

// ============================================
// Types
// ============================================

export type ImageStyle = 'professional' | 'casual' | 'artistic' | 'minimalist' | 'editorial';
export type AspectRatio = '16:9' | '4:3' | '1:1';
export type ImageModel = 'flux' | 'flux-realism' | 'flux-anime' | 'turbo' | 'flux-pro' | 'sdxl-turbo' | 'stable-diffusion-xl';
export type ImageProvider = 'pollinations' | 'nanobanana';

export interface GeneratedPrompt {
  englishPrompt: string;
  arabicDescription: string;
  visualElements: string[];
  colorPalette: string[];
  styleKeywords: string[];
  compositionHint: string;
  mood: string;
}

export interface GeneratedImageData {
  imageUrl: string;
  width: number;
  height: number;
  seed: string;
  model: ImageModel;
  prompt: string;
  cloudinaryPublicId?: string;
  provider?: ImageProvider;
}

export interface PromptVariation {
  id: string;
  englishPrompt: string;
  arabicDescription: string;
  style: 'photorealistic' | 'illustration' | 'digital-art' | 'mixed-media';
  mood: string;
  focusArea: string;
  recommendedFor: string;
}

// ============================================
// Props
// ============================================

export interface AiImageGeneratorProps {
  articleTitle: string;
  articleContent: string;
  articleCategory?: string;
  onImageGenerated?: (image: GeneratedImageData) => void;
  onSetAsFeatured?: (imageUrl: string, publicId?: string) => void;
  onClose?: () => void;
}

// ============================================
// Constants
// ============================================

const STYLE_OPTIONS: { value: ImageStyle; label: string; description: string }[] = [
  { value: 'professional', label: 'احترافي', description: 'مناسب للمقالات الصحفية والإعلامية' },
  { value: 'casual', label: 'بسيط', description: 'ودود وقريب من القراء' },
  { value: 'artistic', label: 'فني', description: 'إبداعي وجريء' },
  { value: 'minimalist', label: 'بسيط', description: 'أنيق مع مساحة سلبية كبيرة' },
  { value: 'editorial', label: 'تحريري', description: 'صورة احترافية عالية الجودة' },
];

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; dimensions: string }[] = [
  { value: '16:9', label: '16:9', dimensions: '1280×720' },
  { value: '4:3', label: '4:3', dimensions: '1024×768' },
  { value: '1:1', label: '1:1', dimensions: '1024×1024' },
];

const PROVIDER_OPTIONS: { value: ImageProvider; label: string; description: string; free: boolean }[] = [
  { value: 'pollinations', label: 'Pollinations.ai', description: 'مجاني تماماً - متوفر دائماً', free: true },
  { value: 'nanobanana', label: 'Nano Banana', description: 'جودة احترافية - يتطلب مفتاح API', free: false },
];

const MODEL_OPTIONS_BY_PROVIDER: Record<ImageProvider, { value: ImageModel; label: string; description: string }[]> = {
  pollinations: [
    { value: 'flux', label: 'Flux', description: 'سريع وجودة عالية' },
    { value: 'flux-realism', label: 'Flux Realism', description: 'واقعي للغاية' },
    { value: 'flux-anime', label: 'Flux Anime', description: 'أسلوب أنمي' },
    { value: 'turbo', label: 'Turbo', description: 'الأسرع' },
  ],
  nanobanana: [
    { value: 'flux-realism', label: 'Flux Realism', description: 'واقعي للغاية' },
    { value: 'flux-pro', label: 'Flux Pro', description: 'احترافي عالي الجودة' },
    { value: 'flux-anime', label: 'Flux Anime', description: 'أسلوب أنمي' },
    { value: 'sdxl-turbo', label: 'SDXL Turbo', description: 'سريع جداً' },
    { value: 'stable-diffusion-xl', label: 'SDXL', description: 'توليد متوازن' },
  ],
};

// ============================================
// Component
// ============================================

export function AiImageGenerator({
  articleTitle,
  articleContent,
  articleCategory,
  onImageGenerated,
  onSetAsFeatured,
  onClose,
}: AiImageGeneratorProps) {
  // State
  const [step, setStep] = useState<'prompt' | 'generate' | 'result'>('prompt');
  const [style, setStyle] = useState<ImageStyle>('professional');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [provider, setProvider] = useState<ImageProvider>('pollinations');
  const [model, setModel] = useState<ImageModel>('flux');
  const [isNanoBananaConfigured, setIsNanoBananaConfigured] = useState(false);

  // Check Nano Banana configuration on mount
  useEffect(() => {
    // Check if Nano Banana API key is configured by trying to access it
    // In a real app, you might want to check this via an API endpoint
    const hasKey = process.env.NANO_BANANA_API_KEY;
    setIsNanoBananaConfigured(!!hasKey);
  }, []);

  // Update model when provider changes
  useEffect(() => {
    const providerModels = MODEL_OPTIONS_BY_PROVIDER[provider];
    if (providerModels && providerModels.length > 0) {
      // Set first available model for the provider
      setModel(providerModels[0].value as ImageModel);
    }
  }, [provider]);

  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [variations, setVariations] = useState<PromptVariation[] | null>(null);

  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageData | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<PromptVariation | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saveToCloudinary, setSaveToCloudinary] = useState(true);

  // ============================================
  // Actions
  // ============================================

  const generatePrompt = useCallback(async () => {
    if (!articleTitle || !articleContent) {
      setError('العنوان والمحتوى مطلوبان لتوليد الوصف');
      return;
    }

    setGeneratingPrompt(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai/image-prompt', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          title: articleTitle,
          content: articleContent,
          category: articleCategory,
          style,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const prompt: GeneratedPrompt = data.data;
        setGeneratedPrompt(prompt);
        setEditedPrompt(prompt.englishPrompt);
        setStep('generate');
      } else {
        setError(data.error?.message || 'فشل توليد الوصف');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setGeneratingPrompt(false);
    }
  }, [articleTitle, articleContent, articleCategory, style, aspectRatio]);

  const generateVariations = useCallback(async () => {
    if (!articleTitle || !articleContent) {
      setError('العنوان والمحتوى مطلوبان لتوليد الخيارات');
      return;
    }

    setGeneratingPrompt(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai/image-prompt', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'variations',
          title: articleTitle,
          content: articleContent,
          category: articleCategory,
          variations: 3,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.variations) {
        setVariations(data.data.variations);
        setStep('generate');
      } else {
        setError(data.error?.message || 'فشل توليد الخيارات');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setGeneratingPrompt(false);
    }
  }, [articleTitle, articleContent, articleCategory]);

  const selectVariation = useCallback((variation: PromptVariation) => {
    setSelectedVariation(variation);
    setEditedPrompt(variation.englishPrompt);
    setGeneratedPrompt({
      englishPrompt: variation.englishPrompt,
      arabicDescription: variation.arabicDescription,
      visualElements: [],
      colorPalette: [],
      styleKeywords: [],
      compositionHint: '',
      mood: variation.mood,
    });
  }, []);

  const generateImage = useCallback(async () => {
    if (!editedPrompt.trim()) {
      setError('الوصف مطلوب لتوليد الصورة');
      return;
    }

    // Check if Nano Banana is configured but the key is missing
    if (provider === 'nanobanana' && !isNanoBananaConfigured) {
      setError('خدمة Nano Banana غير متاحة. يرجى تكوين مفتاح NANO_BANANA_API_KEY أو استخدام Pollinations.ai المجاني.');
      return;
    }

    setGeneratingImage(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai/generate-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editedPrompt.trim(),
          aspectRatio,
          model,
          provider,
          saveToCloudinary,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const image: GeneratedImageData = {
          ...data.data,
          provider,
        };
        setGeneratedImages([image]);
        setSelectedImage(image);
        setStep('result');
        onImageGenerated?.(image);
      } else {
        setError(data.error?.message || 'فشل توليد الصورة');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setGeneratingImage(false);
    }
  }, [editedPrompt, aspectRatio, model, provider, saveToCloudinary, onImageGenerated, isNanoBananaConfigured]);

  const regenerateImage = useCallback(() => {
    setGeneratedImages([]);
    generateImage();
  }, [generateImage]);

  const handleSetAsFeatured = useCallback(() => {
    if (selectedImage) {
      onSetAsFeatured?.(selectedImage.imageUrl, selectedImage.cloudinaryPublicId);
      onClose?.();
    }
  }, [selectedImage, onSetAsFeatured, onClose]);

  // ============================================
  // Render Helpers
  // ============================================

  const renderPromptStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">توليد صورة بالذكاء الاصطناعي</h3>
        <p className="text-sm text-muted-foreground">سأقوم بتحليل مقالك وإنشاء وصف تفصيلي للصورة</p>
      </div>

      {/* Style Selection */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">الأسلوب</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStyle(option.value)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                style === option.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Selection */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">نسبة الأبعاد</label>
        <div className="flex gap-2">
          {ASPECT_RATIO_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAspectRatio(option.value)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                aspectRatio === option.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.dimensions}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">مزود خدمة التوليد</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROVIDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setProvider(option.value)}
              disabled={option.value === 'nanobanana' && !isNanoBananaConfigured}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                provider === option.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/50'
              } ${option.value === 'nanobanana' && !isNanoBananaConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{option.label}</div>
                {option.free && (
                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">مجاني</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
              {option.value === 'nanobanana' && !isNanoBananaConfigured && (
                <div className="text-xs text-warning mt-1">يتطلب تكوين مفتاح API</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection (based on provider) */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          نموذج {provider === 'pollinations' ? 'Pollinations' : 'Nano Banana'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MODEL_OPTIONS_BY_PROVIDER[provider].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setModel(option.value)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                model === option.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={generatePrompt}
          disabled={generatingPrompt}
          className="flex-1 gap-2"
        >
          {generatingPrompt ? (
            <>
              <LoadingSpinner size="sm" />
              جاري التحليل...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              توليد وصف تلقائي
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={generateVariations}
          disabled={generatingPrompt}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          خيارات متعددة
        </Button>
      </div>

      {/* Close Button */}
      {onClose && (
        <Button type="button" variant="ghost" onClick={onClose} className="w-full">
          إلغاء
        </Button>
      )}
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-foreground mb-2">مراجعة الوصف</h3>
        <p className="text-sm text-muted-foreground">يمكنك تعديل الوصف قبل توليد الصورة</p>
      </div>

      {/* Arabic Description */}
      {generatedPrompt?.arabicDescription && (
        <div className="bg-muted/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-foreground">الوصف (عربي)</span>
          </div>
          <p className="text-sm text-muted-foreground">{generatedPrompt.arabicDescription}</p>
        </div>
      )}

      {/* Visual Elements */}
      {generatedPrompt?.visualElements && generatedPrompt.visualElements.length > 0 && (
        <div>
          <span className="text-sm font-medium text-foreground block mb-2">العناصر البصرية</span>
          <div className="flex flex-wrap gap-2">
            {generatedPrompt.visualElements.map((element, index) => (
              <span key={index} className="text-xs bg-muted px-2 py-1 rounded-md">
                {element}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* English Prompt Editor */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          الوصف الإنجليزي للصورة
          <span className="text-xs text-muted-foreground font-normal mr-2">(يمكن التعديل)</span>
        </label>
        <textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary outline-none transition-colors text-sm"
          dir="ltr"
          placeholder="Enter image description in English..."
        />
      </div>

      {/* Model Selection (based on provider) */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          نموذج {provider === 'pollinations' ? 'Pollinations' : 'Nano Banana'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MODEL_OPTIONS_BY_PROVIDER[provider].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setModel(option.value)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                model === option.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          المزود الحالي: <span className="font-medium">{provider === 'pollinations' ? 'Pollinations.ai (مجاني)' : 'Nano Banana'}</span>
        </div>
      </div>

      {/* Save to Cloudinary Option */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
        <div>
          <div className="text-sm font-medium text-foreground">حفظ في Cloudinary</div>
          <div className="text-xs text-muted-foreground">يحفظ الصورة في الألبوم لاستخدامها لاحقاً</div>
        </div>
        <button
          type="button"
          onClick={() => setSaveToCloudinary(!saveToCloudinary)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            saveToCloudinary ? 'bg-primary' : 'bg-border'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              saveToCloudinary ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={generateImage}
          disabled={generatingImage || !editedPrompt.trim()}
          className="flex-1 gap-2"
        >
          {generatingImage ? (
            <>
              <LoadingSpinner size="sm" />
              جاري التوليد...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              توليد الصورة
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('prompt')}
          disabled={generatingImage}
        >
          رجوع
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">تم توليد الصورة!</h3>
        <p className="text-sm text-muted-foreground">يمكنك تعيينها كصورة الغلاف أو توليد صورة أخرى</p>
      </div>

      {/* Generated Image */}
      {selectedImage && (
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
          <Image
            src={selectedImage.imageUrl}
            alt="Generated image"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {/* Image Details */}
      {selectedImage && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الأبعاد:</span>
            <span className="text-foreground font-medium">{selectedImage.width}×{selectedImage.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">النموذج:</span>
            <span className="text-foreground font-medium">{selectedImage.model}</span>
          </div>
          {saveToCloudinary && selectedImage.cloudinaryPublicId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحفظ:</span>
              <span className="text-success font-medium">محفوظ في Cloudinary</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={handleSetAsFeatured}
          className="w-full gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          تعيين كصورة الغلاف
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={regenerateImage}
          className="w-full gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          توليد صورة أخرى
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep('prompt')}
          className="w-full"
        >
          البدء من جديد
        </Button>
      </div>
    </div>
  );

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="bg-card rounded-2xl border border-border shadow-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">توليد صورة بالذكاء الاصطناعي</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 'prompt' && renderPromptStep()}
        {step === 'generate' && renderGenerateStep()}
        {step === 'result' && renderResultStep()}
      </div>
    </div>
  );
}

export default AiImageGenerator;
