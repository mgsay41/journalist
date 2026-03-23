'use client';

import { useState, useCallback, useRef, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
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
  const scripts = tmp.querySelectorAll('script, style');
  scripts.forEach((script) => script.remove());
  let text = tmp.textContent || tmp.innerText || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text;
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
        setIsExpanded(true);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(console.error);
        }
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      }
    } else {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [audioUrl, content, slug, title]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);

  const handleRateChange = useCallback((rate: string) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(rate);
    }
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

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return (
    <div className={className}>
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        preload="metadata"
      />

      {error && (
        <div className="text-xs text-red-500 mb-2">{error}</div>
      )}

      {!isExpanded && !isPlaying && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePlay}
          disabled={isLoading}
          title="استماع للمقال"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="mr-2">جاري التحضير...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="mr-2">استماع للمقال</span>
            </>
          )}
        </Button>
      )}

      {isExpanded && (
        <div className="flex flex-col gap-3 p-3 bg-muted/50 rounded-lg border border-border min-w-[300px]">
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePause}
                title="إيقاف مؤقت"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePlay}
                disabled={isLoading}
                title="تشغيل"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            )}

            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 accent-accent cursor-pointer"
              dir="ltr"
            />

            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[70px] text-left" dir="ltr">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStop}
              title="إيقاف"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">سرعة:</span>
            <Select
              value={playbackRate}
              onChange={(e) => handleRateChange(e.target.value)}
              options={speedOptions}
              className="w-auto text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TextToSpeech;
