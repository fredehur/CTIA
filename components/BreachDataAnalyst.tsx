import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SearchIcon } from './icons/SearchIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { DataPointCard } from './DataPointCard';
import { DataSummaryPanel } from './DataSummaryPanel';
import { getBreachDataPoint, extractKeyStatistic } from '../services/geminiService';
import type { DataPointType, BreachDataResults, DataPointResult, SavedBreachData } from '../types';

const initialDataPointState: DataPointResult = {
  status: 'idle',
  data: '',
  sources: [],
  statistic: null,
  statisticStatus: 'idle',
};

const initialResultsState: BreachDataResults = {
  dataLeaksActor: { ...initialDataPointState },
  fbiIncidentsActor: { ...initialDataPointState },
  dataLeaksModus: { ...initialDataPointState },
  fbiIncidentsModus: { ...initialDataPointState },
  ctiicIncidents: { ...initialDataPointState },
  companiesExposed: { ...initialDataPointState },
  organizationsInScope: { ...initialDataPointState },
};

const DATA_POINTS: { id: DataPointType; title: string; description: string }[] = [
    { id: 'dataLeaksActor', title: 'Data Leaks (Actor)', description: 'Searches for data leak incidents attributed specifically to the threat actor.' },
    { id: 'fbiIncidentsActor', title: 'FBI Incidents (Actor)', description: 'Searches for official FBI reports specifically mentioning the threat actor.' },
    { id: 'dataLeaksModus', title: 'Data Leaks (Modus)', description: 'Searches for data leaks related to the broader modus operandi (e.g., Ransomware).' },
    { id: 'fbiIncidentsModus', title: 'FBI Incidents (Modus)', description: 'Searches for official FBI reports related to the broader modus operandi.' },
    { id: 'ctiicIncidents', title: 'CTIIC Incidents (Modus)', description: 'Searches CTIIC publications for the broader modus operandi, as specific actor mentions are rare.' },
    { id: 'companiesExposed', title: 'Companies Exposed (Modus)', description: 'Lists companies publicly identified as victims of the broader modus operandi.' },
    { id: 'organizationsInScope', title: 'Total Organizations in Scope', description: 'Finds the total number of organizations matching a description (e.g., "US companies with >50 employees"). This provides context on the potential target pool size.' },
];


const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [{ value: 'all', label: 'All Years' }];
    for (let i = 0; i < 10; i++) {
        const year = currentYear - i;
        years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
};

const LabeledInput: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string}> = ({label, value, onChange, placeholder}) => (
    <div>
        <label className="block text-sm font-semibold text-text-secondary mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-surface border h-9 border-border rounded-md px-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors"
        />
    </div>
);


export const BreachDataAnalyst: React.FC = () => {
    const [threatActor, setThreatActor] = useState<string>('Wizard Spider');
    const [modusOperandi, setModusOperandi] = useState<string>('Conti Ransomware');
    const [scopeQuery, setScopeQuery] = useState<string>('US Companies with >50 employees');
    const [searchYear, setSearchYear] = useState<string>('all');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<BreachDataResults>(initialResultsState);
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    const yearOptions = generateYearOptions();

    const handleSearch = async () => {
        if (!threatActor.trim() || !modusOperandi.trim()) return;
        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        const loadingState: BreachDataResults = {
            dataLeaksActor: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            fbiIncidentsActor: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            dataLeaksModus: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            fbiIncidentsModus: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            ctiicIncidents: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            companiesExposed: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
            organizationsInScope: { ...initialDataPointState, status: 'loading', statisticStatus: 'loading' },
        };
        setResults(loadingState);

        const dataPromises = DATA_POINTS.map(dp => getBreachDataPoint(threatActor, modusOperandi, dp.id, searchYear, scopeQuery));
        const settledDataResults = await Promise.allSettled(dataPromises);

        const initialResultsWithData = { ...loadingState };
        settledDataResults.forEach((res, index) => {
            const dpId = DATA_POINTS[index].id;
            if (res.status === 'fulfilled') {
                initialResultsWithData[dpId] = {
                    ...initialResultsWithData[dpId],
                    status: 'completed',
                    data: res.value.text,
                    sources: res.value.sources,
                };
            } else {
                initialResultsWithData[dpId] = {
                    ...initialResultsWithData[dpId],
                    status: 'error',
                    statisticStatus: 'error',
                    error: res.reason instanceof Error ? res.reason.message : 'An unknown error occurred',
                };
            }
        });
        setResults(initialResultsWithData);

        const statPromises = DATA_POINTS.map(dp => {
            const resultData = initialResultsWithData[dp.id];
            if (resultData.status === 'completed' && resultData.data) {
                return extractKeyStatistic(threatActor, modusOperandi, dp.title, resultData.data, searchYear, scopeQuery);
            }
            return Promise.resolve('N/A');
        });

        const settledStatResults = await Promise.allSettled(statPromises);
        
        let finalResultsWithStats: BreachDataResults = initialResultsWithData;
        setResults(currentResults => {
            const finalResults = { ...currentResults };
            settledStatResults.forEach((res, index) => {
                const dpId = DATA_POINTS[index].id;
                if (finalResults[dpId].status !== 'error') {
                     if (res.status === 'fulfilled') {
                        finalResults[dpId].statistic = res.value;
                        finalResults[dpId].statisticStatus = 'completed';
                    } else {
                        finalResults[dpId].statistic = 'Error';
                        finalResults[dpId].statisticStatus = 'error';
                    }
                }
            });
            finalResultsWithStats = finalResults;
            return finalResults;
        });
        
        setIsLoading(false);

        const newRecord: SavedBreachData = {
          id: uuidv4(),
          timestamp: Date.now(),
          threatActor,
          modusOperandi,
          results: finalResultsWithStats,
        };
        try {
            const existing = JSON.parse(localStorage.getItem('ctiBreachDataSearches') || '[]');
            existing.unshift(newRecord);
            localStorage.setItem('ctiBreachDataSearches', JSON.stringify(existing.slice(0, 50))); // limit to 50
        } catch (e) { console.error('Failed to save breach data search', e); }

    };


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-text-primary">Breach Data Analyst</h2>
            <div className="bg-card border border-border p-4 rounded-lg">
                <p className="text-sm text-text-secondary mb-4">
                    Enter a threat actor and their associated modus operandi to gather statistical data and incident reports.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                    <div className="md:col-span-2">
                        <LabeledInput
                            label="Threat Actor (Specific)"
                            value={threatActor}
                            onChange={(e) => setThreatActor(e.target.value)}
                            placeholder="e.g., Wizard Spider"
                        />
                    </div>
                     <div className="md:col-span-2">
                        <LabeledInput
                            label="Modus Operandi (Broad)"
                            value={modusOperandi}
                            onChange={(e) => setModusOperandi(e.target.value)}
                            placeholder="e.g., Conti Ransomware"
                        />
                    </div>
                     <div className="md:col-span-2">
                        <LabeledInput
                            label="Target Scope"
                            value={scopeQuery}
                            onChange={(e) => setScopeQuery(e.target.value)}
                            placeholder="e.g., US companies >50 employees"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-semibold text-text-secondary mb-1">Year</label>
                        <select
                            value={searchYear}
                            onChange={(e) => setSearchYear(e.target.value)}
                            className="w-full h-9 bg-surface border border-border rounded-md px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors"
                        >
                            {yearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !threatActor.trim() || !modusOperandi.trim()}
                        className="md:col-span-1 h-9 flex items-center justify-center gap-2 px-6 bg-accent-primary hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent-primary"
                    >
                         {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Searching...
                            </>
                        ) : (
                            <>
                                <SearchIcon className="w-5 h-5" />
                                Search
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {hasSearched && <DataSummaryPanel results={results} dataPoints={DATA_POINTS} />}

            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            
            {hasSearched && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {DATA_POINTS.map(dp => (
                        <DataPointCard 
                            key={dp.id}
                            title={dp.title}
                            description={dp.description}
                            icon={<ChartBarIcon className="w-5 h-5 text-accent-primary" />}
                            result={results[dp.id]}
                        />
                    ))}
                    {/* Add an extra empty card to fill the last row on 2-column layout */}
                    {DATA_POINTS.length % 2 !== 0 && <div className="hidden md:block lg:hidden"></div>}
                </div>
            )}
        </div>
    );
};
