/**
 * SpeechRecognitionIndicator Component
 * 音声認識中のステータスとリアルタイム文字起こしを表示
 */

'use client';

type SpeechRecognitionIndicatorProps = {
  isListening: boolean;
  interimTranscript: string;
};

export const SpeechRecognitionIndicator = ({
  isListening,
  interimTranscript,
}: SpeechRecognitionIndicatorProps) => {
  if (!isListening) return null;

  return (
    <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
          <title>録音中</title>
          <circle cx="10" cy="10" r="8" />
        </svg>
        <span className="text-sm font-semibold">音声認識中...</span>
      </div>
      <div className="bg-white/20 rounded px-3 py-2 min-h-[40px] flex items-center">
        <p className="text-white text-base leading-relaxed">
          {interimTranscript || '話してください...'}
        </p>
      </div>
    </div>
  );
};
