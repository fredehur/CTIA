import React from 'react';
import { BrainIcon } from './icons/BrainIcon';

interface CategorizationCardProps {
  actorName: string;
  category: string | null;
  justification: string | null;
  isLoading?: boolean;
}

export const CategorizationCard: React.FC<CategorizationCardProps> = ({ actorName, category, justification, isLoading }) => {
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center animate-fade-in space-y-2">
          <svg className="animate-spin h-6 w-6 text-accent-pro mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-text-secondary text-sm">Categorizing threat actor...</p>
        </div>
      );
    }

    if (category && justification) {
      return (
        <div className="space-y-3 animate-fade-in">
            <div className='space-y-1'>
                <p className="text-sm text-text-secondary">Threat Actor</p>
                <p className="font-semibold text-text-primary">{actorName}</p>
            </div>
             <div className='space-y-1'>
                <p className="text-sm text-text-secondary">Categorization</p>
                <div className="inline-block px-3 py-1 bg-transparent rounded-full text-text-primary text-sm font-medium border border-text-secondary">
                  {category}
                </div>
            </div>
            <div className='space-y-1'>
                <p className="text-sm text-text-secondary">Justification</p>
                <p className="text-sm text-text-primary leading-relaxed">
                {justification}
                </p>
            </div>
        </div>
      );
    }

    return (
      <div className="text-center text-text-secondary text-sm">
          Categorization will appear here after starting the analysis.
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col">
      <div className="p-3 flex justify-between items-center bg-surface border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-text-primary">Threat Actor Assessment</h3>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
            <BrainIcon className="w-4 h-4" />
            <span>Initial Analysis</span>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-center">
        {renderContent()}
      </div>
    </div>
  );
};