
import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { RiskScenario, AttemptCalculationResult, SavedYearlyAttempts, YearlyCalculation, CISector, SupplementalSignal, ArchetypeSignalResult, IC3Record, OrgCountRecord, SuccessRateRecord, SectorSupplementalRecord, ActorTargetingRecord, MajorCampaignRecord, InitialAccessRecord, EnergyOrgCountRecord, SuccessCalculationLedger } from '../types';
import { generateYearlyAttemptsNarrative, fetchArchetypeSignals, extractVectorsFromText } from '../services/geminiService';
import { computeAttemptRate } from '../services/attemptModel';
import { computeSuccessRate } from '../services/successModel';
import { addLog, cyrb53Hash, exportLogs } from '../services/logService';
import { CalendarTargetIcon } from './icons/CalendarTargetIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BrainIcon } from './icons/BrainIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ListChecksIcon } from './icons/ListChecksIcon';
import { AttackMapUploader } from './AttackMapUploader';
import { SparklesIcon } from './icons/SparklesIcon';
import { LinkIcon } from './icons/LinkIcon';
import { CheckIcon } from './icons/CheckIcon';
import { InfoIcon } from './icons/InfoIcon';
import { FlagIcon } from './icons/FlagIcon';
import { XIcon } from './icons/XIcon';

const commonInputClass = "w-full bg-surface border h-9 border-border rounded-md px-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors disabled:opacity-70";
const commonSelectClass = `${commonInputClass}`;
const commonLabelClass = "block text-xs font-semibold text-text-secondary mb-1";

export interface Datasets {
    ic3: Record<string, { data: IC3Record[], version: string }>;
    orgCounts: Record<string, { data: OrgCountRecord, version: string }>;
    energyOrgCounts?: EnergyOrgCountRecord[];
    successRates: Record<string, { data: SuccessRateRecord[], version: string }>;
    ciIC3: SectorSupplementalRecord[];
    actorTargeting: ActorTargetingRecord[];
    majorCampaigns: MajorCampaignRecord[];
    initialAccess: InitialAccessRecord[];
    sectorSpecific: Record<string, SectorSupplementalRecord[]>;
    energyAttemptRates?: SectorSupplementalRecord[];
}

const CI_SECTORS: { value: CISector, label: string }[] = [
    { value: 'Chemical', label: 'Chemical' },
    { value: 'Commercial Facilities', label: 'Commercial Facilities' },
    { value: 'Communications', label: 'Communications' },
    { value: 'Critical Manufacturing', label: 'Critical Manufacturing' },
    { value: 'Dams', label: 'Dams' },
    { value: 'Defense Industrial Base', label: 'Defense Industrial Base' },
    { value: 'Emergency Services', label: 'Emergency Services' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Financial Services', label: 'Financial Services' },
    { value: 'Food and Agriculture', label: 'Food and Agriculture' },
    { value: 'Government', label: 'Government Facilities' },
    { value: 'Healthcare', label: 'Healthcare and Public Health' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Nuclear Reactors, Materials, and Waste', label: 'Nuclear' },
    { value: 'Transportation', label: 'Transportation Systems' },
    { value: 'Water/Wastewater', label: 'Water and Wastewater Systems' },
];

const ACTOR_ARCHETYPES = [
    { id: 'wizard_spider', label: 'Wizard Spider – Advanced Cyber Criminal' },
    { id: 'gold_southfield', label: 'Gold Southfield – Non-Advanced Cyber Criminal' },
    { id: 'lazarus', label: 'Lazarus – Advanced Cyber Criminal (Nation-State Sponsored)' },
    { id: 'apt24', label: 'APT24 – Advanced Nation-State' },
    { id: 'apt28', label: 'APT28 – Advanced Nation-State' },
    { id: 'clop', label: 'clop – MOVEit Transfer (~2,600 victims)' },
    { id: 'lockbit', label: 'lockbit – LockBit 3.0 Global (~1,047 victims)' },
    { id: 'alphv_blackcat', label: 'alphv_blackcat – ALPHV/BlackCat (~445 victims)' },
    { id: 'scattered_spider', label: 'scattered_spider – Scattered Spider/ALPHV hospitality (5 victims)' },
];

const getActorLabel = (actorId: string): string => {
    const actor = ACTOR_ARCHETYPES.find(a => a.id === actorId);
    return actor ? actor.label : actorId;
};


const SECTOR_MAP: Record<string, CISector> = {
    'manufacturing': 'Critical Manufacturing',
    'government': 'Government',
    'transportation': 'Transportation',
    'it': 'Information Technology',
    'financial_services': 'Financial Services',
    'healthcare': 'Healthcare',
    'energy': 'Energy',
    'communications': 'Communications'
};


const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group flex items-center">
        {children}
        <div className="absolute bottom-full mb-2 w-48 bg-background text-text-primary text-xs rounded-md p-2 border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {text}
        </div>
    </div>
);

const RiskAccelerationToggle: React.FC<{
    label: string;
    tooltip: string;
    value: boolean;
    onChange: (newValue: boolean) => void;
    disabled: boolean;
}> = ({ label, tooltip, value, onChange, disabled }) => {
    const activeClass = "bg-accent-pro text-white";
    const inactiveClass = "bg-surface hover:bg-border";
    return (
        <div>
            <label className="flex items-center gap-1.5 mb-1">
                <span className={commonLabelClass}>{label}</span>
                <Tooltip text={tooltip}>
                    <InfoIcon className="w-4 h-4 text-text-secondary cursor-help" />
                </Tooltip>
            </label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
                <button
                    onClick={() => onChange(true)}
                    disabled={disabled}
                    className={`w-1/2 py-1 text-xs font-semibold transition-colors ${value ? activeClass : inactiveClass}`}
                >
                    Yes
                </button>
                <button
                    onClick={() => onChange(false)}
                    disabled={disabled}
                    className={`w-1/2 py-1 text-xs font-semibold transition-colors ${!value ? activeClass : inactiveClass}`}
                >
                    No
                </button>
            </div>
        </div>
    );
};


const ScenarioRow: React.FC<{
  scenario: RiskScenario;
  index: number;
  onUpdate: (index: number, updatedScenario: RiskScenario) => void;
  onRemove: (index: number) => void;
  isReadOnly: boolean;
  datasets: Datasets | null;
}> = ({ scenario, index, onUpdate, onRemove, isReadOnly, datasets }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumericField = ['baseYear', 'lookbackYears', 'darkNumber'].includes(name);
    onUpdate(index, { ...scenario, [name]: isNumericField ? Number(value) : value });
  };
  
  const setDarkNumber = (value: number) => {
    onUpdate(index, { ...scenario, darkNumber: value });
  };

  const handleActorAdd = (actor: string) => {
    if (actor && !scenario.actor_ids.includes(actor)) {
      onUpdate(index, { ...scenario, actor_ids: [...scenario.actor_ids, actor] });
    }
  };

  const handleActorRemove = (actorToRemove: string) => {
    onUpdate(index, { ...scenario, actor_ids: scenario.actor_ids.filter(a => a !== actorToRemove) });
  };

  const actorTargetingData = useMemo(() => {
    if (!datasets || !scenario.sector || scenario.actor_ids.length === 0) return null;
    
    const relevantRecord = datasets.actorTargeting.find(d => 
        scenario.actor_ids.includes(d.actor) &&
        (SECTOR_MAP[d.sector.toLowerCase().replace(/\s/g, '_')] === scenario.sector || d.sector === scenario.sector)
    );

    if (!relevantRecord) return null;

    const metric = relevantRecord.metrics.find(m => m.name === 'attack_percentage');
    if (!metric || typeof metric.value !== 'number') return null;

    return {
        actor: relevantRecord.actor,
        percentage: (metric.value * 100).toFixed(0)
    };
  }, [scenario.actor_ids, scenario.sector, datasets]);

  const applicableCampaigns = useMemo(() => {
    if (!datasets || scenario.actor_ids.length === 0) return [];
    return datasets.majorCampaigns.filter(c => scenario.actor_ids.includes(c.actor));
  }, [scenario.actor_ids, datasets]);

  const parsedVectors = useMemo(() => {
    return scenario.vectors.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  }, [scenario.vectors]);

  return (
    <div className="bg-card border border-border rounded-lg animate-fade-in">
        <div className="p-3 border-b border-border flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-3">
                <h4 className="font-semibold text-text-primary">Scenario</h4>
                <span className="font-mono text-xs bg-surface px-2 py-0.5 rounded-md border border-border text-text-secondary" aria-label={`Scenario ID: ${scenario.id.substring(0, 8)}`}>
                    {scenario.id.substring(0, 8)}
                </span>
            </div>
             <div className="flex items-center gap-2 text-xs">
                {scenario.isTargetLucrative && <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full">Lucrative</span>}
                {scenario.areSystemsHighValue && <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded-full">High-Value Systems</span>}
                {scenario.hasExternalSupport && <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">Sponsored</span>}
            </div>
            <button 
                onClick={() => onRemove(index)} 
                disabled={isReadOnly} 
                className="p-2 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove scenario"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label htmlFor={`bucket-${scenario.id}`} className={commonLabelClass}>Bucket</label>
                    <select id={`bucket-${scenario.id}`} name="bucket" value={scenario.bucket} onChange={handleChange} className={commonSelectClass} disabled={isReadOnly}>
                        <option value="">Select...</option>
                        <option value="ransomware">Ransomware</option>
                        <option value="fraud">Fraud</option>
                        <option value="ip_theft">IP Theft</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`sophistication-${scenario.id}`} className={commonLabelClass}>Sophistication</label>
                    <select id={`sophistication-${scenario.id}`} name="sophistication" value={scenario.sophistication} onChange={handleChange} className={commonSelectClass} disabled={isReadOnly}>
                        <option value="">Select...</option>
                        <option value="non_advanced">Non-Advanced</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor={`sector-${scenario.id}`} className={commonLabelClass}>CI Sector</label>
                    <select id={`sector-${scenario.id}`} name="sector" value={scenario.sector} onChange={handleChange} className={commonSelectClass} disabled={isReadOnly}>
                        <option value="">Select Sector...</option>
                        {CI_SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor={`region-${scenario.id}`} className={commonLabelClass}>Region</label>
                    <select id={`region-${scenario.id}`} name="region" value={scenario.region} onChange={handleChange} className={commonSelectClass} disabled={isReadOnly}>
                        <option value="US">US</option>
                        <option value="Global">Global</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`baseYear-${scenario.id}`} className={commonLabelClass}>Base Year</label>
                    <input id={`baseYear-${scenario.id}`} type="number" name="baseYear" value={scenario.baseYear} onChange={handleChange} placeholder="Year" className={commonInputClass} disabled={isReadOnly} />
                </div>
            </div>

            {/* Actor Input */}
            <div>
                <label className={commonLabelClass}>Actor Archetypes</label>
                <div className="flex flex-wrap items-center gap-2 bg-surface border border-border p-2 rounded-md">
                    {scenario.actor_ids.map(actorId => (
                        <div key={actorId} className="flex items-center gap-1.5 bg-purple-900/50 text-purple-300 text-sm font-semibold px-2 py-1 rounded-md border border-purple-700/50">
                            <span>{getActorLabel(actorId)}</span>
                            <button onClick={() => handleActorRemove(actorId)} disabled={isReadOnly} className="text-text-secondary hover:text-white"><XIcon className="w-3 h-3"/></button>
                        </div>
                    ))}
                    <select 
                        value="" 
                        onChange={(e) => handleActorAdd(e.target.value)}
                        disabled={isReadOnly}
                        className="bg-transparent focus:outline-none text-text-primary text-sm"
                    >
                        <option value="">+ Add Actor</option>
                        {ACTOR_ARCHETYPES.filter(a => !scenario.actor_ids.includes(a.id)).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                </div>
                {actorTargetingData && (
                    <p className="text-xs text-accent-primary mt-1 animate-fade-in">
                        Microsoft DDR reports {actorTargetingData.actor} targets this sector in ~{actorTargetingData.percentage}% of attacks.
                    </p>
                )}
            </div>
            
            {/* Vectors Input & Badges */}
            <div>
                 <div className="flex items-center gap-1.5 mb-1">
                    <label htmlFor={`vectors-${scenario.id}`} className={commonLabelClass.replace('mb-1', '')}>Initial Access Vectors</label>
                    <Tooltip text="Comma-separated list (e.g., phishing, rdp_remote_access). See tooltips on badges for available keywords.">
                        <InfoIcon className="w-4 h-4 text-text-secondary cursor-help" />
                    </Tooltip>
                </div>
                <input id={`vectors-${scenario.id}`} type="text" name="vectors" value={scenario.vectors} onChange={handleChange} placeholder="e.g., phishing, rdp_remote_access" className={commonInputClass} disabled={isReadOnly} />
                {parsedVectors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {parsedVectors.map(vector => {
                            const vectorData = datasets && datasets.initialAccess.find(d => d.vector.toLowerCase().includes(vector));
                            const share = vectorData?.metrics.find(m => m.name.startsWith('share'))?.value;
                            const tooltipText = vectorData 
                                ? `${vectorData.source}: ${share ? (Number(share) * 100).toFixed(0) + '% share' : 'Data available'}`
                                : `No specific share data for "${vector}"`;

                            return (
                                <Tooltip key={vector} text={tooltipText}>
                                    <span className="px-2 py-1 text-xs font-semibold bg-sky-900/50 text-sky-300 border border-sky-700/50 rounded-md cursor-help">
                                        {vector}
                                    </span>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Applicable Campaigns */}
            {applicableCampaigns.length > 0 && (
                <div className="pt-4 mt-4 border-t border-border">
                     <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider flex items-center gap-2">
                        <FlagIcon className="w-4 h-4 text-accent-pro" />
                        Applicable Major Campaigns
                    </h5>
                    <div className="space-y-2">
                        {applicableCampaigns.map(campaign => (
                            <div key={campaign.campaignName} className="flex justify-between items-center p-2 bg-surface/50 rounded-md text-sm">
                                <div>
                                    <p className="font-semibold text-text-primary">{campaign.campaignName}</p>
                                    <p className="text-xs text-text-secondary">{campaign.notes}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="font-mono font-bold text-lg text-accent-pro">{campaign.metricValue.toLocaleString()}</p>
                                    <p className="text-xs text-text-secondary">{campaign.unit}s</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="pt-4 mt-4 border-t border-border">
                <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">Risk Acceleration</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <RiskAccelerationToggle
                        label="Lucrative Target?"
                        tooltip="Is the target organization especially attractive to attackers (e.g., holds sensitive data, critical to supply chains)?"
                        value={!!scenario.isTargetLucrative}
                        onChange={(val) => onUpdate(index, { ...scenario, isTargetLucrative: val })}
                        disabled={isReadOnly}
                    />
                    <RiskAccelerationToggle
                        label="High-Value Systems?"
                        tooltip="Are the specific systems or processes uniquely valuable to the attacker (e.g., crown jewel IP, critical industrial controls)?"
                        value={!!scenario.areSystemsHighValue}
                        onChange={(val) => onUpdate(index, { ...scenario, areSystemsHighValue: val })}
                        disabled={isReadOnly}
                    />
                    <RiskAccelerationToggle
                        label="External Support?"
                        tooltip="Does the adversary have external sponsorship (e.g., state-nexus, large eCrime affiliate program)?"
                        value={!!scenario.hasExternalSupport}
                        onChange={(val) => onUpdate(index, { ...scenario, hasExternalSupport: val })}
                        disabled={isReadOnly}
                    />
                </div>
            </div>
            
            <div>
                <label htmlFor={`darkNumber-${scenario.id}`} className="flex items-center gap-1.5 mb-1">
                    <span className={commonLabelClass}>Dark Number ({scenario.darkNumber || 0}%)</span>
                    <Tooltip text="Accounts for unreported incidents. Default is 33%, a common industry estimate.">
                        <InfoIcon className="w-4 h-4 text-text-secondary cursor-help" />
                    </Tooltip>
                </label>
                <div className="flex items-center gap-2">
                     <input
                        id={`darkNumber-${scenario.id}`}
                        type="range" name="darkNumber" min="0" max="100" step="1"
                        value={scenario.darkNumber || 0} onChange={handleChange}
                        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{'--slider-color': 'var(--color-accent-pro)'} as React.CSSProperties}
                        disabled={isReadOnly}
                    />
                     <div className="flex items-center gap-1">
                        {[33, 50, 75].map(val => (
                            <button key={val} onClick={() => setDarkNumber(val)} disabled={isReadOnly} className="px-2 py-0.5 text-xs font-mono bg-surface border border-border rounded-md hover:bg-border disabled:opacity-50">{val}%</button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <button onClick={() => setIsAdvancedOpen(o => !o)} className="text-xs text-text-secondary font-semibold hover:text-text-primary">
                    {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Options
                </button>
                {isAdvancedOpen && (
                    <div className="mt-2 pt-3 border-t border-border animate-fade-in">
                        <div className="w-full md:w-1/4">
                            <label htmlFor={`lookbackYears-${scenario.id}`} className={commonLabelClass}>Lookback Period</label>
                            <select id={`lookbackYears-${scenario.id}`} name="lookbackYears" value={scenario.lookbackYears} onChange={handleChange} className={commonSelectClass} disabled={isReadOnly}>
                                <option value={1}>1 Year</option>
                                <option value={5}>5 Years</option>
                                <option value={10}>10 Years</option>
                                <option value={20}>20 Years</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const SignalConfidenceBadge: React.FC<{ confidence: 'low' | 'medium' | 'high' }> = ({ confidence }) => {
    const styles = {
        low: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
        medium: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
        high: 'bg-green-900/50 text-green-300 border-green-700/50',
    };
    return (
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[confidence]}`}>
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
        </div>
    );
};


const SignalsReviewModal: React.FC<{
  result: ArchetypeSignalResult & { signals: (SupplementalSignal & { clientId: string })[] };
  scenario: RiskScenario;
  onApprove: (approvedSignals: SupplementalSignal[]) => void;
  onCancel: () => void;
}> = ({ result, scenario, onApprove, onCancel }) => {
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(() => new Set(result.signals.map(s => s.clientId)));

    const handleToggleSignal = (clientId: string) => {
        setSelectedClientIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => setSelectedClientIds(new Set(result.signals.map(s => s.clientId)));
    const handleDeselectAll = () => setSelectedClientIds(new Set());

    const handleApprove = () => {
        const approvedSignals = result.signals.filter(s => selectedClientIds.has(s.clientId));
        onApprove(approvedSignals);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-4xl h-[90vh] flex flex-col border border-border rounded-lg shadow-2xl">
                <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-accent-primary" />
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Review Archetype Signals</h2>
                            <p className="text-sm text-text-secondary">For scenario: <span className="font-semibold">{scenario.actor_ids.join(', ')}</span></p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-text-secondary hover:text-white text-2xl">&times;</button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-4">
                        {result.explanation && (
                            <div className="p-3 bg-surface border border-border text-sm text-text-secondary rounded-md italic">
                                {result.explanation}
                            </div>
                        )}
                        {result.signals.map(signal => {
                            const isSelected = selectedClientIds.has(signal.clientId);
                            return (
                                <div key={signal.clientId} className={`p-4 rounded-lg border-2 transition-colors duration-200 ${isSelected ? 'bg-surface border-accent-primary/50' : 'bg-background/50 border-border'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 pt-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSignal(signal.clientId)}
                                                className="h-5 w-5 rounded bg-surface border-border text-accent-primary focus:ring-accent-pro"
                                            />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-text-primary pr-4">{signal.metric}</h4>
                                                <SignalConfidenceBadge confidence={signal.confidence} />
                                            </div>
                                            <p className="font-mono text-xl font-bold text-accent-primary my-1">{signal.value} <span className="text-sm font-sans text-text-secondary">{signal.unit}</span></p>
                                            <p className="text-xs text-text-secondary italic my-2">"{signal.excerpt}"</p>
                                            <a href={signal.citationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-accent-primary hover:underline">
                                                <LinkIcon className="w-3 h-3" />
                                                <span className="truncate">{signal.citationUrl}</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>
                <footer className="p-4 border-t border-border bg-surface flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-background hover:bg-border text-text-primary border border-border">Select All</button>
                        <button onClick={handleDeselectAll} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-background hover:bg-border text-text-primary border border-border">Deselect All</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="px-6 py-2 text-sm font-semibold rounded-md bg-surface hover:bg-border text-text-primary border border-border">
                            Cancel
                        </button>
                        <button onClick={handleApprove} className="px-6 py-2 text-sm font-semibold rounded-md bg-accent-pro hover:opacity-90 text-white flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" />
                            Approve {selectedClientIds.size} Signal(s)
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const ConfidenceBadge: React.FC<{ score?: 'Low' | 'Medium' | 'High' }> = ({ score }) => {
    if (!score) return null;
    const styles = {
        Low: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
        Medium: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
        High: 'bg-green-900/50 text-green-300 border-green-700/50',
    };
    return (
        <div className={`text-xs font-bold px-2 py-1 rounded-full border ${styles[score as keyof typeof styles] || 'border-border'}`}>
            Confidence: {score}
        </div>
    );
};

const CalculationLedgerDisplay: React.FC<{ result: AttemptCalculationResult; selectedYear: number | null }> = ({ result, selectedYear }) => {
    const yearToShow = selectedYear || result.scenario.baseYear;
    const dataForYear = result.timeline?.find(t => t.year === yearToShow);
    const ledger = dataForYear?.calculationLedger;

    if (!ledger) {
        return (
             <div className="text-sm text-text-secondary italic p-3 bg-surface border border-border rounded-lg space-y-2 animate-fade-in">
                <p className="font-semibold text-text-primary not-italic">No detailed calculation breakdown available from the model.</p>
                <p className="text-xs">This can occur for highly specific or future-dated scenarios where public data is scarce, or if the model could not synthesize a step-by-step rationale from the available evidence.</p>
            </div>
        )
    }

    const { baseline_selection, reporting_rate_adjustment, calibration, success_rate_application } = ledger;

    return (
        <div className="space-y-4 text-sm p-3 bg-surface border border-border rounded-lg animate-fade-in">
            {/* Step 1: Baseline Selection */}
            <div>
                <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">1. Baseline Selection</h5>
                <div className="p-3 bg-background/50 rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs text-center sm:text-left">
                        <span>Target: <span className="font-semibold text-text-primary">{baseline_selection.target_profile}</span></span>
                        <span>Sophistication: <span className="font-semibold text-text-primary">{baseline_selection.sophistication}</span></span>
                        <span className="sm:text-right">Range: <span className="font-bold text-accent-primary">{baseline_selection.range_low} - {baseline_selection.range_high}</span></span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2 italic">"{baseline_selection.justification}"</p>
                </div>
            </div>

            {/* Step 2: Reporting Rate Adjustment */}
            {reporting_rate_adjustment && (
                 <div>
                    <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">2. Reporting Rate Adjustment</h5>
                    <div className="p-3 bg-background/50 rounded-md">
                        <p className="text-xs text-text-secondary">Adjusting for an estimated <strong className="text-text-primary">{reporting_rate_adjustment.dark_number_percentage}%</strong> of unreported incidents (a reporting rate of {Math.round(reporting_rate_adjustment.reporting_rate * 100)}%).</p>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                            <p className="font-mono text-sm text-accent-primary p-2 bg-background rounded-md border border-border">{reporting_rate_adjustment.formula}</p>
                            <div className="text-right">
                                <p className="text-sm font-semibold">Adjusted Incident Rate</p>
                                <p className="font-bold text-xl text-accent-primary font-mono">{reporting_rate_adjustment.adjusted_incident_rate.toPrecision(4)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Step 3: Calibration */}
            <div>
                 <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">3. Calibration Based on Evidence</h5>
                 <div className="space-y-3">
                    {calibration.factors.map((factor, index) => {
                        const isPositive = factor.impact_direction === 'positive';
                        const isAdditive = factor.impact_direction === 'additive' || factor.factorType === 'delta';
                        const impactColor = isAdditive ? 'text-blue-400' : isPositive ? 'text-green-400' : 'text-red-400';
                        const borderColor = isAdditive ? 'border-blue-500/50' : isPositive ? 'border-green-500/50' : 'border-red-500/50';

                        return (
                            <div key={index} className={`p-2 bg-background/50 rounded-md border-l-2 ${borderColor}`}>
                                <p className="text-xs font-semibold text-text-primary">{factor.evidence_summary}</p>
                                <p className="text-xs text-text-secondary mt-1 italic">
                                    <span className={`font-bold ${impactColor}`}>
                                        {factor.impact_magnitude.toUpperCase()} {factor.impact_direction.toUpperCase()} IMPACT:
                                    </span>
                                    {` ${factor.reasoning}`}
                                </p>
                            </div>
                        )
                    })}
                    <div className="p-3 bg-background/50 rounded-md">
                        <p className="text-xs text-text-secondary italic">"{calibration.calibration_justification}"</p>
                        <p className="text-right text-sm font-semibold mt-2">Final Calibrated Incident Rate: <span className="font-bold text-xl text-accent-primary font-mono">{calibration.final_calibrated_baseline.toPrecision(4)}</span></p>
                    </div>
                 </div>
            </div>

            {/* Step 4: Success Rate Application */}
            {success_rate_application && (
                <div>
                    <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">4. Success Rate Application & Final Result</h5>
                    <div className="p-3 bg-background/50 rounded-md">
                        <p className="text-xs text-text-secondary">Converting calibrated incident rate to attempt rate using a <strong className="text-text-primary">{(success_rate_application.success_rate * 100).toFixed(1)}%</strong> success probability from {success_rate_application.success_rate_source}.</p>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                            <p className="font-mono text-sm text-accent-primary p-2 bg-background rounded-md border border-border">{success_rate_application.formula}</p>
                            <div className="text-right">
                                <p className="text-sm font-semibold">Final λ Mean</p>
                                <p className="font-bold text-2xl text-accent-primary font-mono">{success_rate_application.final_lambda_mean.toFixed(4)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SuccessCalculationLedgerDisplay: React.FC<{ ledger?: SuccessCalculationLedger }> = ({ ledger }) => {
    if (!ledger) {
        return (
            <div className="text-sm text-text-secondary italic p-3 bg-surface border border-border rounded-lg animate-fade-in">
                <p>Success calculation breakdown is not available for this year.</p>
            </div>
        );
    }

    const { baseline_selection, calibration } = ledger;

    return (
        <div className="space-y-4 text-sm p-3 bg-surface border border-border rounded-lg animate-fade-in">
            {/* Step 1: Baseline Selection */}
            <div>
                <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">1. Success Baseline Selection</h5>
                <div className="p-3 bg-background/50 rounded-md space-y-2">
                    <p className="text-xs text-text-secondary"><strong className="text-text-primary">Source:</strong> {baseline_selection.source}</p>
                    <p className="text-xs text-text-secondary"><strong className="text-text-primary">Metric Used:</strong> <span className="font-mono">{baseline_selection.metric_name}</span></p>
                    <p className="text-sm font-semibold">Baseline Rate: <span className="font-bold text-xl text-green-400 font-mono">{(baseline_selection.baseline_rate * 100).toFixed(1)}%</span></p>
                    <p className="text-xs text-text-secondary mt-2 italic">"{baseline_selection.justification}"</p>
                </div>
            </div>

            {/* Step 2: Calibration */}
            {calibration.factors.length > 0 && (
                 <div>
                    <h5 className="font-semibold text-text-secondary text-xs uppercase mb-2 tracking-wider">2. Calibration</h5>
                    <div className="space-y-3">
                        {calibration.factors.map((factor, index) => {
                            const isPositive = factor.impact_direction === 'positive';
                            const impactColor = isPositive ? 'text-green-400' : 'text-red-400';
                            const borderColor = isPositive ? 'border-green-500/50' : 'border-red-500/50';

                            return (
                                <div key={index} className={`p-2 bg-background/50 rounded-md border-l-2 ${borderColor}`}>
                                    <p className="text-xs font-semibold text-text-primary">{factor.evidence_summary}</p>
                                    <p className="text-xs text-text-secondary mt-1 italic">
                                        <span className={`font-bold ${impactColor}`}>
                                            {factor.impact_magnitude.toUpperCase()} {factor.impact_direction.toUpperCase()} IMPACT:
                                        </span>
                                        {` ${factor.reasoning}`}
                                    </p>
                                </div>
                            )
                        })}
                        <div className="p-3 bg-background/50 rounded-md">
                            <p className="text-xs text-text-secondary italic">"{calibration.calibration_justification}"</p>
                            <p className="text-right text-sm font-semibold mt-2">Final Calibrated Rate: <span className="font-bold text-xl text-green-400 font-mono">{(calibration.final_calibrated_rate * 100).toFixed(1)}%</span></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const SourceExtractionTable: React.FC<{ result: AttemptCalculationResult; selectedYear: number | null }> = ({ result, selectedYear }) => {
    const yearToShow = selectedYear || result.scenario.baseYear;
    const dataForYear = result.timeline?.find(t => t.year === yearToShow);
    const sources = dataForYear?.sourceExtraction;
    
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return (
            <div className="text-sm text-text-secondary italic p-3 bg-surface border border-border rounded-lg space-y-2 animate-fade-in">
                <p className="font-semibold text-text-primary not-italic">Source extraction data not available for {yearToShow}.</p>
                <p className="text-xs">The model did not cite specific data points from public sources for this year's calculation. The analysis may be based on broader trends or extrapolations mentioned in the justification.</p>
            </div>
        );
    }
    
    return (
        <div className="overflow-x-auto border border-border rounded-lg animate-fade-in">
            <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface text-text-secondary">
                    <tr>
                        <th className="p-2">Metric Key</th>
                        <th className="p-2">Raw Value</th>
                        <th className="p-2">Year</th>
                        <th className="p-2">Unit</th>
                        <th className="p-2">Source ID</th>
                        <th className="p-2">Dataset Version</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {sources.map((s, i) => (
                        <tr key={i} className="hover:bg-surface/50">
                            <td className="p-2 font-semibold text-text-primary">{s?.metric_key ?? 'N/A'}</td>
                            <td className="p-2">{s?.raw_value ?? 'N/A'}</td>
                            <td className="p-2">{yearToShow ?? 'N/A'}</td>
                            <td className="p-2">{s?.unit ?? 'N/A'}</td>
                             <td className="p-2">
                                 <a href={s?.citation_url} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">{s?.source_id ?? 'N/A'}</a>
                            </td>
                            <td className="p-2">{s?.dataset_version ?? 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const formatValue = (value: number | null | undefined | 'N/A'): string => {
    if (value === null || typeof value === 'undefined' || value === 'N/A') return 'N/A';
    if (value === 0) return '0.00';
    if (value > 0 && value < 0.01) return '<0.01';
    return value.toFixed(2);
};

const ResultCard: React.FC<{ result: AttemptCalculationResult, datasets: Datasets }> = ({ result, datasets }) => {
    const { status, summary, error, scenario, headline, lambda_mean, lambda_low, lambda_high, confidence_band, keyFactors, coverage, fallbacks, ignored_signals, method_version, baseline_year, timeline, success_rate_mean, success_rate_low, success_rate_high } = result;
    const [selectedYear, setSelectedYear] = useState<number | null>(scenario.baseYear);
    const [activeView, setActiveView] = useState<'none' | 'math' | 'inputs' | 'repro' | 'export' | 'successMath'>('none');
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    
    const dataForDisplay = useMemo(() => {
        const yearToShow = selectedYear || scenario.baseYear;
        return timeline?.find(t => t.year === yearToShow);
    }, [selectedYear, scenario.baseYear, timeline]);

    const handleCopyRepro = () => {
        if (!dataForDisplay) return;
        const reproData = JSON.stringify({ scenario: result.scenario, year_data: dataForDisplay }, null, 2);
        navigator.clipboard.writeText(reproData).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        });
    };

    const handleExport = async () => {
        const dataForYear = timeline?.find(t => t.year === scenario.baseYear);
        if (!dataForYear) return;

        const analysisBundle = {
            scenario,
            datasets: {
                ic3: datasets.ic3[scenario.baseYear] || null,
                orgCounts: datasets.orgCounts[scenario.baseYear] || null,
                successRates: datasets.successRates[scenario.bucket] || null,
            },
            ledger: dataForYear.calculationLedger,
            signals: scenario.signals,
            narrative: { summary, justification: result.justification },
            result: dataForYear,
            log: { /* In a real app, you'd fetch the specific log from IndexedDB */ }
        };

        const blob = new Blob([JSON.stringify(analysisBundle, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_bundle_${scenario.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const reproYear = dataForDisplay?.year;

    const TimelineView = () => {
      if (!timeline || timeline.length <= 1) return null;
      return (
        <div className="mt-4">
          <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Historical Timeline</h4>
          <div className="overflow-x-auto border border-border rounded-lg max-h-48">
             <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface text-text-secondary sticky top-0">
                    <tr>
                        <th className="p-2">Year</th>
                        <th className="p-2 text-center">λ Mean</th>
                        <th className="p-2 text-center">90% CI</th>
                        <th className="p-2 text-center">Coverage</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeline.sort((a,b) => b.year - a.year).map((t) => (
                    <tr 
                        key={t.year} 
                        onClick={() => setSelectedYear(t.year)}
                        className={`cursor-pointer transition-colors ${selectedYear === t.year ? 'bg-accent-primary/20' : 'hover:bg-surface/50'}`}
                    >
                      <td className="p-2 font-semibold text-text-primary">{t.year}</td>
                      <td className="p-2 text-center">{typeof t.lambda_mean === 'number' ? t.lambda_mean.toFixed(2) : t.lambda_mean}</td>
                      <td className="p-2 text-center">{typeof t.lambda_low === 'number' && typeof t.lambda_high === 'number' ? `${t.lambda_low.toFixed(1)} - ${t.lambda_high.toFixed(1)}` : 'N/A'}</td>
                      <td className="p-2 text-center">{t.coverage ?? 'N/A'}%</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      );
    }

    const renderContent = () => {
        if (status === 'loading') return (
            <div className="flex items-center justify-center h-full text-text-secondary min-h-[200px]">
                <svg className="animate-spin mr-3 h-6 w-6 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8
 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Analyzing {scenario.lookbackYears} year(s)...</span>
            </div>
        );
        if (status === 'error') return (
            <div className="text-center text-red-400 min-h-[200px] flex flex-col items-center justify-center p-4">
                <p className="font-semibold">Analysis Failed</p>
                <p className="text-xs mt-1 whitespace-pre-wrap">{error}</p>
            </div>
        );

        const currentLambdaMean = typeof dataForDisplay?.lambda_mean === 'number' ? dataForDisplay.lambda_mean : (typeof lambda_mean === 'number' ? lambda_mean : null);
        const currentLambdaLow = typeof dataForDisplay?.lambda_low === 'number' ? dataForDisplay.lambda_low : (typeof lambda_low === 'number' ? lambda_low : null);
        const currentLambdaHigh = typeof dataForDisplay?.lambda_high === 'number' ? dataForDisplay.lambda_high : (typeof lambda_high === 'number' ? lambda_high : null);
        const currentSuccessMean = typeof dataForDisplay?.success_rate_mean === 'number' ? dataForDisplay.success_rate_mean : (typeof success_rate_mean === 'number' ? success_rate_mean : null);
        const currentSummary = dataForDisplay?.summary ?? summary;
        const currentConfidence = dataForDisplay?.confidence_band ?? confidence_band;
        const displayYear = dataForDisplay?.year ?? scenario.baseYear;

        let successfulIncidentsMean: number | null = null;
        let successfulIncidentsLow: number | null = null;
        let successfulIncidentsHigh: number | null = null;

        if (currentLambdaMean !== null && currentSuccessMean !== null) {
            successfulIncidentsMean = currentLambdaMean * currentSuccessMean;
        }
        if (currentLambdaLow !== null && currentSuccessMean !== null) {
            // Using mean success rate for CI of incidents for simplicity, could use low/high if available
            successfulIncidentsLow = currentLambdaLow * currentSuccessMean;
        }
        if (currentLambdaHigh !== null && currentSuccessMean !== null) {
            successfulIncidentsHigh = currentLambdaHigh * currentSuccessMean;
        }

        return (
            <div className="space-y-4">
                {/* Headline Band */}
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                        {/* Attempts Block */}
                        <div className="flex items-center gap-3">
                            <p className="text-5xl font-bold text-accent-primary font-mono leading-none" title={`Mean: ${currentLambdaMean?.toFixed(4)}`}>
                                {formatValue(currentLambdaMean)}
                            </p>
                            <div>
                                <p className="text-base font-semibold text-text-primary">Attempts / Year ({displayYear})</p>
                                {(currentLambdaLow !== null && currentLambdaHigh !== null) && (
                                    <p className="text-xs text-text-secondary font-mono">
                                        90% CI: {formatValue(currentLambdaLow)} - {formatValue(currentLambdaHigh)}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="text-3xl text-text-secondary self-center">&rarr;</div>

                        {/* Successful Incidents Block */}
                        <div className="flex items-center gap-3">
                             <p className="text-5xl font-bold text-green-400 font-mono leading-none" title={`Mean: ${successfulIncidentsMean?.toFixed(4)}`}>
                                {formatValue(successfulIncidentsMean)}
                             </p>
                            <div>
                                <p className="text-base font-semibold text-text-primary">Successful Incidents / Year</p>
                                {(successfulIncidentsLow !== null && successfulIncidentsHigh !== null) && (
                                    <p className="text-xs text-text-secondary font-mono">
                                        90% CI: {formatValue(successfulIncidentsLow)} - {formatValue(successfulIncidentsHigh)}
                                    </p>
                                )}
                                {currentLambdaMean !== null && currentSuccessMean !== null && successfulIncidentsMean !== null && (
                                    <p className="text-xs text-text-secondary font-mono mt-2 bg-surface px-2 py-1 rounded-md inline-block border border-border">
                                        {currentLambdaMean.toFixed(4)} &times; {currentSuccessMean.toFixed(2)} = {successfulIncidentsMean.toFixed(4)}
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>
                    <div className="flex flex-col items-end gap-2 text-right flex-shrink-0">
                        <ConfidenceBadge score={currentConfidence} />
                        {(method_version && baseline_year) && (
                            <div className="text-xs font-mono text-text-secondary bg-surface px-2 py-1 rounded-md border border-border">v{method_version} | Base {baseline_year}</div>
                        )}
                    </div>
                </div>

                {/* Key Factors */}
                {keyFactors && keyFactors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {keyFactors.map((factor) => (
                            <div key={factor.metric_key} className="bg-surface text-text-primary text-xs px-2 py-1 rounded-md border border-border font-semibold">
                                {factor.metric_key} <span className="font-mono text-accent-primary">{factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Summary */}
                <p className="text-sm text-text-secondary leading-relaxed">{currentSummary}</p>
                
                <TimelineView />

                {/* Evidence & Math Buttons */}
                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    <button onClick={() => setActiveView(v => v === 'inputs' ? 'none' : 'inputs')} className={`px-3 py-1 rounded-md transition-colors ${activeView === 'inputs' ? 'bg-accent-pro text-white' : 'bg-surface hover:bg-border'}`}>Show Inputs</button>
                    <button onClick={() => setActiveView(v => v === 'math' ? 'none' : 'math')} className={`px-3 py-1 rounded-md transition-colors ${activeView === 'math' ? 'bg-accent-pro text-white' : 'bg-surface hover:bg-border'}`}>Show Attempt Math</button>
                    <button onClick={() => setActiveView(v => v === 'successMath' ? 'none' : 'successMath')} className={`px-3 py-1 rounded-md transition-colors ${activeView === 'successMath' ? 'bg-green-700 text-white' : 'bg-surface hover:bg-border'}`}>Show Success Math</button>
                    <button onClick={() => setActiveView(v => v === 'repro' ? 'none' : 'repro')} className={`px-3 py-1 rounded-md transition-colors ${activeView === 'repro' ? 'bg-accent-pro text-white' : 'bg-surface hover:bg-border'}`}>Copy Repro Data</button>
                    <button onClick={handleExport} className={`px-3 py-1 rounded-md transition-colors bg-surface hover:bg-border`}>Export Bundle</button>
                </div>
                
                {/* Expandable Views */}
                {activeView !== 'none' && (
                  <div className="animate-fade-in">
                      {activeView === 'inputs' && <SourceExtractionTable result={result} selectedYear={selectedYear} />}
                      {activeView === 'math' && <CalculationLedgerDisplay result={result} selectedYear={selectedYear} />}
                      {activeView === 'successMath' && <SuccessCalculationLedgerDisplay ledger={dataForDisplay?.successCalculationLedger} />}
                      {activeView === 'repro' && dataForDisplay && (
                          <div className="p-3 bg-surface border border-border rounded-lg relative">
                              <button onClick={handleCopyRepro} className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2 py-1 bg-background hover:bg-border rounded-md transition-colors border border-border"><ClipboardIcon className="w-3 h-3"/>{copyButtonText}</button>
                              <h5 className="font-semibold text-text-secondary text-xs uppercase mb-1">Reproducibility JSON for {reproYear}</h5>
                              <pre className="text-xs text-text-secondary bg-background p-2 rounded-md max-h-60 overflow-auto">{JSON.stringify({ scenario: result.scenario, year_data: dataForDisplay }, null, 2)}</pre>
                          </div>
                      )}
                  </div>
                )}

                {/* Diagnostics */}
                <div className="text-xs text-text-secondary border-t border-border pt-3 mt-3 flex justify-between items-center flex-wrap gap-x-4 gap-y-1">
                    <span>Coverage: <strong className="font-semibold text-text-primary">{coverage ?? 'N/A'}%</strong></span>
                    <span>Fallbacks: <strong className="font-semibold text-text-primary">{fallbacks?.join(', ') || 'None'}</strong></span>
                    <span>Ignored Signals: <strong className="font-semibold text-text-primary">{ignored_signals?.join(', ') || 'None'}</strong></span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-in">
            <div className="pb-3 mb-3 border-b border-border">
                 <p className="text-sm font-semibold text-text-primary">{scenario.actor_ids.map(getActorLabel).join(', ') || 'Unnamed Actor'}</p>
                 <p className="text-xs text-text-secondary">{scenario.bucket} / {scenario.sophistication}</p>
            </div>
            {renderContent()}
        </div>
    );
}

export const YearlyAttempts: React.FC = () => {
    const [scenarios, setScenarios] = useState<RiskScenario[]>([
        { id: uuidv4(), baseYear: new Date().getFullYear(), lookbackYears: 1, darkNumber: 33, bucket: 'ransomware', sophistication: 'non_advanced', targetProfile: 'critical_infrastructure', actor_ids: ['wizard_spider'], vectors: 'phishing, rdp_remote_access', sector: 'Healthcare', region: 'US', signals: [], isTargetLucrative: false, areSystemsHighValue: false, hasExternalSupport: false },
    ]);
    const [results, setResults] = useState<AttemptCalculationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchingSignalsFor, setFetchingSignalsFor] = useState<string | null>(null);
    const [signalsToReview, setSignalsToReview] = useState<{ scenarioIndex: number; result: ArchetypeSignalResult & { signals: (SupplementalSignal & { clientId: string })[] } } | null>(null);
    
    const [datasets, setDatasets] = useState<Datasets | null>(null);
    const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
    
    const [runHistory, setRunHistory] = useState<SavedYearlyAttempts[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');

    useEffect(() => {
        const stored = localStorage.getItem('ctiYearlyAttemptsReports');
        if (stored) {
            try {
                // Fix: Ensure parsed data is an array before setting state to avoid runtime errors.
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setRunHistory(parsed as SavedYearlyAttempts[]);
                }
            } catch (e) {
                console.error("Failed to parse 'ctiYearlyAttemptsReports' from localStorage", e);
                setRunHistory([]);
            }
        }
    }, []);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [
                    ic3IndexRes, orgCountsIndexRes, successRatesIndexRes,
                    ciIC3Res, actorTargetingRes, initialAccessRes,
                    supplementalIndexRes, attemptRatesIndexRes
                ] = await Promise.all([
                    fetch('./data/ic3/index.json'),
                    fetch('./data/org_counts/index.json'),
                    fetch('./data/success_rates/index.json'),
                    fetch('./data/supplemental/critical-infra-ic3.json'),
                    fetch('./data/supplemental/iran-actors.json'), // Using this as actor-sector-weights
                    fetch('./data/supplemental/initial-access.json'),
                    fetch('./data/supplemental/index.json'),
                    fetch('./data/attempt_rates/index.json'),
                ]);

                const [
                    ic3Index, orgCountsIndex, successRatesIndex,
                    ciIC3Data, actorTargetingData, initialAccessDataRes,
                    supplementalIndex, attemptRatesIndex
                ] = await Promise.all([
                    ic3IndexRes.json(), orgCountsIndexRes.json(), successRatesIndexRes.json(),
                    ciIC3Res.json(), actorTargetingRes.json(), initialAccessRes.json(),
                    supplementalIndexRes.json(), attemptRatesIndexRes.json()
                ]);

                const ic3Data: Datasets['ic3'] = {};
                for (const entry of ic3Index) {
                    const res = await fetch(`./data/ic3/${entry.fileName}`);
                    ic3Data[entry.year] = { data: await res.json(), version: entry.checksum };
                }

                const orgCountsData: Datasets['orgCounts'] = {};
                const nonEnergyOrgCounts = orgCountsIndex.filter((f: any) => !f.sector);
                for (const entry of nonEnergyOrgCounts) {
                    const res = await fetch(`./data/org_counts/${entry.fileName}`);
                    orgCountsData[entry.year] = { data: await res.json(), version: entry.checksum };
                }
                
                const energyOrgCountsFile = orgCountsIndex.find((f: any) => f.sector === 'energy');
                let energyOrgCountsData: EnergyOrgCountRecord[] | undefined = undefined;
                if (energyOrgCountsFile) {
                    const res = await fetch(`./data/org_counts/${energyOrgCountsFile.fileName}`);
                    energyOrgCountsData = await res.json();
                }

                const successRatesData: Datasets['successRates'] = {};
                for (const entry of successRatesIndex) {
                    const res = await fetch(`./data/success_rates/${entry.fileName}`);
                    successRatesData[entry.bucket] = { data: await res.json(), version: entry.checksum };
                }
                
                const majorCampaignFiles = supplementalIndex.filter((f: any) => f.topic === 'major_campaigns');
                const majorCampaignsPromises = majorCampaignFiles.map((file: any) => 
                    fetch(`./data/supplemental/${file.fileName}`).then(res => res.json())
                );
                const majorCampaignsDataArrays = await Promise.all(majorCampaignsPromises);
                const majorCampaignsData = [].concat(...majorCampaignsDataArrays);

                const sectorSpecificData: Record<string, SectorSupplementalRecord[]> = {};
                const sectorSpecificPromises = supplementalIndex
                    .filter((entry: any) => entry.sector && entry.bucket !== 'supplemental' && entry.fileName !== 'critical-infra-ic3.json')
                    .map(async (entry: any) => {
                        const res = await fetch(`./data/supplemental/${entry.fileName}`);
                        const data = await res.json();
                        const sectorKey = entry.sector.toLowerCase().replace(/_/g, ' ').replace('critical ', '');
                        sectorSpecificData[sectorKey] = data;
                    });
                
                await Promise.all(sectorSpecificPromises);

                const energyFile = attemptRatesIndex.find((f: any) => f.sector === 'energy');
                let energyAttemptRatesData: SectorSupplementalRecord[] | undefined = undefined;
                if (energyFile) {
                    const res = await fetch(`./data/attempt_rates/${energyFile.fileName}`);
                    energyAttemptRatesData = await res.json();
                }

                setDatasets({ 
                    ic3: ic3Data, 
                    orgCounts: orgCountsData,
                    energyOrgCounts: energyOrgCountsData,
                    successRates: successRatesData,
                    ciIC3: ciIC3Data,
                    actorTargeting: actorTargetingData,
                    majorCampaigns: majorCampaignsData,
                    initialAccess: initialAccessDataRes,
                    sectorSpecific: sectorSpecificData,
                    energyAttemptRates: energyAttemptRatesData
                });
            } catch (e) {
                setError('Failed to load critical datasets required for calculation. Please check console for details.');
                console.error(e);
            } finally {
                setIsDataLoading(false);
            }
        };
        loadAllData();
    }, []);

    const datasetStatus = useMemo(() => {
        if (isDataLoading) return { ready: false, message: 'Loading datasets...' };
        if (!datasets) return { ready: false, message: 'Datasets failed to load.' };
    
        const badges: {name: string, version: string | number, ok: boolean}[] = [];
        const missing: string[] = [];
        
        const ic3Years = Object.keys(datasets.ic3).map(Number).sort((a, b) => b - a);
        const orgCountYears = Object.keys(datasets.orgCounts).map(Number).sort((a, b) => b - a);
        badges.push({ name: 'IC3', version: ic3Years[0] || 'N/A', ok: ic3Years.length > 0 });
        badges.push({ name: 'SUSB', version: orgCountYears[0] || 'N/A', ok: orgCountYears.length > 0 });
        badges.push({ name: 'Success Rates', version: `${Object.keys(datasets.successRates).length} buckets`, ok: Object.keys(datasets.successRates).length > 0});
        
        const uniqueSectors = [...new Set(scenarios.map(s => s.sector).filter(Boolean))];
        // Fix: Explicitly type `sector` as a string to resolve type inference issues where it was being treated as `unknown`.
        uniqueSectors.forEach((sector: string) => {
            const sectorName = sector.toLowerCase();
            const sectorYears = datasets.ciIC3
                .filter(d => d.sector.some(s => s.toLowerCase() === sectorName))
                .map(d => new Date(d.publicationDate).getFullYear())
                .sort((a,b) => b-a);
            
            const latestYear = sectorYears[0];
            const badgeName = sector.length > 15 ? `${sector.substring(0,12)}...` : sector;
            if (latestYear) {
                badges.push({ name: `${badgeName}`, version: `IC3 ${latestYear}`, ok: true });
            } else {
                 badges.push({ name: `${badgeName}`, version: `IC3 N/A`, ok: false });
                 missing.push(`${badgeName} IC3 data`);
            }
        });
    
        if (missing.length > 0) {
            return { ready: false, message: `Missing: ${missing.join(', ')}`, badges };
        }
    
        return { ready: true, message: 'All datasets ready.', badges };

    }, [datasets, scenarios, isDataLoading]);
    
    const handleLoadFromHistory = (runId: string) => {
        if (!runId) return;
        const run = runHistory.find(r => r.id === runId);
        if (run) {
            setScenarios(run.results.map(r => r.scenario));
            setResults(run.results);
        }
        setSelectedHistoryId(''); // Reset selection
    };
    
    const handleUpdateScenario = (index: number, updatedScenario: RiskScenario) => {
        const newScenarios = [...scenarios];
        newScenarios[index] = updatedScenario;
        setScenarios(newScenarios);
    };

    const handleAddScenario = () => {
        setScenarios([...scenarios, { id: uuidv4(), baseYear: new Date().getFullYear(), lookbackYears: 1, darkNumber: 33, bucket: '', sophistication: '', targetProfile: '', actor_ids: [], vectors: '', sector: '', region: 'US', signals: [], isTargetLucrative: false, areSystemsHighValue: false, hasExternalSupport: false }]);
    };

    const handleRemoveScenario = (index: number) => {
        if (scenarios.length > 1) {
            setScenarios(scenarios.filter((_, i) => i !== index));
        }
    };

    const handleCalculate = async () => {
        if (!datasets) {
            setError("Datasets are not loaded. Cannot perform calculation.");
            return;
        }
        const validScenarios = scenarios.filter(s => s.bucket && s.sophistication && s.actor_ids.length > 0 && s.sector);
        if (validScenarios.length === 0) return;

        setIsLoading(true);
        setError(null);
        setResults(validScenarios.map(s => ({ id: s.id, scenario: s, status: 'loading', lambda_mean: null, lambda_low: null, lambda_high: null, headline: null, summary: '', justification: '' })));

        const allResults: AttemptCalculationResult[] = [];

        for (const scenario of validScenarios) {
            try {
                // Map CI Sector to a generic targetProfile for the current model
                const scenarioWithProfile = { ...scenario, targetProfile: 'critical_infrastructure' as const };

                const yearsToCalc = Array.from({ length: scenario.lookbackYears }, (_, i) => scenario.baseYear - i);
                const timeline: YearlyCalculation[] = [];
                let overallError: string | undefined;
                
                let ic3Version: string | undefined;
                let susbVersion: string | undefined;

                for (const year of yearsToCalc) {
                    try {
                        const successDataForBucket = datasets.successRates[scenario.bucket]?.data;
                        if (!successDataForBucket) throw new Error(`Missing success rate data for bucket: ${scenario.bucket}`);
                        
                        const attemptResult = computeAttemptRate({ scenario: {...scenarioWithProfile, baseYear: year}, datasets, supplementalSignals: scenario.signals });
                        const successResult = computeSuccessRate({ scenario: scenarioWithProfile, successData: successDataForBucket, supplementalSignals: scenario.signals });
                        const narrative = await generateYearlyAttemptsNarrative(scenarioWithProfile, attemptResult, successResult);
                        
                        timeline.push({ 
                            year, 
                            ...attemptResult, 
                            ...narrative,
                            success_rate_mean: successResult.success_rate_mean,
                            success_rate_low: successResult.success_rate_low,
                            success_rate_high: successResult.success_rate_high,
                            successCalculationLedger: successResult.calculationLedger,
                        });
                    } catch (yearErr) {
                         const message = yearErr instanceof Error ? yearErr.message : `An unknown error occurred for year ${year}.`;
                         timeline.push({ year, error: message, lambda_mean: 'N/A', lambda_low: 'N/A', lambda_high: 'N/A', headline: 'N/A', summary: 'Analysis failed for this year.', justification: '' });
                         overallError = "One or more years failed analysis.";
                    }
                }

                const headlineData = timeline.find(t => t.year === scenario.baseYear) || timeline[0];
                if (!headlineData) throw new Error("No calculation data was produced.");
                
                ic3Version = headlineData.sourceExtraction?.find(s => s.source_id.includes('IC3'))?.dataset_version;
                susbVersion = headlineData.sourceExtraction?.find(s => s.source_id.includes('SUSB'))?.dataset_version;
                
                const finalResult: AttemptCalculationResult = {
                    id: scenario.id,
                    scenario: scenario,
                    status: 'completed',
                    ...headlineData,
                    timeline: timeline,
                    error: overallError,
                    datasetHashes: {
                        ic3Version,
                        susbVersion,
                        calculationHash: 'sha256-deterministic-v2-placeholder',
                        narrativeModelVersion: 'gemini-2.5-flash',
                    }
                };
                
                allResults.push(finalResult);
                setResults(current => current.map(r => (r.id === scenario.id ? finalResult : r)));
                
                // Auditing & Logging
                await addLog({
                    id: uuidv4(),
                    timestamp: Date.now(),
                    scenarioHash: await cyrb53Hash(JSON.stringify(scenario)),
                    datasetVersions: { ic3: ic3Version, susb: susbVersion, success: datasets.successRates[scenario.bucket]?.version },
                    supplementalSignalHashes: await Promise.all((scenario.signals || []).map(s => cyrb53Hash(JSON.stringify(s)))),
                    deterministicOutputs: headlineData,
                    geminiResponseId: finalResult.datasetHashes?.narrativeModelVersion || 'gemini-2.5-flash',
                    user: 'analyst@example.com' // Placeholder user
                });


            } catch (err) {
                const message = err instanceof Error ? err.message : `An unknown error occurred for ${scenario.actor_ids.join(', ')}.`;
                allResults.push({ id: scenario.id, scenario, status: 'error', error: message, lambda_mean: null, lambda_low: null, lambda_high: null, headline: null, summary: '', justification: '' });
                setResults(current => current.map(r => (r.id === scenario.id ? allResults[allResults.length - 1] : r)));
            }
        }
        
        const newRun: SavedYearlyAttempts = { id: uuidv4(), timestamp: Date.now(), results: allResults };
        setRunHistory(prevHistory => {
            const updatedHistory = [newRun, ...prevHistory].slice(0, 50);
            localStorage.setItem('ctiYearlyAttemptsReports', JSON.stringify(updatedHistory));
            return updatedHistory;
        });
        setIsLoading(false);
    };

    const isCalculateDisabled = isLoading || isDataLoading || !datasetStatus.ready || scenarios.some(s => !s.bucket || !s.sophistication || s.actor_ids.length === 0 || !s.sector);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-text-primary">Attempt-Rate Risk Register</h2>
            
            <div className="bg-card border border-border p-6 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Define Scenarios</h3>
                        <div className="flex items-center flex-wrap gap-2 mt-2" aria-live="polite">
                            <span className="text-xs font-semibold text-text-secondary">Dataset Status:</span>
                            {datasetStatus.badges?.map(b => (
                                <span key={b.name} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${b.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                                    {b.name} {b.version} {b.ok ? '✅' : '⚠'}
                                </span>
                            )) || <span className="text-xs text-yellow-400">{datasetStatus.message}</span>}
                        </div>
                    </div>
                    {runHistory.length > 0 && (
                        <div className="w-64">
                            <label className={commonLabelClass}>Load Recent Run</label>
                            <select value={selectedHistoryId} onChange={e => handleLoadFromHistory(e.target.value)} className={commonSelectClass} disabled={isLoading || isDataLoading}>
                                <option value="">Select a past run...</option>
                                {runHistory.map(run => (
                                    <option key={run.id} value={run.id}>
                                        {new Date(run.timestamp).toLocaleString()} ({run.results.length} scenarios)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {scenarios.map((scenario, index) => (
                        <ScenarioRow 
                            key={scenario.id} 
                            scenario={scenario} 
                            index={index} 
                            onUpdate={handleUpdateScenario} 
                            onRemove={handleRemoveScenario} 
                            isReadOnly={isLoading || isDataLoading}
                            datasets={datasets}
                        />
                    ))}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-border">
                    <button onClick={handleAddScenario} disabled={isLoading || isDataLoading} className="px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 bg-surface hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-primary">
                        + Add Scenario
                    </button>
                    <Tooltip text={isCalculateDisabled && !datasetStatus.ready ? datasetStatus.message : ''}>
                        <button onClick={handleCalculate} disabled={isCalculateDisabled} className="flex items-center justify-center gap-2 px-6 py-2 bg-accent-primary hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200">
                            {isLoading || isDataLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    {isDataLoading ? 'Loading Data...' : 'Calculating...'}
                                </>
                            ) : (
                                <>
                                    <CalendarTargetIcon className="w-5 h-5" />
                                    Calculate Attempt-Rates
                                </>
                            )}
                        </button>
                    </Tooltip>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span>
                </div>
            )}

            {results.length > 0 && datasets && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <ListChecksIcon className="w-6 h-6 text-accent-primary" />
                        <h3 className="text-xl font-semibold text-text-primary">Analysis Results</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {results.map(result => (
                            <ResultCard key={result.id} result={result} datasets={datasets} />
                        ))}
                    </div>
                </div>
            )}
            
            {signalsToReview && (
                <SignalsReviewModal
                    result={signalsToReview.result}
                    scenario={scenarios[signalsToReview.scenarioIndex]}
                    onApprove={(approvedSignals: any) => {}}
                    onCancel={() => {
                        setSignalsToReview(null);
                        setFetchingSignalsFor(null);
                    }}
                />
            )}
        </div>
    );
};
