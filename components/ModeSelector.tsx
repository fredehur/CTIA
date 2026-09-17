import React from 'react';

interface ModeSelectorProps {
  mode: 'automatic' | 'manual';
  setMode: (mode: 'automatic' | 'manual') => void;
  disabled: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode, disabled }) => {
  const getButtonClasses = (buttonMode: 'automatic' | 'manual') => {
    const isActive = mode === buttonMode;
    return `px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary w-full border ${
      isActive ? 'border-text-secondary text-text-primary bg-surface' : 'border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  return (
    <div className="bg-card border border-border p-4 rounded-lg h-full">
       <h3 className="text-sm font-semibold text-text-primary mb-3 text-center">Analysis Mode</h3>
      <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
        <button
          onClick={() => setMode('automatic')}
          className={`${getButtonClasses('automatic')}`}
          disabled={disabled}
        >
          Fully Automatic
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`${getButtonClasses('manual')}`}
          disabled={disabled}
        >
          Human-in-the-Loop
        </button>
      </div>
      <p className="text-xs text-text-secondary mt-3 text-center">
        {mode === 'automatic'
          ? 'AI runs the full analysis autonomously.'
          : 'AI pauses for your approval at key steps.'}
      </p>
    </div>
  );
};