import { useState } from 'react';

interface Choice {
  text: string;
  description?: string;
}

interface ChoiceOptionsProps {
  choices: Choice[];
  onSelect: (choice: string) => void;
}

export function ChoiceOptions({ choices, onSelect }: ChoiceOptionsProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const handleSelect = (choice: string) => {
    if (selectedChoice) return; // Prevent selection if already chosen
    setSelectedChoice(choice);
    onSelect(choice);
  };

  if (!choices?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {choices.map((choice, index) => (
        <button
          key={index}
          onClick={() => handleSelect(choice.text)}
          disabled={selectedChoice !== null}
          className={`px-4 py-2 rounded-lg text-sm transition-colors
            ${selectedChoice === choice.text 
              ? 'bg-space-accent text-white cursor-default'
              : selectedChoice !== null
                ? 'bg-space-darker text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-space-darker text-gray-200 hover:bg-space-primary hover:text-white cursor-pointer'
            }`}
          title={choice.description}
        >
          {choice.text}
        </button>
      ))}
    </div>
  );
} 