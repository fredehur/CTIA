import React, { useState } from 'react';
import { generateAttackMap } from '../services/geminiService';
import type { AttackMapResult } from '../types';

const MITRE_TACTICS = [
    "Initial Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Defense Evasion",
    "Credential Access",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "Command and Control",
    "Exfiltration",
    "Impact"
];

export const ScenarioModeler: React.FC = () => {
    const [scenario, setScenario] = useState<string>('Ransomware targeting Healthcare sector');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<AttackMapResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateAttackMap(scenario);
            setResult(data);
        } catch (err: any) {
            console.error(err);
            let errorMessage = "Failed to generate the attack map. Please try again.";
            if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">MITRE ATT&CK Scenario Modeler</h2>
                    <p className="text-sm text-text-secondary">
                        Enter a specific scenario (e.g., "Ransomware targeting Healthcare", "System Intrusion via supply chain") to model the latest associated MITRE ATT&CK techniques based on live threat intelligence.
                    </p>
                </div>
                
                <div className="flex gap-4 items-end">
                    <div className="flex-grow flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Threat Scenario</label>
                        <input 
                            type="text" 
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            placeholder="e.g. Latest BlackBasta TTPs"
                        />
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !scenario.trim()}
                        className="h-[38px] px-6 bg-accent-primary text-white rounded-md text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                    >
                        {isLoading ? 'Modeling...' : 'Model Scenario'}
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                        {error}
                    </div>
                )}
            </div>

            {result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-md font-semibold text-text-primary">Active Techniques for: {result.scenario}</h3>
                        <div className="text-xs text-text-secondary">
                            Sources cited: {result.sources.length}
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-max">
                            {MITRE_TACTICS.map(tactic => {
                                const techniquesForTactic = result.techniques.filter(t => 
                                    t.tactic.toLowerCase().includes(tactic.toLowerCase()) || 
                                    tactic.toLowerCase().includes(t.tactic.toLowerCase())
                                );
                                
                                return (
                                    <div key={tactic} className="w-[260px] flex flex-col gap-3 shrink-0">
                                        <div className="font-semibold text-sm text-text-primary border-b border-border pb-2 sticky top-0 bg-background z-10">
                                            {tactic}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {techniquesForTactic.length > 0 ? (
                                                techniquesForTactic.map((tech, idx) => (
                                                    <div key={idx} className="bg-surface border border-accent-primary/20 rounded-md p-3 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary"></div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-mono font-bold text-text-primary">{tech.techniqueId}</span>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-text-primary mb-2 leading-tight">{tech.techniqueName}</h4>
                                                        <p className="text-xs text-text-secondary leading-snug line-clamp-3 group-hover:line-clamp-none transition-all">{tech.description}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-20 border border-dashed border-border rounded-md flex items-center justify-center opacity-50">
                                                    <span className="text-xs text-text-secondary">No current data</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {result.sources.length > 0 && (
                        <div className="bg-surface border border-border rounded-lg p-4 mt-6">
                            <h4 className="text-sm font-semibold text-text-primary mb-3">Intelligence Sources</h4>
                            <ul className="space-y-2">
                                {result.sources.map((source, i) => (
                                    <li key={i} className="text-xs flex flex-col gap-1">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline font-medium break-all">
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
