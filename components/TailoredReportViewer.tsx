
import React, { useMemo, useState, useRef } from 'react';
import type { ThreatLandscapeResult, ThreatLandscapeTrend, TailoredAnalysis, Memorandum } from '../types';
import { MitreIcon } from './icons/MitreIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { MemorandumDisplay } from './MemorandumDisplay';

interface TailoredReportViewerProps {
  report: ThreatLandscapeResult;
  orgProfile: string;
  activeAudience: string | null;
  onAudienceChange: (audience: string | null) => void;
  onExit: () => void;
  onGenerateMemorandum: (trendIndex: number, audience: string) => void;
}


const ReportContent: React.FC<{ 
    trend: ThreatLandscapeTrend; 
    audience: string | null; 
    trendIndex: number; 
    onGenerateMemorandum: (trendIndex: number, audience: string) => void;
}> = ({ trend, audience, trendIndex, onGenerateMemorandum }) => {
    if (audience === null) { // General Report
        return (
            <div className="space-y-3">
                 <div>
                    <h4 className="font-semibold text-accent-primary mb-1">Global Impact</h4>
                    <p className="text-sm text-text-secondary">{trend.globalImpact}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-accent-pro mb-1">Impact on Your Organization</h4>
                    <p className="text-sm text-text-secondary">{trend.organizationalImpact}</p>
                </div>
                {trend.mitreTechniques?.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-text-secondary text-sm mb-1">Associated MITRE ATT&CK® Techniques:</h4>
                        <div className="flex flex-wrap gap-2">
                            {trend.mitreTechniques.map(tech => (
                                <div key={tech.id} className="flex items-center gap-2 bg-surface text-text-secondary text-xs px-2 py-1 rounded-md border border-border">
                                    <MitreIcon className="w-3 h-3 text-accent-primary" />
                                    <span className="font-mono">{tech.id}</span>
                                    <span>{tech.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
            </div>
        );
    }
    
    // Tailored Report
    const tailored = trend.tailoredAnalyses?.find(a => a.audience === audience);

    if (!tailored) {
        return <p className="text-sm text-text-secondary italic">No analysis available for this audience.</p>;
    }

    const renderTailoredContent = () => {
        switch (tailored.status) {
            case 'loading':
                return (
                     <div className="flex items-center gap-2 text-text-secondary text-sm">
                        <svg className="animate-spin h-4 w-4 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating tailored analysis...</span>
                    </div>
                );
            case 'completed':
                 // Safe splitting of recommendations
                 const recs = tailored.recommendations && typeof tailored.recommendations === 'string'
                    ? tailored.recommendations.split('- ').filter(r => r.trim())
                    : [];

                 return (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-accent-primary mb-1">Impact for {audience}</h4>
                            <p className="text-sm text-text-secondary">{tailored.impact}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-accent-pro mb-1">Recommendations for {audience}</h4>
                            <ul className="text-sm text-text-secondary list-inside space-y-1">
                                 {recs.length > 0 
                                    ? recs.map((rec, i) => <li key={i} className="pl-2">{rec.trim()}</li>)
                                    : <li className="pl-2 italic">No recommendations available.</li>}
                            </ul>
                        </div>
                        <div className="pt-4 border-t border-dashed border-border">
                            {(() => {
                                switch (tailored.memorandumStatus) {
                                    case 'loading':
                                        return <div className="flex items-center gap-2 text-text-secondary text-sm">
                                            <svg className="animate-spin h-4 w-4 text-accent-pro" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Drafting Memorandum...</span>
                                        </div>;
                                    case 'completed':
                                        return tailored.memorandum ? <div className="mt-4"><MemorandumDisplay memo={tailored.memorandum} audience={audience} subject={trend.trendTitle} /></div> : null;
                                    case 'error':
                                        return <div className="text-sm text-red-400">Failed to generate memorandum.</div>;
                                    default:
                                        return <button 
                                            onClick={() => onGenerateMemorandum(trendIndex, audience)}
                                            className="text-sm font-semibold px-4 py-2 bg-accent-pro hover:opacity-90 rounded-md transition-colors"
                                        >
                                            Generate Memorandum
                                        </button>;
                                }
                            })()}
                        </div>
                    </div>
                );
            case 'error':
                return <div className="text-sm text-red-400">Failed to generate tailored view.</div>;
            default:
                 return null;
        }
    };
    return renderTailoredContent();
};

export const TailoredReportViewer: React.FC<TailoredReportViewerProps> = ({ report, orgProfile, activeAudience, onAudienceChange, onExit, onGenerateMemorandum }) => {
    const availableAudiences = useMemo(() => {
        const audiences = new Set<string>();
        report.trends.forEach(trend => {
            trend.tailoredAnalyses?.forEach(a => {
                if (a.status === 'completed' || a.status === 'loading') {
                    audiences.add(a.audience)
                }
            });
        });
        return Array.from(audiences);
    }, [report]);

    const NavItem: React.FC<{label: string; value: string | null}> = ({ label, value }) => {
        const isActive = activeAudience === value;
        return (
             <li 
                onClick={() => onAudienceChange(value)}
                className={`px-3 py-2 text-sm font-semibold rounded-md cursor-pointer transition-colors ${
                    isActive ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-surface'
                }`}
            >
                {label}
            </li>
        );
    };

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm h-full flex flex-col">
            <header className="bg-surface p-3 border-b border-border flex items-center gap-4">
                 <button 
                    onClick={onExit} 
                    className="p-2 rounded-full hover:bg-border transition-colors"
                    title="Back to Analysis Overview"
                >
                    <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <div>
                    <h2 className="text-sm font-semibold text-text-primary">Report Viewer</h2>
                    <p className="text-xs text-text-secondary">Viewing report for: {activeAudience || 'General Audience'}</p>
                </div>
            </header>
            <div className="flex flex-grow min-h-0">
                <nav className="w-1/4 border-r border-border p-4">
                    <ul className="space-y-2">
                        <NavItem label="General Report" value={null} />
                        {availableAudiences.length > 0 && <hr className="border-border my-2" />}
                        {availableAudiences.map(aud => <NavItem key={aud} label={aud} value={aud} />)}
                    </ul>
                </nav>
                <main className="w-3/4 p-4 overflow-y-auto">
                    <div className="space-y-6">
                         {report.trends.map((trend, index) => (
                             <div key={index} className="pb-6 border-b border-border last:border-b-0">
                                <h3 className="text-base font-semibold text-text-primary mb-3">
                                    <span className="text-text-secondary">Trend #{index + 1}:</span> {trend.trendTitle}
                                </h3>
                                <ReportContent 
                                    trend={trend} 
                                    audience={activeAudience}
                                    trendIndex={index}
                                    onGenerateMemorandum={onGenerateMemorandum}
                                />
                             </div>
                         ))}
                    </div>
                </main>
            </div>
        </div>
    );
};
