'use client';

import { useState, useCallback, useRef, useEffect, ChangeEvent } from 'react';

interface TextToSpeechProps {
  content: string;
  title?: string;
  slug: string;
  className?: string;
}

const SPEED_STEPS = ['0.75', '1', '1.25', '1.5'] as const;

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
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [playbackRate, setPlaybackRate] = useState('1');
  const [error, setError]           = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';
  }, []);

  const handlePlay = useCallback(async () => {
    setError(null);

    if (!audioUrl) {
      setIsLoading(true);
      setIsExpanded(true);
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
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      }
    } else {
      setIsExpanded(true);
      audioRef.current?.play().catch(console.error);
    }
  }, [audioUrl, content, slug, title]);

  const handlePause = useCallback(() => audioRef.current?.pause(), []);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const cycleSpeed = useCallback(() => {
    const next = SPEED_STEPS[(SPEED_STEPS.indexOf(playbackRate as typeof SPEED_STEPS[number]) + 1) % SPEED_STEPS.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = parseFloat(next);
  }, [playbackRate]);

  const handleStop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setCurrentTime(0);
    setIsPlaying(false);
    setIsExpanded(false);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = parseFloat(playbackRate);
          }
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        preload="metadata"
      />

      {/* Trigger button */}
      {!isExpanded && (
        <div className={className}>
          {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
          <button
            type="button"
            onClick={handlePlay}
            title="استماع للمقال"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>استماع</span>
          </button>
        </div>
      )}

      {/* Floating player */}
      {isExpanded && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[320px]" dir="rtl">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

            {/* Progress bar */}
            <div className="relative h-1 bg-muted group cursor-pointer">
              {/* Track fill */}
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-none"
                style={{ width: `${progress}%` }}
              />
              {/* Knob (visible on hover) */}
              {!isLoading && duration > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full scale-0 group-hover:scale-100 transition-transform shadow-sm"
                  style={{ left: `${progress}%` }}
                />
              )}
              {/* Invisible range input */}
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
            <div className="flex items-center gap-2 px-3 py-2.5">

              {/* Waveform (playing) / loader / speaker icon */}
              {isLoading ? (
                <svg className="w-4 h-4 shrink-0 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <div className="flex items-end gap-px h-4 shrink-0" aria-hidden="true">
                  {[8, 14, 10, 16, 8].map((maxH, i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full bg-accent"
                      style={{
                        height: isPlaying ? `${maxH}px` : '4px',
                        opacity: isPlaying ? 1 : 0.3,
                        transition: 'height 0.2s ease, opacity 0.2s ease',
                        animation: isPlaying ? `tts-bar ${0.5 + i * 0.07}s ease-in-out ${i * 0.06}s infinite alternate` : 'none',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Time */}
              <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                {isLoading ? '···' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
              </span>

              <div className="flex-1" />

              {/* Speed cycle button */}
              <button
                type="button"
                onClick={cycleSpeed}
                disabled={isLoading}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors tabular-nums min-w-[34px] text-center disabled:opacity-40"
                title="تغيير السرعة"
              >
                {playbackRate === '1' ? '1×' : `${playbackRate}×`}
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={isLoading}
                className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isLoading ? (
                  <span className="w-3 h-3 border-2 border-accent-foreground/40 border-t-accent-foreground rounded-full animate-spin" />
                ) : isPlaying ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleStop}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="إغلاق"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <style>{`
            @keyframes tts-bar {
              from { transform: scaleY(0.5); }
              to   { transform: scaleY(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

export default TextToSpeech;
