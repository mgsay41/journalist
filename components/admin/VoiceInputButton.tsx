'use client';

/**
 * Voice Input Button Component
 * Provides speech-to-text functionality for mobile devices
 */

import { useState, useRef, useEffect } from 'react';
import { TouchButton } from '@/components/ui/TouchButton';
import { useHaptic } from '@/lib/mobile/haptic-feedback';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language?: string;      // Default: 'ar-SA' for Arabic
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  continuous?: boolean;   // Keep listening until stopped
}

export function VoiceInputButton({
  onTranscript,
  language = 'ar-SA',
  disabled = false,
  className = '',
  variant = 'ghost',
  continuous = false,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const haptic = useHaptic();

  // Check for browser support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      const timer = setTimeout(() => { setIsSupported(false); }, 0);
      return () => clearTimeout(timer);
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      haptic.medium();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      haptic.success();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      haptic.error();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, onTranscript, haptic]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      haptic.light();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        haptic.error();
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <TouchButton
      type="button"
      variant={variant}
      onClick={toggleListening}
      disabled={disabled}
      haptic
      hapticType="selection"
      className={className}
      icon={
        <svg
          className={`w-5 h-5 ${isListening ? 'text-danger animate-pulse' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isListening ? (
            // Stop icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            // Microphone icon
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </>
          )}
        </svg>
      }
    >
      {isListening ? 'جاري الاستماع...' : 'إملاء صوتي'}
    </TouchButton>
  );
}

export default VoiceInputButton;

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex?: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  }
}
