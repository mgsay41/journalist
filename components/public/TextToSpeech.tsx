'use client';

import { useState, useCallback, useRef, useEffect, ChangeEvent } from 'react';
import { Select } from '@/components/ui/Select';

interface TextToSpeechProps {
  content: string;
  title?: string;
  slug: string;
  className?: string;
}

const speedOptions = [
  { value: '0.75', label: '0.75x' },
  { value: '1', label: 'عادي' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
];

function extractText(html: string): string {
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('script, style').forEach((el) => el.remove());
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TextToSpeech({ content, title, slug, className = '' }: TextToSpeechProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    setError(null);

    if (!audioUrl) {
      setIsLoading(true);
      setIsExpanded(true); // Show player immediately with loading state
      try {
        const text = title ? `${title}. ${extractText(content)}` : extractText(content);
        const res = await fetch('/api/tts', {
          method: 'POST',
          body: JSON.stringify({ slug, text, title }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'فشل في تحميل الصوت');
        }

        const { url } = await res.json();
        setAudioUrl(url);
        setIsLoading(false);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(console.error);
        }
      } catch (err) {
        setIsLoading(false);
        setIsExpanded(false);
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الصوت');
      }
    } else {
      setIsExpanded(true); // Bug fix: re-expand when replaying after stop
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [audioUrl, content, slug, title]);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleRateChange = useCallback((rate: string) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = parseFloat(rate);
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setIsExpanded(false);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.playbackRate = parseFloat(playbackRate);
    }
  }, [playbackRate]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        preload="metadata"
      />

      {/* Inline trigger button — hidden once player is open */}
      {!isExpanded && (
        <div className={className}>
          {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
          <button
            type="button"
            onClick={handlePlay}
            disabled={isLoading}
            title="استماع للمقال"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>استماع للمقال</span>
          </button>
        </div>
      )}

      {/* Floating player bar — fixed at bottom of viewport */}
      {isExpanded && (
        <div className="fixed bottom-0 inset-x-0 z-50" dir="rtl">
          <div className="bg-card/95 backdrop-blur-md border-t border-border shadow-2xl">

            {/* Seekable progress bar */}
            <div className="relative h-1 bg-muted">
              {/* Filled track */}
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-none"
                style={{ width: `${progress}%` }}
              />
              {/* Invisible range input for interaction */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                disabled={isLoading || !audioUrl}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
                dir="ltr"
                aria-label="تقديم أو ترجيع الصوت"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">

              {/* Waveform + article info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Animated bars */}
                <div className="flex items-end gap-0.75 h-5 shrink-0" aria-hidden="true">
                  {[12, 16, 10, 18, 12].map((maxH, i) => (
                    <div
                      key={i}
                      className="w-0.75 rounded-full bg-accent transition-all duration-300"
                      style={{
                        height: isPlaying ? `${maxH}px` : '4px',
                        opacity: isPlaying ? 1 : 0.35,
                        animation: isPlaying ? `tts-wave ${0.5 + i * 0.1}s ease-in-out ${i * 0.08}s infinite alternate` : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Title + time */}
                <div className="min-w-0">
                  {title && (
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                    {isLoading
                      ? 'جاري تحضير الصوت...'
                      : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                  </p>
                </div>
              </div>

              {/* Play / Pause / Loading button */}
              {isLoading ? (
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0"
                  title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Speed */}
              <Select
                value={playbackRate}
                onChange={(e) => handleRateChange(e.target.value)}
                options={speedOptions}
                className="w-auto text-xs shrink-0"
              />

              {/* Close */}
              <button
                type="button"
                onClick={handleStop}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                title="إغلاق المشغل"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Waveform keyframe animation */}
          <style>{`
            @keyframes tts-wave {
              from { transform: scaleY(0.4); }
              to   { transform: scaleY(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

export default TextToSpeech;
