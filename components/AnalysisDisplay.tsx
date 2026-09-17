import React from 'react';
import { AnalysisLoopCard } from './AnalysisLoopCard';
import type { AnalysisLoop } from '../types';

interface AnalysisDisplayProps {
  loops: AnalysisLoop[];
  pausedLoopId: number | null;
  onProceed?: () => void;
  onStop?: () => void;
  editedQuery?: string;
  onQueryChange?: (query: string) => void;
  analystNotes?: string;
  onNotesChange?: (notes: string) => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
    loops, 
    pausedLoopId, 
    onProceed, 
    onStop,
    editedQuery,
    onQueryChange,
    analystNotes,
    onNotesChange
}) => {
  if (loops.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-text-primary border-b border-border pb-2">Intelligence Analysis Log</h2>
      <div className="space-y-4">
        {loops.map((loop) => (
          <AnalysisLoopCard
            key={loop.id}
            loop={loop}
            isPaused={loop.id === pausedLoopId}
            onProceed={onProceed}
            onStop={onStop}
            editedQuery={editedQuery}
            onQueryChange={onQueryChange}
            analystNotes={analystNotes}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
};