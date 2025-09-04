import React from 'react';

interface SuggestionChipProps {
  text: string;
  onClick: (text: string) => void;
  disabled?: boolean;
}

export const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick, disabled }) => {
  return (
    <button
      onClick={() => onClick(text)}
      disabled={disabled}
      className="px-3 py-1.5 bg-transparent text-zinc-300 text-sm rounded-full border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
};