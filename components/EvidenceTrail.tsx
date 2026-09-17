import React from 'react';
import type { Source } from '../types';
import { LinkIcon } from './icons/LinkIcon';

interface EvidenceTrailProps {
  sources: Source[];
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ sources }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="pb-2 border-b border-border flex-shrink-0">
        <h3 className="text-lg font-semibold text-text-primary">Evidence Trail</h3>
      </div>
      <div className="py-4 overflow-y-auto flex-grow">
        {sources.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-secondary text-center text-sm">
                No sources collected yet. Evidence will appear here as the analysis progresses.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sources.map((source, index) => (
              <li key={source.uri} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group p-2 -m-2 rounded-md hover:bg-card transition-colors"
                  title={`${source.title}\n${source.snippet || ''}`}
                >
                  <div className="flex items-start gap-3">
                    <LinkIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary group-hover:text-accent-primary transition-colors" />
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold truncate text-text-primary group-hover:text-accent-primary group-hover:underline">{source.title || source.uri}</p>
                      {source.snippet && (
                        <p className="text-xs text-text-secondary mt-1 italic">
                          &ldquo;{source.snippet}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
