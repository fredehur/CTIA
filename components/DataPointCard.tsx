import React from 'react';
import type { DataPointResult } from '../types';
import { LinkIcon } from './icons/LinkIcon';
import { InfoIcon } from './icons/InfoIcon';

interface DataPointCardProps {
  title: string;
  icon: React.ReactNode;
  result: DataPointResult;
  description: string;
}

export const DataPointCard: React.FC<DataPointCardProps> = ({ title, icon, result, description }) => {
  const { status, data, sources, error } = result;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col min-h-[300px]">
      <div className="p-3 flex items-center gap-3 bg-surface border-b border-border">
        {icon}
        <h3 className="text-sm font-semibold text-text-primary flex-grow">{title}</h3>
        <div title={description} className="cursor-help">
            <InfoIcon className="w-4 h-4 text-text-secondary" />
        </div>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">
        {status === 'loading' && (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <svg className="animate-spin mr-3 h-5 w-5 text-accent-primary" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Searching...</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-center h-full text-red-400">
            <p className="text-sm text-center">
              <strong className="block mb-1">Request Failed</strong>
              <span className="text-red-500">{error}</span>
            </p>
          </div>
        )}
         {status === 'idle' && (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <p className="text-sm italic">Awaiting search...</p>
          </div>
        )}
        {status === 'completed' && (
          <p className="text-sm text-text-primary whitespace-pre-wrap font-sans">{data || 'No specific data found.'}</p>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="border-t border-border p-3">
          <h4 className="font-semibold text-text-secondary text-xs mb-2 uppercase">Sources:</h4>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-surface text-accent-primary hover:text-white hover:bg-accent-primary px-2 py-1 rounded-md border border-border transition-colors"
                title={source.title}
              >
                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-48">{source.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
