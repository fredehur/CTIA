import React from 'react';
import { BrainIcon } from './icons/BrainIcon';

interface ExecutiveSummaryCardProps {
  summary: string | null;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({ summary, onGenerate, isGenerating }) => {
  if (summary) {
    return (
      <div className="mt-6 bg-card border border-border rounded-lg shadow-sm">
        <div className="p-3 flex justify-between items-center bg-surface border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Executive Summary</h3>
           <div className="flex items-center gap-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/50 text-green-300">
                <BrainIcon className="w-4 h-4" />
                <span>Final Report</span>
            </div>
        </div>
        <div 
            className="p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: summary.replace(/## (.*)/g, '<h2 class="font-semibold text-text-primary">$1</h2>').replace(/\* \*\*(.*)\*\*/g, '<br/><strong>$1</strong>').replace(/\* (.*)/g, '<li>$1</li>').replace(/(\r\n|\n|\r)/gm, "<br>") }}
        >
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex justify-center">
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2 px-6 py-2 bg-accent-pro hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent-pro"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Report...
          </>
        ) : (
          <>
            <BrainIcon className="w-5 h-5" />
            Generate Final Report
          </>
        )}
      </button>
    </div>
  );
};