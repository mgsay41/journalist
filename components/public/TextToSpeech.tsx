'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface TextToSpeechProps {
  content: string;
  title?: string;
  className?: string;
}

const voiceOptions = [
  { value: '0.75', label: 'بطيء جداً' },
  { value: '1', label: 'عادي' },
  { value: '1.25', label: 'سريع' },
  { value: '1.5', label: 'سريع جداً' },
];

export function TextToSpeech({ content, title, className = '' }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [rate, setRate] = useState('1');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);

  // Extract plain text from HTML content
  const extractText = useCallback((html: string): string => {
    // Create a temporary div element
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // Remove script and style elements
    const scripts = tmp.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());

    // Get text content
    let text = tmp.textContent || tmp.innerText || '';

    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }, []);

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      // Load voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Try to find an Arabic voice
        const arabicVoice = availableVoices.find(v => v.lang.startsWith('ar'));
        if (arabicVoice) {
          setSelectedVoice(arabicVoice.name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setIsSupported(false);
    }

    // Cleanup
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak function
  const speak = useCallback(() => {
    if (!isSupported) return;

    const text = title ? `${title}. ${extractText(content)}` : extractText(content);
    if (!text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Set voice
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }

    // Set rate
    utterance.rate = parseFloat(rate);

    // Set language to Arabic
    utterance.lang = 'ar-SA';

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  }, [content, title, isSupported, extractText, rate, selectedVoice, voices]);

  // Pause function
  const pause = useCallback(() => {
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  // Resume function
  const resume = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Stop function
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isPlaying ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={isPaused ? resume : pause}
            title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
          >
            {isPaused ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={stop}
            title="إيقاف"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </Button>
          <Select
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            options={voiceOptions}
            className="w-auto"
          />
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={speak}
          title="استماع للمقال"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="mr-2">استماع</span>
        </Button>
      )}
    </div>
  );
}

export default TextToSpeech;
