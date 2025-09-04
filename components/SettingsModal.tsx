import React from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | undefined;
  onVoiceChange: (voiceURI: string) => void;
  speechRate: number;
  onRateChange: (rate: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  voices,
  selectedVoiceURI,
  onVoiceChange,
  speechRate,
  onRateChange
}) => {
  if (!isOpen) return null;

  const groupedVoices = voices.reduce((acc, voice) => {
    const lang = voice.lang;
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 relative shadow-2xl shadow-cyan-500/10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          aria-label="Close settings"
        >
          <CloseIcon />
        </button>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Voice Settings</h2>

          <div className="space-y-2">
            <label htmlFor="voice-select" className="block text-sm font-medium text-zinc-300">
              Vandvik's Voice
            </label>
            <select
              id="voice-select"
              value={selectedVoiceURI || ''}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              {Object.entries(groupedVoices).map(([lang, voiceGroup]) => (
                <optgroup key={lang} label={lang}>
                  {voiceGroup.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="rate-slider" className="block text-sm font-medium text-zinc-300">
              Speech Rate: <span className="font-bold text-white">{speechRate.toFixed(1)}x</span>
            </label>
            <input
              id="rate-slider"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
