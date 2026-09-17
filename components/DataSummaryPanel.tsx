import React from 'react';
import type { BreachDataResults, DataPointResult } from '../types';
import { NumberIcon } from './icons/NumberIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { InfoIcon } from './icons/InfoIcon';

interface DataSummaryPanelProps {
  results: BreachDataResults;
  dataPoints: { id: keyof BreachDataResults; title: string; description: string }[];
}

const SummaryCard: React.FC<{ title: string; result: DataPointResult; description: string }> = ({ title, result, description }) => {
  const { statistic, statisticStatus } = result;

  const renderContent = () => {
    switch (statisticStatus) {
      case 'loading':
        return (
          <div className="h-10 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-10 flex items-center justify-center" title="Failed to extract statistic">
            <ErrorIcon className="w-8 h-8 text-red-500" />
          </div>
        );
      case 'completed':
        return <span className="truncate" title={statistic || 'N/A'}>{statistic}</span>;
      default:
        return <span className="text-border">-</span>;
    }
  };

  return (
    <div className="bg-surface p-3 rounded-lg border border-border text-center flex flex-col justify-between">
      <div className="flex items-center justify-center gap-1">
        <h4 className="text-xs sm:text-sm font-semibold text-text-secondary truncate" title={title}>{title}</h4>
        <div title={description} className="cursor-help">
            <InfoIcon className="w-3 h-3 text-text-secondary/50 flex-shrink-0" />
        </div>
      </div>
      <div className="text-3xl lg:text-4xl font-bold text-accent-primary my-2">
        {renderContent()}
      </div>
    </div>
  );
};


export const DataSummaryPanel: React.FC<DataSummaryPanelProps> = ({ results, dataPoints }) => {
  return (
    <div className="bg-card border border-border p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <NumberIcon className="w-6 h-6 text-accent-primary" />
        <h3 className="text-lg font-semibold text-text-primary">Key Statistics at a Glance</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {dataPoints.map(dp => (
          <SummaryCard
            key={dp.id}
            title={dp.title}
            description={dp.description}
            result={results[dp.id]}
          />
        ))}
      </div>
    </div>
  );
};
