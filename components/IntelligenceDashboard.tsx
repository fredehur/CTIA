import React, { useState } from 'react';
import type { IntelligenceDashboardData, Source, CyberThreat, CriticalVulnerability, GeopoliticalEvent } from '../types';
import { generateIntelligenceDashboardData, generateBooleanQuery } from '../services/geminiService';
import { GlobeIcon } from './icons/GlobeIcon';
import { LinkIcon } from './icons/LinkIcon';
import { BrainIcon } from './icons/BrainIcon';
import { FlagIcon } from './icons/FlagIcon';
import { CheckIcon } from './icons/CheckIcon';
import { TagIcon } from './icons/TagIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';

const SECTOR_OPTIONS = ['All Sectors', 'Financial', 'Healthcare', 'Government', 'Energy', 'Technology', 'Manufacturing', 'Retail'];
const TIME_PERIOD_OPTIONS = [
    { value: 'last_3_days', label: '1-3 Days' },
    { value: 'last_10_days', label: '10 Days' },
    { value: 'last_month', label: '1 Month' },
    { value: 'last_3_months', label: '3 Months' },
];

const SOURCE_OPTIONS = [
    'Cybersecurity News',
    'Vendor CTI Reports',
    'Government Alerts',
    'Social Media Feeds',
    'Vulnerability Databases',
    'Blogs',
    'Forums',
    'Dark Web',
    'Incident Response Reports',
    'Academic Research',
    'Threat Feeds',
    'Malware Analysis Reports',
];


const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-surface rounded-md ${className}`}></div>
);

const Lane: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-card border border-border rounded-lg flex flex-col min-h-[600px]">
        <header className="p-4 flex items-center gap-3 border-b border-border bg-surface/50">
            {icon}
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        </header>
        <div className="p-4 space-y-4 overflow-y-auto">
            {children}
        </div>
    </div>
);

const ThreatCard: React.FC<{ threat: CyberThreat }> = ({ threat }) => (
    <div className="bg-surface p-4 rounded-lg border border-border">
        <h4 className="font-bold text-base text-accent-primary">{threat.title}</h4>
        <p className="text-sm text-text-secondary mt-2">{threat.summary}</p>
        <div className="mt-3 pt-3 border-t border-border/50 text-xs space-y-1">
            <p><strong className="text-text-secondary font-semibold">Actors:</strong> {threat.actorsInvolved.join(', ') || 'N/A'}</p>
            <p><strong className="text-text-secondary font-semibold">Sectors:</strong> {threat.targetSectors.join(', ') || 'N/A'}</p>
        </div>
    </div>
);

const VulnerabilityCard: React.FC<{ cve: CriticalVulnerability }> = ({ cve }) => {
    const scoreValue = typeof cve.cvssScore === 'object' && cve.cvssScore !== null ? cve.cvssScore.score : cve.cvssScore;
    const scoreAsNumber = typeof scoreValue === 'number' ? scoreValue : 0;

    const scoreColor = scoreAsNumber >= 9.0 ? 'text-red-400' : scoreAsNumber >= 7.0 ? 'text-orange-400' : 'text-yellow-400';
    return (
        <div className="bg-surface p-3 rounded-lg border border-border">
            <div className="flex justify-between items-start">
                <a href={cve.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-accent-primary hover:underline font-mono">{cve.cveId}</a>
                <span className={`font-bold text-lg ${scoreColor}`}>{scoreAsNumber.toFixed(1)}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">{cve.description}</p>
        </div>
    );
};

const GeopoliticalCard: React.FC<{ event: GeopoliticalEvent }> = ({ event }) => (
    <div className="bg-surface p-4 rounded-lg border border-border">
        <h4 className="font-bold text-base text-accent-pro">{event.region}</h4>
        <p className="text-sm text-text-secondary mt-2">{event.eventSummary}</p>
        <p className="text-sm text-text-primary mt-3 pt-3 border-t border-border/50 italic">
            <strong>Cyber Implication:</strong> {event.cyberImplication}
        </p>
    </div>
);

export const IntelligenceDashboard: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<IntelligenceDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [sector, setSector] = useState<string>('all');
    const [timePeriod, setTimePeriod] = useState<string>('last_3_days');
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [booleanQuery, setBooleanQuery] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState<string>('');
    const [naturalLanguageQuery, setNaturalLanguageQuery] = useState<string>('');
    const [isGeneratingQuery, setIsGeneratingQuery] = useState<boolean>(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setDashboardData(null);
        setTags([]);
        try {
            const data = await generateIntelligenceDashboardData(sector, timePeriod, selectedSources.join(', '), booleanQuery);
            setDashboardData(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateBooleanQuery = async () => {
        if (!naturalLanguageQuery.trim()) return;
        setIsGeneratingQuery(true);
        try {
            const generatedQuery = await generateBooleanQuery(naturalLanguageQuery);
            setBooleanQuery(generatedQuery);
        } catch (err) {
            console.error(err);
            // In a real app, we might set an error state to show in the UI.
        } finally {
            setIsGeneratingQuery(false);
        }
    };

    const handleSourceToggle = (source: string) => {
        setSelectedSources(prev => 
            prev.includes(source) 
                ? prev.filter(s => s !== source) 
                : [...prev, source]
        );
    };

    const appendToQuery = (text: string) => {
        setBooleanQuery(prev => `${prev}${prev ? ' ' : ''}${text}`);
    };
    
    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags(prev => [...prev, trimmedTag]);
        }
        setTagInput('');
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Lane title="Cyber Intelligence" icon={<BrainIcon className="w-6 h-6 text-accent-primary" />}>
                        <h4 className="font-semibold text-text-secondary">Key Threats</h4>
                        <SkeletonLoader className="h-32" />
                        <SkeletonLoader className="h-32" />
                        <h4 className="font-semibold text-text-secondary pt-4">Emerging Vulnerabilities</h4>
                        <SkeletonLoader className="h-20" />
                        <SkeletonLoader className="h-20" />
                    </Lane>
                     <Lane title="Geopolitical Intelligence" icon={<FlagIcon className="w-6 h-6 text-accent-pro" />}>
                        <SkeletonLoader className="h-40" />
                        <SkeletonLoader className="h-40" />
                    </Lane>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-10 bg-card rounded-lg border border-red-700/50">
                    <p className="text-red-400 font-semibold">Failed to generate dashboard</p>
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
            );
        }

        if (dashboardData) {
            return (
                 <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Lane title="Cyber Intelligence" icon={<BrainIcon className="w-6 h-6 text-accent-primary" />}>
                            <h4 className="font-semibold text-text-secondary">Key Threats</h4>
                            {dashboardData.cyberIntelligence.keyThreats.map((threat, i) => <ThreatCard key={i} threat={threat} />)}
                            
                            <h4 className="font-semibold text-text-secondary pt-4">Emerging Vulnerabilities</h4>
                            {dashboardData.cyberIntelligence.emergingVulnerabilities.map(cve => <VulnerabilityCard key={cve.cveId} cve={cve} />)}
                        </Lane>

                        <Lane title="Geopolitical Intelligence" icon={<FlagIcon className="w-6 h-6 text-accent-pro" />}>
                           {dashboardData.geopoliticalIntelligence.keyEvents.map((event, i) => <GeopoliticalCard key={i} event={event} />)}
                        </Lane>
                    </div>
                     <div className="bg-card border border-border rounded-lg p-6">
                         <h3 className="text-lg font-bold text-text-primary mb-4">Sources</h3>
                         <div className="flex flex-wrap gap-2">
                            {dashboardData.sources.map((source, index) => (
                                <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" 
                                    className="flex items-center gap-1.5 text-xs bg-surface text-accent-primary hover:text-text-primary hover:bg-border px-2 py-1 rounded-md border border-border transition-colors"
                                    title={source.title}
                                >
                                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate max-w-64">{source.title}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                    {/* Custom Tags Section */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <TagIcon className="w-6 h-6 text-accent-pro" />
                            <h3 className="text-lg font-bold text-text-primary">Custom Tags</h3>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Add a relevant tag..."
                                className={`flex-grow h-10 ${commonSelectClass.replace('w-full', '')}`}
                            />
                            <button
                                onClick={handleAddTag}
                                className="h-10 px-4 bg-accent-pro text-white font-semibold rounded-md hover:opacity-90 transition-opacity"
                            >
                                Add
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <div key={tag} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-surface text-text-primary border border-border rounded-full">
                                        <span>{tag}</span>
                                        <button onClick={() => handleRemoveTag(tag)} className="p-0.5 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-400">
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null; // Initial state is handled by the main component structure
    };
    
    const commonSelectClass = "h-10 bg-surface border border-border rounded-md px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors";

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-text-primary">Intelligence Dashboard</h2>
            
            <div className="bg-card border border-border p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                        <label className="block text-sm font-semibold text-text-secondary mb-1">Sector</label>
                        <select value={sector} onChange={e => setSector(e.target.value)} className={`w-full ${commonSelectClass}`}>
                            {SECTOR_OPTIONS.map(s => <option key={s} value={s === 'All Sectors' ? 'all' : s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-5">
                         <label className="block text-sm font-semibold text-text-secondary mb-1">Time Period</label>
                         <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)} className={`w-full ${commonSelectClass}`}>
                            {TIME_PERIOD_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 self-end">
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full h-10 px-4 bg-accent-primary text-white font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:bg-border"
                        >
                             {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Generating...
                                </>
                            ) : 'Generate'}
                        </button>
                    </div>
                    <div className="md:col-span-12 mt-2">
                        <label className="block text-sm font-semibold text-text-secondary mb-2">Data Source Filters</label>
                        <div className="flex flex-wrap gap-2">
                            {SOURCE_OPTIONS.map(source => {
                                const isSelected = selectedSources.includes(source);
                                return (
                                    <button
                                        key={source}
                                        onClick={() => handleSourceToggle(source)}
                                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors duration-200 ${
                                            isSelected
                                                ? 'bg-accent-pro text-white border-accent-pro'
                                                : 'bg-surface text-text-secondary border-border hover:border-accent-pro'
                                        }`}
                                    >
                                        {isSelected && <CheckIcon className="w-3 h-3" />}
                                        {source}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="md:col-span-12 mt-4">
                        <label htmlFor="naturalLanguageQuery" className="block text-sm font-semibold text-text-secondary mb-2">Refine with Natural Language</label>
                        <div className="flex gap-2">
                            <input
                                id="naturalLanguageQuery"
                                type="text"
                                value={naturalLanguageQuery}
                                onChange={e => setNaturalLanguageQuery(e.target.value)}
                                placeholder='e.g., show me ransomware attacks but not from the LockBit group'
                                disabled={isLoading || isGeneratingQuery}
                                className={`flex-grow font-mono text-sm ${commonSelectClass.replace('w-full', '')}`}
                            />
                            <button
                                onClick={handleGenerateBooleanQuery}
                                disabled={isLoading || isGeneratingQuery || !naturalLanguageQuery.trim()}
                                className="h-10 px-4 bg-accent-pro text-white font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:bg-border"
                                title="Generate a boolean query from your text"
                            >
                                {isGeneratingQuery ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <SparklesIcon className="w-5 h-5" />
                                )}
                                <span>Generate</span>
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-12 mt-2">
                        <label htmlFor="booleanQuery" className="block text-sm font-semibold text-text-secondary mb-2">Advanced Boolean Search (Editable)</label>
                        <textarea
                            id="booleanQuery"
                            value={booleanQuery}
                            onChange={e => setBooleanQuery(e.target.value)}
                            placeholder='e.g., (APT28 OR "Fancy Bear") AND (vulnerability NOT CVE-2022-*)'
                            rows={2}
                            className={`w-full font-mono text-sm bg-surface border border-border rounded-md p-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors`}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {['AND', 'OR', 'NOT', '()'].map(op => (
                                <button key={op} onClick={() => appendToQuery(op === '()' ? '()' : ` ${op} `)} className="px-3 py-1 text-xs font-mono bg-surface border border-border rounded-md hover:bg-border text-text-secondary">
                                    {op}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {renderContent()}

            {!isLoading && !dashboardData && !error && (
                <div className="text-center py-20 bg-card rounded-lg border-2 border-dashed border-border">
                    <GlobeIcon className="w-16 h-16 mx-auto text-text-secondary" />
                    <h3 className="mt-4 text-xl font-semibold text-text-primary">Daily Intelligence Dashboard</h3>
                    <p className="mt-2 text-sm text-text-secondary">Select your filters and generate a live overview of the global threat landscape.</p>
                </div>
            )}
        </div>
    );
};