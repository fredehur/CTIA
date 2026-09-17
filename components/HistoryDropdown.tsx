import React, { useState, useMemo, useEffect } from 'react';
import type { AnalysisHistoryRecord } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryDropdownProps {
  history: AnalysisHistoryRecord[];
  onLoad: (id: string) => void;
  onClear: () => void;
  disabled: boolean;
}

export const HistoryDropdown: React.FC<HistoryDropdownProps> = ({ history, onLoad, onClear, disabled }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = useMemo(() => {
    const uniqueCategories = new Set(history.map(h => h.categorization.category));
    return ['All', ...Array.from(uniqueCategories)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (categoryFilter === 'All') {
      return history;
    }
    return history.filter(h => h.categorization.category === categoryFilter);
  }, [history, categoryFilter]);

  const sortedHistory = useMemo(() => {
    // Create a mutable copy before sorting
    return [...filteredHistory].sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredHistory]);

  const handleLoad = () => {
    if (selectedId) {
      onLoad(selectedId);
    }
  };
  
  // Effect to manage the selectedId state when filters change or history updates
  useEffect(() => {
    // If the current selectedId is no longer in the filtered list, update it
    if (selectedId && !sortedHistory.some(h => h.id === selectedId)) {
      setSelectedId(sortedHistory.length > 0 ? sortedHistory[0].id : '');
    } else if (!selectedId && sortedHistory.length > 0) {
      // If nothing is selected, select the first item
      setSelectedId(sortedHistory[0].id);
    }
  }, [sortedHistory, selectedId]);

  if (history.length === 0) {
    return null;
  }
  
  const commonSelectClasses = "w-full bg-surface border h-9 border-border rounded-md px-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Analysis History</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Category Filter */}
        <div className="lg:col-span-1">
          <label htmlFor="categoryFilter" className="block text-sm font-semibold text-text-secondary mb-1">Filter by Category</label>
          <select 
            id="categoryFilter" 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)} 
            disabled={disabled} 
            className={commonSelectClasses}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* History Selector */}
        <div className="md:col-span-2 lg:col-span-3">
           <label htmlFor="historySelector" className="block text-sm font-semibold text-text-secondary mb-1">Select a Past Analysis</label>
          <select 
            id="historySelector" 
            value={selectedId} 
            onChange={e => setSelectedId(e.target.value)} 
            disabled={disabled || sortedHistory.length === 0} 
            className={commonSelectClasses}
          >
            {sortedHistory.map(h => (
              <option key={h.id} value={h.id}>
                {`${new Date(h.timestamp).toLocaleString()} - ${h.scenario.threatActor.substring(0,25)} - ${h.scenario.target.substring(0,30)}`}
              </option>
            ))}
            {sortedHistory.length === 0 && <option disabled>No results for this filter</option>}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-self-end w-full lg:col-span-1">
          <button 
            onClick={handleLoad} 
            disabled={disabled || !selectedId} 
            className="flex h-9 items-center justify-center gap-2 px-4 bg-accent-primary hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent-primary flex-grow"
          >
            <SearchIcon className="w-4 h-4" />
            Load
          </button>
          <button 
            onClick={onClear} 
            disabled={disabled} 
            title="Clear History"
            className="p-2 h-9 flex items-center justify-center bg-red-800 hover:bg-red-700 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-red-500"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
