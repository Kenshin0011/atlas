import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from '@/types/speech';

type UseSpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
};

type UseSpeechRecognitionReturn = {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
};

export const useSpeechRecognition = ({
  lang = 'ja-JP',
  continuous = true,
  interimResults = true,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isActiveRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setError('このブラウザは音声認識に対応していません');
      return;
    }

    setIsSupported(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        isActiveRef.current = false;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('音声認識がサポートされていません');
      return;
    }

    try {
      setError(null);

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();

      // 設定
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      // イベントハンドラー
      recognition.onstart = () => {
        console.log('🎤 音声認識開始');
        isActiveRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // 新しく追加された結果のみを処理
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;

          // 空文字列やホワイトスペースのみの発話は無視
          if (!transcript || !transcript.trim()) {
            continue;
          }

          if (isFinal) {
            console.log('✅ 確定結果:', transcript);
          } else {
            console.log('💬 途中結果:', transcript);
          }

          onTranscript(transcript, isFinal);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          console.log('⏱️  無音検出、再起動します');
          return;
        }

        if (event.error === 'aborted') {
          console.log('⏹️  音声認識を停止しました');
          return;
        }

        console.error('❌ 音声認識エラー:', event.error);
        const errorMessage = `音声認識エラー: ${event.error}`;
        setError(errorMessage);
        setIsListening(false);
        onError?.(errorMessage);
      };

      recognition.onend = () => {
        console.log('🔚 音声認識終了');
        setIsListening(false);

        // 自動再起動（continuous モードでも定期的に終了するため）
        if (isActiveRef.current && recognitionRef.current) {
          console.log('🔄 自動再起動します');

          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }

          restartTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error('再起動エラー:', err);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      console.log('🎙️  音声認識を開始しました');
    } catch (err) {
      console.error('Recognition start error:', err);
      setError('音声認識の開始に失敗しました');
    }
  }, [isSupported, lang, continuous, interimResults, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isActiveRef.current = false;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
};
