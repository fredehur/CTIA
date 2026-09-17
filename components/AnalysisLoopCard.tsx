import React from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { BrainIcon } from './icons/BrainIcon';
import { LinkIcon } from './icons/LinkIcon';
import { MitreIcon } from './icons/MitreIcon';
import type { AnalysisLoop } from '../types';

interface AnalysisLoopCardProps {
  loop: AnalysisLoop;
  isPaused?: boolean;
  onProceed?: () => void;
  onStop?: () => void;
  editedQuery?: string;
  onQueryChange?: (query: string) => void;
  analystNotes?: string;
  onNotesChange?: (notes: string) => void;
}

const ModelInfo: React.FC<{ model: 'flash' | 'pro', status: AnalysisLoop['status'] }> = ({ model, status }) => {
  const isFlash = model === 'flash';
  const baseClasses = "flex items-center gap-2 text-xs font-semibold text-text-secondary";
  
  const statusText = status === 'thinking' ? 'Synthesizing' : isFlash ? 'Searching' : 'Synthesizing';
  
  const StatusChip: React.FC<{ status: AnalysisLoop['status'] }> = ({ status }) => (
    <div 
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-text-secondary`}
        style={{ backgroundColor: 'rgba(148, 161, 178, 0.16)'}}
    >
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-4">
        <div className={baseClasses}>
          {isFlash ? <SearchIcon className="w-4 h-4" /> : <BrainIcon className="w-4 h-4" />}
          <span className="font-mono">{isFlash ? `Gemini 2.5 Flash · ${statusText}`: `Gemini 2.5 Pro · ${statusText}`}</span>
        </div>
        <StatusChip status={status} />
    </div>
  );
};

const ConfidenceBadge: React.FC<{ score: 'Low' | 'Medium' | 'High' }> = ({ score }) => {
    const colorMap = {
        Low: 'text-yellow-400',
        Medium: 'text-sky-400',
        High: 'text-green-400',
    };
    return (
        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border ${colorMap[score]}`}>
            Confidence: {score}
        </div>
    );
};

export const AnalysisLoopCard: React.FC<AnalysisLoopCardProps> = ({ 
    loop, 
    isPaused = false, 
    onProceed, 
    onStop,
    editedQuery,
    onQueryChange,
    analystNotes,
    onNotesChange
}) => {
  const isFlash = loop.modelUsed === 'flash';
  const borderColor = isFlash ? 'border-accent-primary' : 'border-violet-700';

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden shadow-sm border-l-2 ${borderColor}`}>
      <div className="p-3 flex justify-between items-center bg-surface border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Loop {loop.id}</h3>
        <ModelInfo model={loop.modelUsed} status={loop.status} />
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Query</h4>
          <p className="text-sm text-text-secondary bg-surface p-3 rounded-md border border-border font-mono">{loop.query}</p>
        </div>

        {loop.findings && (
          <div>
            <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Findings</h4>
            <div className="text-sm text-text-primary bg-surface p-3 rounded-md border border-border max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
              {loop.status === 'searching' && !loop.findings.trim() ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-accent-primary"></div>
                  <span>Streaming results...</span>
                </div>
              ) : loop.findings}
            </div>
          </div>
        )}

        {loop.conclusion && (
          <div>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider">Conclusion</h4>
                {loop.confidenceScore && <ConfidenceBadge score={loop.confidenceScore} />}
            </div>
            <p className="text-sm text-text-primary bg-surface p-3 rounded-md border border-border">
              {loop.status === 'thinking' && !loop.conclusion.trim() ? (
                  <div className="flex items-center gap-2 text-text-secondary">
                      <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-accent-pro"></div>
                      <span>Streaming conclusion...</span>
                  </div>
              ) : loop.conclusion}
            </p>
          </div>
        )}
        
        {loop.mitreTechniques && loop.mitreTechniques.length > 0 && (
            <div>
                <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Identified MITRE ATT&CK® Techniques</h4>
                <div className="flex flex-wrap gap-2">
                    {loop.mitreTechniques.map(tech => (
                        <a href={`https://attack.mitre.org/techniques/${tech.id.replace('.','/')}`} target="_blank" rel="noopener noreferrer" key={tech.id} className="flex items-center gap-2 bg-surface text-text-secondary text-xs px-2 py-1 rounded-md border border-border hover:border-accent-primary hover:text-text-primary transition-colors">
                            <MitreIcon className="w-3 h-3 text-accent-primary" />
                            <span className="font-mono">{tech.id}</span>
                            <span>{tech.name}</span>
                        </a>
                    ))}
                </div>
            </div>
        )}
        
        {isPaused && loop.status === 'completed' && loop.modelUsed === 'pro' && (
          <div className="mt-4 p-4 bg-surface rounded-md border border-accent-primary/50 space-y-4">
            <p className="text-accent-primary font-semibold text-sm text-center">Human-in-the-Loop: Analyst Input Required</p>
            
            <div>
                <label htmlFor="editedQuery" className="block text-xs font-semibold text-text-secondary mb-1">Next Query (Editable)</label>
                <textarea
                    id="editedQuery"
                    value={editedQuery}
                    onChange={(e) => onQueryChange?.(e.target.value)}
                    rows={3}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors font-mono text-sm"
                />
            </div>
             <div>
                <label htmlFor="analystNotes" className="block text-xs font-semibold text-text-secondary mb-1">Add Analyst Notes (Optional)</label>
                <textarea
                    id="analystNotes"
                    value={analystNotes}
                    onChange={(e) => onNotesChange?.(e.target.value)}
                    rows={3}
                    placeholder="Provide additional context or findings for the next reasoning step..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors text-sm"
                />
            </div>

            <div className="flex gap-4 justify-end pt-2">
              <button onClick={onStop} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 bg-red-800 hover:bg-red-700 text-red-100">
                Stop Analysis
              </button>
              <button onClick={onProceed} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 bg-accent-primary hover:opacity-90 text-white">
                Proceed
              </button>
            </div>
          </div>
        )}
        
        {loop.sources.length > 0 && (
          <div>
            <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Sources</h4>
            <div className="space-y-1">
              {loop.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-text-secondary hover:text-accent-primary group"
                  title={source.title}
                >
                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium text-text-primary group-hover:underline truncate">{source.title}</span>
                  <span className="text-gray-500 truncate">{new URL(source.uri).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};