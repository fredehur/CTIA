
import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateThreatLandscape, generateThreatMatrix, validateThreatTrend, generateTailoredTrendAnalysis, refineReportWithChatStream, generateThreatRadarData, generateMemorandumForTrend, generateMemorandumForEvent, generateThreatMatrixPreview, generateSingleQuadrantTitle, checkForTrendUpdates } from '../services/geminiService';
import type { ThreatLandscapeResult, ThreatLandscapeTrend, ThreatMatrixResult, ThreatMatrixQuadrant, Source, TailoredAnalysis, ChatMessage, ThreatRadarResult, ThreatRadarPoint, Memorandum, ThreatMatrixPreview, SavedMemorandum, SavedThreatLandscape } from '../types';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { MitreIcon } from './icons/MitreIcon';
import { LinkIcon } from './icons/LinkIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ReportChat } from './ReportChat';
import { TailoredReportViewer } from './TailoredReportViewer';
import { MemorandumDisplay } from './MemorandumDisplay';
import { TrashIcon } from './icons/TrashIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

// --- TYPE GUARDS ---
function isMatrixResult(result: any): result is ThreatMatrixResult {
    return result && result.nationStateTech && result.criminalGeopolitical && !result.trends;
}
function isTopTrendsResult(result: any): result is ThreatLandscapeResult {
    return result && Array.isArray(result.trends);
}

const AUDIENCES = ['Technician', 'Manufacturing', 'SOC', 'Leadership', 'CISO', 'System Owner'];

export const ORG_PROFILE_PRESETS = [
    {
        label: 'Large European critical infrastructure provider',
        shortLabel: 'Large European Critical Infrastructure',
        value: 'Large European critical infrastructure provider (energy transmission, power grid operations, SCADA/ICS distribution, and cross-border interconnectors).'
    },
    {
        label: 'US Healthcare provider',
        shortLabel: 'US Healthcare Provider',
        value: 'A mid-sized US healthcare provider specializing in patient data management and electronic health records.'
    },
    {
        label: 'Financial Services & Banking',
        shortLabel: 'Financial Services & Banking',
        value: 'Global financial services institution handling multi-currency cross-border payment clearing and retail banking.'
    }
];

const QUARTERS = [
    { value: 1, label: 'Q1 (Jan – Mar)' },
    { value: 2, label: 'Q2 (Apr – Jun)' },
    { value: 3, label: 'Q3 (Jul – Sep)' },
    { value: 4, label: 'Q4 (Oct – Dec)' },
];

const YEARS = [2023, 2024, 2025, 2026, 2027, 2028];

const getQuarterDateRange = (sQ: number, sY: number, eQ: number, eY: number): { startDate: string; endDate: string; name: string } => {
    const qStartMonth = ['01-01', '04-01', '07-01', '10-01'][sQ - 1] || '01-01';
    const qEndMonth = ['03-31', '06-30', '09-30', '12-31'][eQ - 1] || '09-30';
    return {
        startDate: `${sY}-${qStartMonth}`,
        endDate: `${eY}-${qEndMonth}`,
        name: `Q${sQ} ${sY} – Q${eQ} ${eY}`
    };
};

// --- UTILITY FUNCTIONS ---
const getTimePeriod = (period: 'last_quarter' | 'last_6_months' | 'last_year'): { startDate: string; endDate: string; name: string } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
        case 'last_quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], name: 'Last Quarter' };
        case 'last_6_months':
            startDate.setMonth(startDate.getMonth() - 6);
            return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], name: 'Last 6 Months' };
        case 'last_year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], name: 'Last Year' };
    }
};

const QuarterlyWindowSelector: React.FC<{
    periodMode: 'quarterly' | 'relative';
    setPeriodMode: (mode: 'quarterly' | 'relative') => void;
    startQuarter: number;
    setStartQuarter: (q: number) => void;
    startYear: number;
    setStartYear: (y: number) => void;
    endQuarter: number;
    setEndQuarter: (q: number) => void;
    endYear: number;
    setEndYear: (y: number) => void;
    timePeriod: 'last_quarter' | 'last_6_months' | 'last_year';
    setTimePeriod: (p: 'last_quarter' | 'last_6_months' | 'last_year') => void;
    isOutlookMode: boolean;
    setIsOutlookMode: React.Dispatch<React.SetStateAction<boolean>>;
    activePeriod: { startDate: string; endDate: string; name: string };
    disabled?: boolean;
}> = ({
    periodMode,
    setPeriodMode,
    startQuarter,
    setStartQuarter,
    startYear,
    setStartYear,
    endQuarter,
    setEndQuarter,
    endYear,
    setEndYear,
    timePeriod,
    setTimePeriod,
    isOutlookMode,
    setIsOutlookMode,
    activePeriod,
    disabled = false
}) => {
    const selectClass = "w-full bg-surface border border-border rounded-md px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors h-8";

    return (
        <div className="p-3.5 bg-surface/40 border border-border rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-text-primary tracking-wide uppercase">
                        Temporal Horizon & Analysis Mode
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium bg-border/60 text-text-primary border border-border">
                        {activePeriod.name}
                    </span>
                </div>

                {/* Outlook Mode Toggle Button - Can be active at the same time */}
                <button
                    type="button"
                    onClick={() => setIsOutlookMode(prev => !prev)}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        isOutlookMode
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                            : 'bg-surface hover:bg-border border-border text-text-secondary'
                    }`}
                    title="Toggle forward-looking threat forecasting vs retrospective review (can be active concurrently with quarterly window)"
                >
                    <span>🔭</span>
                    <span>Outlook Mode: {isOutlookMode ? 'ACTIVE' : 'OFF'}</span>
                    <span className={`w-2 h-2 rounded-full ${isOutlookMode ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                </button>
            </div>

            {/* Mode Tabs: Quarterly Range vs Relative Window */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/50">
                <div className="flex rounded-md p-0.5 bg-background border border-border text-xs">
                    <button
                        type="button"
                        onClick={() => setPeriodMode('quarterly')}
                        disabled={disabled}
                        className={`px-3 py-1 rounded font-medium transition-all ${
                            periodMode === 'quarterly'
                                ? 'bg-accent-primary text-white shadow-xs'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        Quarterly Range
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriodMode('relative')}
                        disabled={disabled}
                        className={`px-3 py-1 rounded font-medium transition-all ${
                            periodMode === 'relative'
                                ? 'bg-accent-primary text-white shadow-xs'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        Relative Window
                    </button>
                </div>

                {periodMode === 'quarterly' && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="text-text-secondary text-[11px]">Range Presets:</span>
                        <button
                            type="button"
                            onClick={() => {
                                setStartQuarter(1);
                                setStartYear(2024);
                                setEndQuarter(3);
                                setEndYear(2026);
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                                startQuarter === 1 && startYear === 2024 && endQuarter === 3 && endYear === 2026
                                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-bold'
                                    : 'bg-surface hover:bg-border text-text-primary border-border'
                            }`}
                        >
                            Q1 2024 – Q3 2026
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStartQuarter(1);
                                setStartYear(2025);
                                setEndQuarter(4);
                                setEndYear(2026);
                            }}
                            className="px-2 py-0.5 rounded bg-surface hover:bg-border text-text-primary text-[11px] border border-border transition-colors"
                        >
                            Q1 2025 – Q4 2026
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStartQuarter(1);
                                setStartYear(2026);
                                setEndQuarter(4);
                                setEndYear(2027);
                            }}
                            className="px-2 py-0.5 rounded bg-surface hover:bg-border text-text-primary text-[11px] border border-border transition-colors"
                        >
                            2026 – 2027 Outlook
                        </button>
                    </div>
                )}
            </div>

            {/* Range Selectors */}
            {periodMode === 'quarterly' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                    <div>
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">From Quarter</label>
                        <select
                            value={startQuarter}
                            onChange={(e) => setStartQuarter(Number(e.target.value))}
                            className={selectClass}
                            disabled={disabled}
                        >
                            {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">From Year</label>
                        <select
                            value={startYear}
                            onChange={(e) => setStartYear(Number(e.target.value))}
                            className={selectClass}
                            disabled={disabled}
                        >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">To Quarter</label>
                        <select
                            value={endQuarter}
                            onChange={(e) => setEndQuarter(Number(e.target.value))}
                            className={selectClass}
                            disabled={disabled}
                        >
                            {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">To Year</label>
                        <select
                            value={endYear}
                            onChange={(e) => setEndYear(Number(e.target.value))}
                            className={selectClass}
                            disabled={disabled}
                        >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="pt-1 max-w-sm">
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Relative Window</label>
                    <select
                        value={timePeriod}
                        onChange={(e) => setTimePeriod(e.target.value as any)}
                        className={selectClass}
                        disabled={disabled}
                    >
                        <option value="last_quarter">Last Quarter (Trailing 3 Months)</option>
                        <option value="last_6_months">Last 6 Months (Trailing Half-Year)</option>
                        <option value="last_year">Last Year (Trailing 12 Months)</option>
                    </select>
                </div>
            )}

            {/* Informational Guidance bar */}
            <div className="flex items-center gap-2 text-[11px] pt-1">
                {isOutlookMode ? (
                    <span className="text-emerald-400 font-medium">
                        🔭 Outlook Mode Active: Anticipatory threat intelligence, adversary trajectories, and predictive defensive postures will be projected across {activePeriod.name}.
                    </span>
                ) : (
                    <span className="text-text-secondary">
                        Standard Review: Analysis will evaluate reported incidents and observed telemetry across {activePeriod.name}.
                    </span>
                )}
            </div>
        </div>
    );
};

const formatTopTrendsForClipboard = (report: ThreatLandscapeResult): string => {
    let markdown = `# ${report.reportTitle}\n\n`;
    report.trends.forEach((trend, index) => {
        markdown += `## Trend ${index + 1}: ${trend.trendTitle}\n\n`;
        if (trend.confidenceScore) {
            markdown += `**Confidence Score:** ${trend.confidenceScore} (${trend.validationSummary})\n\n`;
        }
        
        markdown += `**Global Impact:**\n${trend.globalImpact}\n\n`;
        markdown += `**Impact on Your Organization:**\n${trend.organizationalImpact}\n\n`;

        if (trend.correlatedRadarThreat) {
            markdown += `**Correlated Threat Projection (${trend.correlatedRadarThreat.name}):**\n`;
            markdown += `- Current: Motivation ${trend.correlatedRadarThreat.motivation.toFixed(1)}/10, Resources ${trend.correlatedRadarThreat.resources.toFixed(1)}/10\n`;
            if (trend.correlatedRadarThreat.quarterlyData && trend.correlatedRadarThreat.quarterlyData.length > 0) {
                const firstQuarter = trend.correlatedRadarThreat.quarterlyData[0];
                markdown += `- Projection (${firstQuarter.quarter}): Motivation ${firstQuarter.motivation.toFixed(1)}/10, Resources ${firstQuarter.resources.toFixed(1)}/10\n`;
            }
            markdown += `\n`;
        }

        if (trend.mitreTechniques && trend.mitreTechniques.length > 0) {
            markdown += `**Associated MITRE ATT&CK® Techniques:**\n`;
            trend.mitreTechniques.forEach(tech => markdown += `- ${tech.id}: ${tech.name}\n`);
            markdown += `\n`;
        }
        if (trend.sources && trend.sources.length > 0) {
            markdown += `**Sources:**\n`;
            trend.sources.forEach(source => markdown += `- [${source.title}](${source.uri})\n`);
            markdown += `\n`;
        }
        markdown += `----\n\n`;
    });
    return markdown;
};

const formatMatrixForClipboard = (result: ThreatMatrixResult): string => {
    let md = `# ${result.reportTitle}\n\n`;
    const formatQuadrant = (title: string, quadrant: ThreatMatrixQuadrant) => {
        let quadrantMd = `## ${title}\n\n`;
        quadrantMd += `### ${quadrant.title}\n\n`;
        if (quadrant.confidenceScore) {
            quadrantMd += `*   **Confidence Score:** ${quadrant.confidenceScore} (${quadrant.validationSummary})\n`;
        }
        quadrantMd += `*   **Insight:** ${quadrant.insight}\n`;
        quadrantMd += `*   **Objective:** ${quadrant.objective}\n`;
        quadrantMd += `*   **Relevance:** ${quadrant.relevance}\n`;
        quadrantMd += `*   **Sector Impacted:** ${quadrant.sectorImpacted}\n\n`;
        if (quadrant.sources && quadrant.sources.length > 0) {
            quadrantMd += `**Sources:**\n`;
            quadrant.sources.forEach(s => {
                quadrantMd += `*   [${s.title}](${s.uri})\n`;
            });
        }
        return quadrantMd;
    };
    md += formatQuadrant("Nation States – Technology Driver", result.nationStateTech) + '\n---\n\n';
    md += formatQuadrant("Nation States – Geopolitical Driver", result.nationStateGeopolitical) + '\n---\n\n';
    md += formatQuadrant("Criminals – Technology Driver", result.criminalTech) + '\n---\n\n';
    md += formatQuadrant("Criminals – Geopolitical Driver", result.criminalGeopolitical);
    return md;
};

const formatTailoredReportForClipboard = (report: ThreatLandscapeResult, audience: string, orgProfile: string): string => {
    let markdown = `# Tailored Threat Landscape for ${audience}\n`;
    markdown += `**Generated for:** ${orgProfile}\n\n`;
    report.trends.forEach((trend, index) => {
        const tailored = trend.tailoredAnalyses?.find(a => a.audience === audience);
        if (!tailored || tailored.status !== 'completed') return;

        markdown += `## Trend ${index + 1}: ${trend.trendTitle}\n\n`;
        if (trend.confidenceScore) {
             markdown += `**Confidence Score:** ${trend.confidenceScore} (${trend.validationSummary})\n\n`;
        }
        markdown += `### Impact for ${audience}\n${tailored.impact}\n\n`;
        markdown += `### Recommendations for ${audience}\n${tailored.recommendations}\n\n`;
        
        if (trend.correlatedRadarThreat) {
            markdown += `**Correlated Threat Projection (${trend.correlatedRadarThreat.name}):**\n`;
            markdown += `- Current: Motivation ${trend.correlatedRadarThreat.motivation.toFixed(1)}/10, Resources ${trend.correlatedRadarThreat.resources.toFixed(1)}/10\n`;
            if (trend.correlatedRadarThreat.quarterlyData && trend.correlatedRadarThreat.quarterlyData.length > 0) {
                const firstQuarter = trend.correlatedRadarThreat.quarterlyData[0];
                markdown += `- Projection (${firstQuarter.quarter}): Motivation ${firstQuarter.motivation.toFixed(1)}/10, Resources ${firstQuarter.resources.toFixed(1)}/10\n`;
            }
            markdown += `\n`;
        }

        if (trend.sources && trend.sources.length > 0) {
            markdown += `**Original Sources:**\n`;
            trend.sources.forEach(source => markdown += `- [${source.title}](${source.uri})\n`);
            markdown += `\n`;
        }
        markdown += `----\n\n`;
    });
    return markdown;
};


// --- VALIDATION & CONFIDENCE COMPONENTS ---
export const ConfidenceBadge: React.FC<{ score: 'Low' | 'Medium' | 'High' }> = ({ score }) => {
    const styles = {
        Low: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
        Medium: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
        High: 'bg-green-900/50 text-green-300 border-green-700/50',
    };
    return (
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[score]}`}>
            {score}
        </div>
    );
};

export const ValidationStatus: React.FC<{
    status: ThreatMatrixQuadrant['validationStatus'],
    score?: ThreatMatrixQuadrant['confidenceScore'],
    summary?: ThreatMatrixQuadrant['validationSummary']
}> = ({ status, score, summary }) => {
    switch (status) {
        case 'validating':
            return (
                <div className="flex items-center gap-2 text-xs text-accent-primary animate-pulse">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                </div>
            );
        case 'validated':
            return score ? (
                <div className="flex flex-col items-end gap-1" title={summary}>
                    <span className="text-text-secondary text-[10px] uppercase font-semibold">Confidence</span>
                    <ConfidenceBadge score={score} />
                </div>
            ) : null;
        case 'error':
            return <div className="text-xs text-red-500 font-semibold">Validation Failed</div>;
        default:
            return <div className="h-9"></div>; // Placeholder to prevent layout shift
    }
};

// --- SUB-COMPONENTS for "Top Trends" Mode ---
export const InlineProjectionChart: React.FC<{ threat: ThreatRadarPoint }> = ({ threat }) => {
    const width = 300;
    const height = 120;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };

    const plotData = useMemo(() => [
        { quarter: 'Current', motivation: threat.motivation, resources: threat.resources },
        ...threat.quarterlyData
    ], [threat]);

    const xScale = (index: number) => {
        if (plotData.length <= 1) return margin.left;
        return margin.left + (index / (plotData.length - 1)) * (width - margin.left - margin.right);
    };
    const yScale = (value: number) => height - margin.bottom - ((value - 1) / 9) * (height - margin.top - margin.bottom);

    const motivationPath = plotData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.motivation)}`).join(' ');
    const resourcesPath = plotData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.resources)}`).join(' ');
    
    return (
        <div className="bg-surface/50 p-2 rounded-md">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-sans">
                {/* Y-axis grid lines and labels */}
                {[1, 5, 10].map(val => (
                    <g key={val} className="text-[8px] fill-text-secondary">
                        <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                        <text x={margin.left - 4} y={yScale(val)} dy="0.32em" textAnchor="end">{val}</text>
                    </g>
                ))}
                
                {/* X-axis labels */}
                {plotData.map((d, i) => (
                    <text key={d.quarter} x={xScale(i)} y={height - margin.bottom + 10} textAnchor="middle" className="text-[8px] fill-text-secondary">{d.quarter}</text>
                ))}

                {/* Lines and points */}
                <path d={motivationPath} fill="none" stroke="#4B5563" strokeWidth="1.5" />
                <path d={resourcesPath} fill="none" stroke="#000000" strokeWidth="1.5" />
                {plotData.map((d, i) => (
                    <g key={`points-${i}`}>
                        <circle cx={xScale(i)} cy={yScale(d.motivation)} r="2.5" fill="#4B5563" />
                        <circle cx={xScale(i)} cy={yScale(d.resources)} r="2.5" fill="#000000" />
                    </g>
                ))}

                {/* Legend */}
                <g transform={`translate(${margin.left}, 0)`}>
                    <rect x="0" y="0" width="8" height="8" fill="#4B5563" rx="2"/>
                    <text x="12" y="7" className="text-[9px] fill-text-primary">Motivation</text>
                    <rect x="70" y="0" width="8" height="8" fill="#000000" rx="2"/>
                    <text x="82" y="7" className="text-[9px] fill-text-primary">Resources</text>
                </g>
            </svg>
        </div>
    );
};

// Robust renderImpactContent to handle various string formats with the specific layout requested
const renderImpactContent = (content: string) => {
    // Check for empty or error state or undefined
    if (typeof content !== 'string' || !content || content.includes("Analysis yielded no specific")) {
        return <p className="text-sm text-text-secondary italic">Analysis yielded no specific impact data.</p>;
    }

    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Identify components based on structure: Headline (first non-bullet), Paragraphs, Bullets
    let headline: string | null = null;
    const paragraphs: string[] = [];
    const bullets: string[] = [];

    // Parse loop
    let foundHeadline = false;
    for (const line of lines) {
        const cleanLine = line.trim();
        const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*') || cleanLine.startsWith('•') || /^\d+\./.test(cleanLine);
        
        if (!foundHeadline && !isBullet && cleanLine.length < 150) { // Assume short first line is headline
            headline = cleanLine.replace(/^\*\*/, '').replace(/\*\*$/, ''); // Remove Markdown bold chars if present
            foundHeadline = true;
        } else if (isBullet) {
            bullets.push(cleanLine.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''));
        } else {
            paragraphs.push(cleanLine);
        }
    }

    return (
        <div className="space-y-3">
            {headline && (
                <h5 className="font-bold text-text-primary text-sm border-l-2 border-accent-primary pl-2 leading-tight">
                    {headline}
                </h5>
            )}
            
            {paragraphs.length > 0 && (
                <div className="text-sm text-text-secondary space-y-2">
                    {paragraphs.map((p, idx) => (
                        <p key={idx} className="leading-relaxed">{p}</p>
                    ))}
                </div>
            )}

            {bullets.length > 0 && (
                <ul className="space-y-1.5 pl-4 mt-2">
                    {bullets.map((b, idx) => (
                        <li key={idx} className="text-xs text-text-secondary list-disc">
                            {b}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const TrendCard: React.FC<{ trend: ThreatLandscapeTrend, trendNumber: number, onAcceptUpdate: () => void, onRejectUpdate: () => void }> = ({ trend, trendNumber, onAcceptUpdate, onRejectUpdate }) => {
    return (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-text-primary max-w-lg">Trend #{trendNumber}: {trend.trendTitle}</h3>
                <ValidationStatus status={trend.validationStatus} score={trend.confidenceScore} summary={trend.validationSummary} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col h-full">
                    <h4 className="font-semibold text-accent-primary mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span> Global Impact
                    </h4>
                    <div className="flex-grow bg-surface/30 rounded-md p-3 border border-border/50">
                        {renderImpactContent(trend.globalImpact)}
                    </div>
                </div>
                <div className="flex flex-col h-full">
                    <h4 className="font-semibold text-accent-pro mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-pro"></span> Impact on Your Org
                    </h4>
                    <div className="flex-grow bg-surface/30 rounded-md p-3 border border-border/50">
                        {renderImpactContent(trend.organizationalImpact)}
                    </div>
                </div>
            </div>
            <div className="mt-6">
                {trend.mitreTechniques && trend.mitreTechniques.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">Associated MITRE ATT&CK® Techniques</h4>
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
                {trend.sources && trend.sources.length > 0 && (
                    <div className="mt-6 border-t border-border pt-4">
                        <h4 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-3">References</h4>
                        <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                        {trend.sources.map((source, index) => (
                            <li key={index}>
                                <span className="italic">{source.title || 'Untitled Source'}</span>. Available at: <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline break-all">{source.uri}</a>
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>
            {trend.correlatedRadarThreat && (
                <div className="mt-4 pt-4 border-t border-dashed border-border">
                    <h4 className="font-semibold text-text-secondary text-sm mb-2">Correlated Threat Projection: <span className="text-accent-primary italic">{trend.correlatedRadarThreat.name}</span></h4>
                    <InlineProjectionChart threat={trend.correlatedRadarThreat} />
                </div>
            )}
            
            {trend.updateStatus === 'checking' && (
                <div className="mt-4 p-3 bg-surface/50 rounded-md text-sm flex items-center justify-center gap-2 text-accent-primary animate-pulse">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <span>Checking for new intelligence...</span>
                </div>
            )}

            {trend.updateStatus === 'no_update' && (
                <div className="mt-4 p-3 bg-surface/50 rounded-md text-sm text-center text-text-secondary animate-fade-in">
                    No significant new intelligence found for this trend.
                </div>
            )}

            {trend.updateStatus === 'update_available' && trend.updateSuggestion && (
                <div className="mt-4 p-4 bg-accent-pro/10 border border-accent-pro/50 rounded-lg space-y-3 animate-fade-in">
                    <h5 className="font-bold text-accent-pro">Update Suggested</h5>
                    <p className="text-sm italic text-text-primary">"{trend.updateSuggestion.summaryOfChanges}"</p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onRejectUpdate} className="px-3 py-1 text-xs font-semibold rounded-md bg-surface hover:bg-border text-text-primary transition-colors">Reject</button>
                        <button onClick={onAcceptUpdate} className="px-3 py-1 text-xs font-semibold rounded-md bg-accent-pro hover:opacity-90 text-white transition-colors">Accept & Update</button>
                    </div>
                </div>
            )}
            {trend.updateStatus === 'error' && (
                 <div className="mt-4 p-3 bg-red-900/30 rounded-md text-sm text-center text-red-300 animate-fade-in">
                    Error checking for updates.
                </div>
            )}
        </div>
    );
};

// Simplified TopTrendsView without tabs
const TopTrendsView: React.FC<{ result: ThreatLandscapeResult; orgProfile: string; onAcceptUpdate: (index: number) => void; onRejectUpdate: (index: number) => void; }> = ({ result, orgProfile, onAcceptUpdate, onRejectUpdate }) => {
    const displayTitle = result.reportTitle.length > 100 
        ? "Cyber Threat Landscape Report" 
        : result.reportTitle;

    return (
        <div className="space-y-6">
            <header className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold text-text-primary">{displayTitle}</h2>
                <p className="text-text-secondary text-sm mt-1">Generated for: {orgProfile}</p>
            </header>
            
            <main>
                {/* Safe access to trends array using short-circuit or fallback */}
                {(result.trends || []).map((trend, index) => (
                    <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <TrendCard 
                            trend={trend}
                            trendNumber={index + 1}
                            onAcceptUpdate={() => onAcceptUpdate(index)}
                            onRejectUpdate={() => onRejectUpdate(index)}
                        />
                    </div>
                ))}
                {(!result.trends || result.trends.length === 0) && (
                    <div className="p-6 text-center text-text-secondary italic">
                        No trends were generated. Please try again with a different profile or more specific instructions.
                    </div>
                )}
            </main>
        </div>
    );
};

// --- SUB-COMPONENTS for "Structured Matrix" Mode ---
const QuadrantCard: React.FC<{ quadrant: ThreatMatrixQuadrant; actor: string; driver: string; className: string }> = ({ quadrant, actor, driver, className }) => (
    <div className={`p-4 ${className} flex flex-col bg-card`}>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-text-primary mb-1 pr-2">{actor} – {driver} Driver: <span className="italic">{quadrant.title}</span></h3>
            <ValidationStatus status={quadrant.validationStatus} score={quadrant.confidenceScore} summary={quadrant.validationSummary} />
        </div>
        <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong className="font-semibold text-text-primary">Insight:</strong> {quadrant.insight}</li>
            <li><strong className="font-semibold text-text-primary">Objective:</strong> {quadrant.objective}</li>
            <li><strong className="font-semibold text-text-primary">Relevance:</strong> {quadrant.relevance}</li>
            <li><strong className="font-semibold text-text-primary">Sector Impacted:</strong> {quadrant.sectorImpacted}</li>
        </ul>
      </div>
      {quadrant.sources && quadrant.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
              <h4 className="font-semibold text-text-secondary text-xs mb-2 uppercase">Sources</h4>
              <div className="flex flex-wrap gap-2">
                  {quadrant.sources.map((source, index) => (
                      <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 text-xs bg-surface text-accent-primary hover:text-text-primary hover:bg-border px-2 py-1 rounded-md border border-border transition-colors"
                        title={source.title}
                      >
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-32">{source.title}</span>
                      </a>
                  ))}
              </div>
          </div>
      )}
    </div>
);
const StructuredMatrixView: React.FC<{ result: ThreatMatrixResult }> = ({ result }) => (
    <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">{result.reportTitle}</h2>
        <div className="border border-border shadow-md" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: '1px' }}>
            <div className="row-start-1 col-start-1 bg-card"></div>
            <div className="row-start-1 col-start-2 bg-surface p-2 text-center font-bold text-text-primary">Technology drivers</div>
            <div className="row-start-1 col-start-3 bg-surface p-2 text-center font-bold text-text-primary">Geopolitical drivers</div>

            <div className="row-start-2 col-start-1 bg-surface text-text-primary font-bold flex items-center justify-center p-2" style={{ minWidth: '80px' }}>
                <span className="transform -rotate-90 whitespace-nowrap tracking-widest uppercase">Nation States</span>
            </div>
            <QuadrantCard quadrant={result.nationStateTech} actor="Nation States" driver="Technology" className="border-l-4 border-accent-primary" />
            <QuadrantCard quadrant={result.nationStateGeopolitical} actor="Nation States" driver="Geopolitical" className="border-l-4 border-accent-primary" />

            <div className="row-start-3 col-start-1 bg-surface text-text-primary font-bold flex items-center justify-center p-2">
                <span className="transform -rotate-90 whitespace-nowrap tracking-widest uppercase">Criminals</span>
            </div>
            <QuadrantCard quadrant={result.criminalTech} actor="Cyber Criminals" driver="Technology" className="border-l-4 border-accent-pro" />
            <QuadrantCard quadrant={result.criminalGeopolitical} actor="Cyber Criminals" driver="Geopolitical" className="border-l-4 border-accent-pro" />
        </div>
    </div>
);
const MatrixSkeletonLoader: React.FC = () => {
    const SkeletonQuadrant: React.FC<{ text: string }> = ({ text }) => (
        <div className="bg-card p-4 animate-pulse flex flex-col justify-center items-center text-center min-h-[250px]">
            <SearchIcon className="w-8 h-8 text-border mb-2" />
            <p className="text-text-secondary text-sm">{text}</p>
        </div>
    );
    return (
        <div>
            <div className="h-8 bg-surface rounded w-1/2 mb-2 animate-pulse"></div>
            <div className="border border-border" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: '1px' }}>
                <div className="row-start-1 col-start-1 bg-card"></div>
                <div className="row-start-1 col-start-2 bg-surface p-2 text-center font-bold text-text-primary">Technology drivers</div>
                <div className="row-start-1 col-start-3 bg-surface p-2 text-center font-bold text-text-primary">Geopolitical drivers</div>
                <div className="row-start-2 col-start-1 bg-surface text-text-primary font-bold flex items-center justify-center p-2" style={{ minWidth: '80px' }}><span className="transform -rotate-90 whitespace-nowrap tracking-widest uppercase">Nation States</span></div>
                <SkeletonQuadrant text="Searching for Nation State & Technology trends..." />
                <SkeletonQuadrant text="Searching for Nation State & Geopolitical trends..." />
                <div className="row-start-3 col-start-1 bg-surface text-text-primary font-bold flex items-center justify-center p-2"><span className="transform -rotate-90 whitespace-nowrap tracking-widest uppercase">Criminals</span></div>
                <SkeletonQuadrant text="Searching for Criminal & Technology trends..." />
                <SkeletonQuadrant text="Searching for Criminal & Geopolitical trends..." />
            </div>
        </div>
    );
};

const MatrixPreviewView: React.FC<{
    preview: ThreatMatrixPreview,
    onAccept: () => void,
    onRegenerateAll: () => void,
    onRegenerateQuadrant: (quadrantKey: keyof Omit<ThreatMatrixPreview, 'reportTitle'>) => void,
    onPreviewChange: (updatedPreview: ThreatMatrixPreview) => void,
    isAnalyzing: boolean,
    isRegeneratingQuadrant: keyof Omit<ThreatMatrixPreview, 'reportTitle'> | null,
}> = ({ preview, onAccept, onRegenerateAll, onRegenerateQuadrant, onPreviewChange, isAnalyzing, isRegeneratingQuadrant }) => {
    
    const QuadrantPreview: React.FC<{
        title: string;
        trend: string;
        quadrantKey: keyof Omit<ThreatMatrixPreview, 'reportTitle'>;
        className: string;
        isRegenerating: boolean;
        onTrendChange: (value: string) => void;
        onRegenerate: () => void;
    }> = ({ title, trend, className, isRegenerating, onTrendChange, onRegenerate }) => (
        <div className={`p-3 rounded-lg border flex flex-col justify-between min-h-[200px] transition-all ${className}`}>
            <div>
                <h4 className="font-bold text-text-secondary text-xs uppercase tracking-wider mb-1">{title}</h4>
                <textarea
                    value={trend}
                    onChange={(e) => onTrendChange(e.target.value)}
                    rows={5}
                    className="w-full bg-transparent border-0 text-base text-text-primary p-1.5 focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:bg-surface/50 rounded-md transition-all resize-none"
                    disabled={isRegenerating}
                />
            </div>
            <button 
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="mt-2 text-xs font-semibold text-accent-primary hover:text-text-primary bg-surface/50 hover:bg-border px-3 py-1 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
            >
                {isRegenerating ? (
                    <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        Searching...
                    </>
                ) : (
                    <>
                        <SearchIcon className="w-3 h-3" />
                        Regenerate Trend
                    </>
                )}
            </button>
        </div>
    );

    const handleReportTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onPreviewChange({ ...preview, reportTitle: e.target.value });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <input
                type="text"
                value={preview.reportTitle}
                onChange={handleReportTitleChange}
                className="text-2xl font-bold text-text-primary bg-transparent border-0 border-b-2 border-border focus:border-accent-primary focus:ring-0 w-full p-1 transition-colors"
            />
            <p className="text-text-secondary mb-4">The AI has identified the following potential trends for the threat matrix. Review, edit, or regenerate trends, then proceed with a deep analysis and evidence gathering.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <QuadrantPreview 
                    title="Nation State / Tech" 
                    trend={preview.nationStateTechTitle}
                    quadrantKey="nationStateTechTitle"
                    onTrendChange={(value) => onPreviewChange({ ...preview, nationStateTechTitle: value })}
                    onRegenerate={() => onRegenerateQuadrant('nationStateTechTitle')}
                    isRegenerating={isRegeneratingQuadrant === 'nationStateTechTitle'}
                    className="bg-accent-primary/10 border-accent-primary/40" 
                />
                <QuadrantPreview 
                    title="Nation State / Geopolitical" 
                    trend={preview.nationStateGeopoliticalTitle}
                    quadrantKey="nationStateGeopoliticalTitle"
                    onTrendChange={(value) => onPreviewChange({ ...preview, nationStateGeopoliticalTitle: value })}
                    onRegenerate={() => onRegenerateQuadrant('nationStateGeopoliticalTitle')}
                    isRegenerating={isRegeneratingQuadrant === 'nationStateGeopoliticalTitle'}
                    className="bg-accent-primary/10 border-accent-primary/40" 
                />
                <QuadrantPreview 
                    title="Criminals / Tech" 
                    trend={preview.criminalTechTitle}
                    quadrantKey="criminalTechTitle"
                    onTrendChange={(value) => onPreviewChange({ ...preview, criminalTechTitle: value })}
                    onRegenerate={() => onRegenerateQuadrant('criminalTechTitle')}
                    isRegenerating={isRegeneratingQuadrant === 'criminalTechTitle'}
                    className="bg-accent-pro/10 border-accent-pro/40" 
                />
                <QuadrantPreview 
                    title="Criminals / Geopolitical" 
                    trend={preview.criminalGeopoliticalTitle}
                    quadrantKey="criminalGeopoliticalTitle"
                    onTrendChange={(value) => onPreviewChange({ ...preview, criminalGeopoliticalTitle: value })}
                    onRegenerate={() => onRegenerateQuadrant('criminalGeopoliticalTitle')}
                    isRegenerating={isRegeneratingQuadrant === 'criminalGeopoliticalTitle'}
                    className="bg-accent-pro/10 border-accent-pro/40" 
                />
            </div>

            <div className="flex justify-end gap-4 mt-4">
                <button onClick={onRegenerateAll} disabled={isAnalyzing || !!isRegeneratingQuadrant} className="px-6 py-2 bg-surface hover:bg-border disabled:bg-border disabled:cursor-not-allowed text-text-primary font-semibold rounded-lg transition-all">
                    Regenerate All
                </button>
                <button onClick={onAccept} disabled={isAnalyzing || !!isRegeneratingQuadrant} className="px-6 py-2 bg-accent-primary hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center gap-2">
                    {isAnalyzing ? (
                        <>
                         <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         Analyzing...
                        </>
                    ) : 'Accept & Deep Analyze'}
                </button>
            </div>
        </div>
    )
};


// --- MAIN COMPONENT ---
export const ThreatLandscape: React.FC = () => {
    const [landscapeMode, setLandscapeMode] = useState<'trends' | 'matrix' | 'event'>('trends');
    const [orgProfile, setOrgProfile] = useState<string>('Large European critical infrastructure provider (energy transmission, power grid operations, SCADA/ICS distribution, and cross-border interconnectors).');
    const [periodMode, setPeriodMode] = useState<'quarterly' | 'relative'>('quarterly');
    const [startQuarter, setStartQuarter] = useState<number>(1);
    const [startYear, setStartYear] = useState<number>(2024);
    const [endQuarter, setEndQuarter] = useState<number>(3);
    const [endYear, setEndYear] = useState<number>(2026);
    const [timePeriod, setTimePeriod] = useState<'last_quarter' | 'last_6_months' | 'last_year'>('last_quarter');
    const [isOutlookMode, setIsOutlookMode] = useState<boolean>(true);

    const activePeriod = useMemo(() => {
        if (periodMode === 'quarterly') {
            return getQuarterDateRange(startQuarter, startYear, endQuarter, endYear);
        }
        return getTimePeriod(timePeriod);
    }, [periodMode, startQuarter, startYear, endQuarter, endYear, timePeriod]);

    const [numTrends, setNumTrends] = useState<number>(3);
    const [trendGuidance, setTrendGuidance] = useState<string>('');
    const [eventDescription, setEventDescription] = useState('Russian hybrid warfare against European critical infrastructure outlook');
    const [eventContext, setEventContext] = useState('');
    const [savedMemorandums, setSavedMemorandums] = useState<SavedMemorandum[]>([]);
    const [activeMemorandumId, setActiveMemorandumId] = useState<string | null>(null);

    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStep, setGenerationStep] = useState<'idle' | 'preview' | 'full'>('idle');
    const [error, setError] = useState<string | null>(null);
    
    const [matrixResult, setMatrixResult] = useState<ThreatMatrixResult | null>(null);
    const [matrixPreview, setMatrixPreview] = useState<ThreatMatrixPreview | null>(null);
    const [topTrendsResult, setTopTrendsResult] = useState<ThreatLandscapeResult | null>(null);
    const [regeneratingQuadrant, setRegeneratingQuadrant] = useState<keyof Omit<ThreatMatrixPreview, 'reportTitle'> | null>(null);
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState<boolean>(false);
    
    const [copyButtonText, setCopyButtonText] = useState('Copy Report to Clipboard');
    const [saveButtonText, setSaveButtonText] = useState('Save Changes');
    
    const [selectedAudience, setSelectedAudience] = useState<string>(AUDIENCES[0]);
    const [activeAudienceView, setActiveAudienceView] = useState<string | null>(null);
    const [isTailoring, setIsTailoring] = useState<boolean>(false);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [reportViewMode, setReportViewMode] = useState<'overview' | 'reportViewer'>('overview');

    useEffect(() => {
        try {
            const storedMemos = localStorage.getItem('ctiEventMemorandums');
            if (storedMemos) {
                setSavedMemorandums(JSON.parse(storedMemos));
            }
        } catch (e) {
            console.error("Failed to load memos from local storage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('ctiEventMemorandums', JSON.stringify(savedMemorandums));
        } catch (e) {
            console.error("Failed to save memos to local storage", e);
        }
    }, [savedMemorandums]);

    const resetResults = () => {
        setError(null);
        setMatrixResult(null);
        setTopTrendsResult(null);
        setActiveMemorandumId(null);
        setActiveAudienceView(null);
        setReportViewMode('overview');
        setChatHistory([]);
        setMatrixPreview(null);
        setEventContext('');
    };

    const handleGenerateTrendsReport = async () => {
        if (!orgProfile.trim()) return;
        setIsGenerating(true);
        setGenerationStep('full');
        resetResults();

        try {
            const period = activePeriod;
            
            const trendsPromise = generateThreatLandscape(orgProfile, period, numTrends, trendGuidance, isOutlookMode);
            const radarPromise = generateThreatRadarData(orgProfile);

            const [trendsSettled, radarSettled] = await Promise.allSettled([trendsPromise, radarPromise]);
            
            if (trendsSettled.status === 'rejected') {
                throw trendsSettled.reason;
            }
            const trendsResponse = trendsSettled.value;

            const radarResponse = radarSettled.status === 'fulfilled' ? radarSettled.value : null;
            if (radarSettled.status === 'rejected') {
                console.warn("Radar data generation failed, correlation will be skipped.", radarSettled.reason);
            }

            const initialTrendsResult: ThreatLandscapeResult = {
                ...trendsResponse,
                trends: (trendsResponse.trends || []).map(t => ({ ...t, validationStatus: 'validating', tailoredAnalyses: [], updateStatus: 'idle' })),
            };

            // --- Correlation Step ---
            if (radarResponse?.threats && initialTrendsResult.trends) {
                initialTrendsResult.trends = initialTrendsResult.trends.map(trend => {
                    const lowerCaseTitle = (trend.trendTitle || "").toLowerCase();
                    const correlatedThreat = radarResponse.threats
                        .filter(radarThreat => radarThreat.name && lowerCaseTitle.includes(radarThreat.name.toLowerCase()))
                        .sort((a, b) => (b.name ? b.name.length : 0) - (a.name ? a.name.length : 0))[0]; // Get the most specific match
                    
                    return {
                        ...trend,
                        correlatedRadarThreat: correlatedThreat || undefined,
                    };
                });
            }

            setTopTrendsResult(initialTrendsResult);

             // Save to localStorage
            const newRecord: SavedThreatLandscape = {
                id: uuidv4(),
                timestamp: Date.now(),
                report: initialTrendsResult,
                orgProfile,
                mode: 'trends'
            };
            try {
                const existing = JSON.parse(localStorage.getItem('ctiLandscapeReports') || '[]');
                existing.unshift(newRecord);
                localStorage.setItem('ctiLandscapeReports', JSON.stringify(existing.slice(0, 50)));
            } catch (e) { console.error('Failed to save landscape report', e); }


            // --- Validation ---
            if (initialTrendsResult.trends) {
                const trendsValidationPromises = initialTrendsResult.trends.map((trend, index) =>
                    validateThreatTrend(trend.trendTitle, trend.globalImpact, trend.sources)
                    .then(validationData => ({ index, status: 'validated' as const, ...validationData }))
                    .catch(() => ({ index, status: 'error' as const }))
                );
                
                for (const p of trendsValidationPromises) {
                    p.then(validationResult => {
                        setTopTrendsResult(current => {
                            if (!current) return current;
                            const newTrends = [...current.trends];
                            const trendToUpdate = newTrends[validationResult.index];

                            if (trendToUpdate) {
                                trendToUpdate.validationStatus = validationResult.status;
                                    if (validationResult.status === 'validated') {
                                    trendToUpdate.confidenceScore = validationResult.confidenceScore;
                                    trendToUpdate.validationSummary = validationResult.validationSummary;
                                }
                            }
                            return { ...current, trends: newTrends };
                        });
                    });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
            setGenerationStep('idle');
        }
    };

    const handleGenerateMatrixPreview = async () => {
        if (!orgProfile.trim()) return;
        setIsGenerating(true);
        setGenerationStep('preview');
        resetResults();

        try {
            const period = activePeriod;
            const preview = await generateThreatMatrixPreview(orgProfile, period, isOutlookMode);
            setMatrixPreview(preview);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
            setGenerationStep('idle');
        }
    };
    
    const handleAnalyzeFromPreview = async () => {
        if (!matrixPreview) return;
        setIsGenerating(true);
        setGenerationStep('full');
        setError(null);
        setMatrixResult(null);

        try {
            const period = activePeriod;
            const matrixResponse = await generateThreatMatrix(orgProfile, period, matrixPreview, isOutlookMode);

            const initialMatrixResult: ThreatMatrixResult = {
                ...matrixResponse,
                nationStateTech: { ...matrixResponse.nationStateTech, validationStatus: 'validating' },
                nationStateGeopolitical: { ...matrixResponse.nationStateGeopolitical, validationStatus: 'validating' },
                criminalTech: { ...matrixResponse.criminalTech, validationStatus: 'validating' },
                criminalGeopolitical: { ...matrixResponse.criminalGeopolitical, validationStatus: 'validating' },
            };
            setMatrixResult(initialMatrixResult);

            // Save to localStorage
            const newRecord: SavedThreatLandscape = {
                id: uuidv4(),
                timestamp: Date.now(),
                report: initialMatrixResult,
                orgProfile,
                mode: 'matrix'
            };
            try {
                const existing = JSON.parse(localStorage.getItem('ctiLandscapeReports') || '[]');
                existing.unshift(newRecord);
                localStorage.setItem('ctiLandscapeReports', JSON.stringify(existing.slice(0, 50)));
            } catch (e) { console.error('Failed to save matrix report', e); }

            const quadrants: { key: keyof ThreatMatrixResult; data: ThreatMatrixQuadrant }[] = [
                { key: 'nationStateTech', data: matrixResponse.nationStateTech },
                { key: 'nationStateGeopolitical', data: matrixResponse.nationStateGeopolitical },
                { key: 'criminalTech', data: matrixResponse.criminalTech },
                { key: 'criminalGeopolitical', data: matrixResponse.criminalGeopolitical },
            ];
            const matrixValidationPromises = quadrants.map(q =>
                validateThreatTrend(q.data.title, q.data.insight, q.data.sources)
                .then(validationData => ({ key: q.key, status: 'validated' as const, ...validationData }))
                .catch(() => ({ key: q.key, status: 'error' as const }))
            );
            
            for (const p of matrixValidationPromises) {
                p.then(validationResult => {
                    setMatrixResult(current => {
                        if (!current) return current;
                        const newResult = { ...current };
                        const quadrantToUpdate = newResult[validationResult.key as keyof Omit<ThreatMatrixResult, 'reportTitle'>] as ThreatMatrixQuadrant;
                        
                        quadrantToUpdate.validationStatus = validationResult.status;
                        if (validationResult.status === 'validated') {
                            quadrantToUpdate.confidenceScore = validationResult.confidenceScore;
                            quadrantToUpdate.validationSummary = validationResult.validationSummary;
                        }
                        return newResult;
                    });
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
            setGenerationStep('idle');
        }
    };

    const handleRegenerateQuadrant = async (quadrantKey: keyof Omit<ThreatMatrixPreview, 'reportTitle'>) => {
        if (!orgProfile.trim() || !matrixPreview) return;
        setRegeneratingQuadrant(quadrantKey);
        try {
            const period = activePeriod;
            const quadrantTypeMap: { [key in typeof quadrantKey]: 'nationStateTech' | 'nationStateGeopolitical' | 'criminalTech' | 'criminalGeopolitical' } = {
                nationStateTechTitle: 'nationStateTech',
                nationStateGeopoliticalTitle: 'nationStateGeopolitical',
                criminalTechTitle: 'criminalTech',
                criminalGeopoliticalTitle: 'criminalGeopolitical'
            };
            const quadrantType = quadrantTypeMap[quadrantKey];

            const newTitle = await generateSingleQuadrantTitle(orgProfile, period, quadrantType);
            setMatrixPreview(prev => prev ? { ...prev, [quadrantKey]: newTitle } : null);
        } catch (err) {
            console.error(`Failed to regenerate ${quadrantKey}`, err);
            // Optionally, set an error state to be displayed on the quadrant
        } finally {
            setRegeneratingQuadrant(null);
        }
    };


    const handleGenerateEventMemorandum = async () => {
        if (!eventDescription.trim() || !orgProfile.trim()) return;
        setIsGenerating(true);
        setError(null);

        try {
            const period = activePeriod;
            const memo = await generateMemorandumForEvent(eventDescription, orgProfile, selectedAudience, eventContext, period, isOutlookMode);
            const newMemoRecord: SavedMemorandum = {
                id: uuidv4(),
                timestamp: Date.now(),
                eventDescription,
                orgProfile,
                targetAudience: selectedAudience,
                memorandum: memo,
                period: period.name,
                isOutlookMode,
            };
            setSavedMemorandums(prev => [newMemoRecord, ...prev]);
            setActiveMemorandumId(newMemoRecord.id);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteMemorandum = (idToDelete: string) => {
        setSavedMemorandums(prev => prev.filter(m => m.id !== idToDelete));
        if (activeMemorandumId === idToDelete) {
            setActiveMemorandumId(null);
        }
    };

    const activeMemorandum = useMemo(() => {
        return savedMemorandums.find(m => m.id === activeMemorandumId) || null;
    }, [savedMemorandums, activeMemorandumId]);


     const handleGenerateTailoredReport = async () => {
        if (!topTrendsResult) return;
        const audience = selectedAudience;
        setIsTailoring(true);
        setActiveAudienceView(audience);

        setTopTrendsResult(currentResult => {
            if (!currentResult) return null;
            const newTrends = currentResult.trends.map(trend => {
                const existingAnalysis = trend.tailoredAnalyses?.find(a => a.audience === audience);
                if (existingAnalysis) return trend;
                
                const newTailoredAnalyses = [
                    ...(trend.tailoredAnalyses || []),
                    { audience, status: 'loading' as const, impact: '', recommendations: '' }
                ];
                return { ...trend, tailoredAnalyses: newTailoredAnalyses };
            });
            return { ...currentResult, trends: newTrends };
        });

        const tailoringPromises = topTrendsResult.trends.map((trend, index) => (async () => {
            if (trend.tailoredAnalyses?.some(a => a.audience === audience && a.status === 'completed')) {
                return;
            }

            try {
                const tailoredData = await generateTailoredTrendAnalysis(
                    trend.trendTitle, trend.globalImpact, trend.organizationalImpact, orgProfile, audience
                );
                
                setTopTrendsResult(current => {
                    if (!current) return null;
                    const newTrends = [...current.trends];
                    const trendToUpdate = newTrends[index];
                    const analysisIndex = trendToUpdate.tailoredAnalyses?.findIndex(a => a.audience === audience) ?? -1;
                    const newAnalysis: TailoredAnalysis = { ...tailoredData, audience, status: 'completed' };
                    if (analysisIndex > -1) {
                        trendToUpdate.tailoredAnalyses![analysisIndex] = newAnalysis;
                    } else {
                        trendToUpdate.tailoredAnalyses = [...(trendToUpdate.tailoredAnalyses || []), newAnalysis];
                    }
                    return { ...current, trends: newTrends };
                });
            } catch (error) {
                setTopTrendsResult(current => {
                    if (!current) return null;
                    const newTrends = [...current.trends];
                    const trendToUpdate = newTrends[index];
                    const analysisIndex = trendToUpdate.tailoredAnalyses?.findIndex(a => a.audience === audience) ?? -1;
                    const errorAnalysis: TailoredAnalysis = { audience, status: 'error', impact: '', recommendations: '' };
                    if (analysisIndex > -1) {
                        trendToUpdate.tailoredAnalyses![analysisIndex] = errorAnalysis;
                    } else {
                        trendToUpdate.tailoredAnalyses = [...(trendToUpdate.tailoredAnalyses || []), errorAnalysis];
                    }
                    return { ...current, trends: newTrends };
                });
            }
        })());

        await Promise.all(tailoringPromises);
        setIsTailoring(false);
        setReportViewMode('reportViewer');
    };

    const handleGenerateMemorandum = async (trendIndex: number, audience: string) => {
        if (!topTrendsResult) return;
        
        // Set loading state
        setTopTrendsResult(current => {
            if (!current) return null;
            const newTrends = [...current.trends];
            const trendToUpdate = newTrends[trendIndex];
            if (!trendToUpdate) return current;
    
            const analysisIndex = trendToUpdate.tailoredAnalyses?.findIndex(a => a.audience === audience) ?? -1;
            if (analysisIndex > -1) {
                trendToUpdate.tailoredAnalyses![analysisIndex].memorandumStatus = 'loading';
            }
            return { ...current, trends: newTrends };
        });
    
        try {
            const trend = topTrendsResult.trends[trendIndex];
            const memoData = await generateMemorandumForTrend(
                trend.trendTitle,
                trend.globalImpact,
                trend.organizationalImpact,
                orgProfile,
                audience,
                trend.correlatedRadarThreat
            );
    
            // Set completed state
            setTopTrendsResult(current => {
                if (!current) return null;
                const newTrends = [...current.trends];
                const trendToUpdate = newTrends[trendIndex];
                if (!trendToUpdate) return current;
    
                const analysisIndex = trendToUpdate.tailoredAnalyses?.findIndex(a => a.audience === audience) ?? -1;
                if (analysisIndex > -1) {
                    trendToUpdate.tailoredAnalyses![analysisIndex].memorandum = memoData;
                    trendToUpdate.tailoredAnalyses![analysisIndex].memorandumStatus = 'completed';
                }
                return { ...current, trends: newTrends };
            });
    
        } catch (error) {
            // Set error state
            setTopTrendsResult(current => {
                if (!current) return null;
                const newTrends = [...current.trends];
                const trendToUpdate = newTrends[trendIndex];
                if (!trendToUpdate) return current;
    
                const analysisIndex = trendToUpdate.tailoredAnalyses?.findIndex(a => a.audience === audience) ?? -1;
                if (analysisIndex > -1) {
                    trendToUpdate.tailoredAnalyses![analysisIndex].memorandumStatus = 'error';
                }
                return { ...current, trends: newTrends };
            });
            console.error("Memorandum generation failed:", error);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !topTrendsResult) return;

        const newUserMessage: ChatMessage = { role: 'user', content: chatInput };
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const stream = await refineReportWithChatStream(topTrendsResult, chatHistory, chatInput, activeAudienceView);

            let fullResponseText = '';
            let jsonString = '';

            for await (const chunk of stream) {
                fullResponseText += chunk.text;
                // Buffer the stream, do not update state here to avoid "typing" effect
            }
            
            setChatHistory(prev => [...prev, { role: 'model', content: fullResponseText }]);

            const match = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
                jsonString = match[1];
            }
            
            if (jsonString) {
                try {
                    const updatedReportFromAI = JSON.parse(jsonString);
                    if (isTopTrendsResult(updatedReportFromAI)) {
                        const finalReport = {
                            ...updatedReportFromAI,
                            trends: updatedReportFromAI.trends.map((newTrend: ThreatLandscapeTrend, index: number) => {
                                const oldTrend = topTrendsResult.trends[index];
                                if (!oldTrend) return newTrend;

                                let finalTailoredAnalyses = newTrend.tailoredAnalyses || [];

                                // If we are editing a specific audience, merge old analyses to preserve them
                                if (activeAudienceView && oldTrend.tailoredAnalyses) {
                                    const otherAnalyses = oldTrend.tailoredAnalyses.filter(a => a.audience !== activeAudienceView);
                                    const currentAudienceAnalysis = newTrend.tailoredAnalyses?.find(a => a.audience === activeAudienceView);
                                    
                                    finalTailoredAnalyses = [...otherAnalyses];
                                    if (currentAudienceAnalysis) {
                                        finalTailoredAnalyses.push(currentAudienceAnalysis);
                                    }
                                }

                                return {
                                    ...newTrend,
                                    validationStatus: oldTrend.validationStatus,
                                    confidenceScore: oldTrend.confidenceScore,
                                    validationSummary: oldTrend.validationSummary,
                                    tailoredAnalyses: finalTailoredAnalyses,
                                };
                            })
                        };
                        setTopTrendsResult(finalReport);
                    }
                } catch (e) {
                    console.error("Failed to parse JSON from chat response", e);
                     setChatHistory(prev => [...prev, { role: 'model', content: "I tried to update the report but encountered a format error. Please try rephrasing your request." }]);
                }
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown chat error occurred.';
            setChatHistory(prev => [...prev, { role: 'model', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsChatLoading(false);
        }
    };
    
    const handleCopyToClipboard = () => {
        if (!topTrendsResult && !matrixResult) return;

        let markdownReport = '';
        
        if (activeAudienceView && topTrendsResult && topTrendsResult.trends.every(t => t.tailoredAnalyses?.find(a => a.audience === activeAudienceView && a.status === 'completed'))) {
            markdownReport = formatTailoredReportForClipboard(topTrendsResult, activeAudienceView, orgProfile);
        } else if (landscapeMode === 'matrix' && matrixResult) {
            markdownReport = formatMatrixForClipboard(matrixResult);
        } else if (landscapeMode === 'trends' && topTrendsResult) {
            markdownReport = formatTopTrendsForClipboard(topTrendsResult);
        } else {
             markdownReport = `# Cyber Threat Landscape Report\n\n**Generated for:** ${orgProfile}\n\n---\n\n`;
            if (matrixResult) {
                const matrixMd = formatMatrixForClipboard(matrixResult).replace(/^# .*\n\n/, '');
                markdownReport += `## Threat Matrix\n\n${matrixMd}\n\n---\n\n`;
            }
            if (topTrendsResult) {
                const trendsMd = formatTopTrendsForClipboard(topTrendsResult).replace(/^# .*\n\n/, '');
                markdownReport += `## Top Threat Trends\n\n${trendsMd}`;
            }
        }
        
        navigator.clipboard.writeText(markdownReport).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy Report to Clipboard'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyButtonText('Copy Failed');
            setTimeout(() => setCopyButtonText('Copy Report to Clipboard'), 2000);
        });
    };

    const handleSaveReport = () => {
        if (!topTrendsResult && !matrixResult) return;
        
        const reportToSave: SavedThreatLandscape = {
            id: uuidv4(),
            timestamp: Date.now(),
            report: (topTrendsResult || matrixResult)!,
            orgProfile,
            mode: landscapeMode as 'trends' | 'matrix'
        };

        try {
            const existing = JSON.parse(localStorage.getItem('ctiLandscapeReports') || '[]');
            existing.unshift(reportToSave);
            localStorage.setItem('ctiLandscapeReports', JSON.stringify(existing.slice(0, 50)));
            
            setSaveButtonText('Saved!');
            setTimeout(() => setSaveButtonText('Save Changes'), 2000);
        } catch (e) {
            console.error('Failed to save report', e);
            setSaveButtonText('Save Failed');
            setTimeout(() => setSaveButtonText('Save Changes'), 2000);
        }
    };

    const handleCheckForUpdates = async () => {
        if (!topTrendsResult) return;
        setIsCheckingForUpdates(true);

        setTopTrendsResult(current => {
            if (!current) return null;
            const newTrends = current.trends.map(t => ({ ...t, updateStatus: 'checking' as const }));
            return { ...current, trends: newTrends };
        });

        const updatePromises = topTrendsResult.trends.map((trend, index) =>
            checkForTrendUpdates(trend, orgProfile)
                .then(result => ({ index, ...result }))
                .catch(error => ({ index, error }))
        );

        for (const promise of updatePromises) {
            try {
                const result = await promise;
                setTopTrendsResult(current => {
                    if (!current) return null;
                    const newTrends = [...current.trends];
                    const trendToUpdate = newTrends[result.index];
                    if (!trendToUpdate) return current;

                    if ('error' in result) {
                        trendToUpdate.updateStatus = 'error';
                    } else if (result.updateAvailable && result.updatedTrendData) {
                        trendToUpdate.updateStatus = 'update_available';
                        trendToUpdate.updateSuggestion = {
                            summaryOfChanges: result.summaryOfChanges,
                            updatedTrendData: result.updatedTrendData
                        };
                    } else {
                        trendToUpdate.updateStatus = 'no_update';
                        setTimeout(() => {
                            setTopTrendsResult(c => {
                                if (!c) return null;
                                const trends = [...c.trends];
                                const t = trends[result.index];
                                if (t && t.updateStatus === 'no_update') {
                                    t.updateStatus = 'idle';
                                    t.updateSuggestion = undefined;
                                }
                                return { ...c, trends };
                            });
                        }, 5000);
                    }
                    return { ...current, trends: newTrends };
                });
            } catch (error) {
                // This catch is for the await promise, in case a promise was already rejected
                console.error("Error processing trend update result", error);
            }
        }

        setIsCheckingForUpdates(false);
    };

    const handleAcceptUpdate = (trendIndex: number) => {
        setTopTrendsResult(current => {
            if (!current) return null;
            const newTrends = [...current.trends];
            const trendToUpdate = newTrends[trendIndex];

            if (trendToUpdate?.updateStatus === 'update_available' && trendToUpdate.updateSuggestion) {
                const updatedData = trendToUpdate.updateSuggestion.updatedTrendData;

                newTrends[trendIndex] = {
                    ...trendToUpdate,
                    ...updatedData,
                    updateStatus: 'idle',
                    updateSuggestion: undefined,
                    validationStatus: 'validating',
                    confidenceScore: undefined,
                    validationSummary: undefined,
                    tailoredAnalyses: [],
                };

                validateThreatTrend(updatedData.trendTitle, updatedData.globalImpact, updatedData.sources)
                    .then(validationData => {
                        setTopTrendsResult(c => {
                            if (!c) return c;
                            const trends = [...c.trends];
                            const t = trends[trendIndex];
                            if (t) {
                                t.validationStatus = 'validated';
                                t.confidenceScore = validationData.confidenceScore;
                                t.validationSummary = validationData.validationSummary;
                            }
                            return { ...c, trends };
                        });
                    })
                    .catch(() => {
                        setTopTrendsResult(c => {
                            if (!c) return c;
                            const trends = [...c.trends];
                            const t = trends[trendIndex];
                            if (t) t.validationStatus = 'error';
                            return { ...c, trends };
                        });
                    });
            }
            return { ...current, trends: newTrends };
        });
    };

    const handleRejectUpdate = (trendIndex: number) => {
        setTopTrendsResult(current => {
            if (!current) return null;
            const newTrends = [...current.trends];
            const trendToUpdate = newTrends[trendIndex];
            if (trendToUpdate) {
                trendToUpdate.updateStatus = 'idle';
                trendToUpdate.updateSuggestion = undefined;
            }
            return { ...current, trends: newTrends };
        });
    };

    const isTailoredReportReady = activeAudienceView && topTrendsResult?.trends.every(t => t.tailoredAnalyses?.find(a => a.audience === activeAudienceView)?.status === 'completed');
    const hasAnyTailoredReports = topTrendsResult?.trends.some(t => t.tailoredAnalyses && t.tailoredAnalyses.length > 0);
    
    const ViewModeSwitcher: React.FC = () => {
        const baseClass = "px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent-primary";
        const activeClass = "bg-surface text-text-primary";
        const inactiveClass = "bg-card text-text-secondary hover:bg-surface/50";
        const disabledClass = "opacity-50 cursor-not-allowed";

        return (
            <div className="flex rounded-lg border border-border overflow-hidden">
                <button 
                    onClick={() => setReportViewMode('overview')} 
                    className={`${baseClass} rounded-l-md ${reportViewMode === 'overview' ? activeClass : inactiveClass}`}
                >
                    Analysis Overview
                </button>
                <button 
                    onClick={() => setReportViewMode('reportViewer')} 
                    disabled={!hasAnyTailoredReports}
                    className={`${baseClass} rounded-r-md border-l border-border ${reportViewMode === 'reportViewer' ? activeClass : inactiveClass} ${!hasAnyTailoredReports ? disabledClass : ''}`}
                    title={!hasAnyTailoredReports ? "Generate a tailored report first" : "View formatted reports"}
                >
                    Report Viewer
                </button>
            </div>
        );
    };

    const LandscapeModeSelector: React.FC<{ mode: 'trends' | 'matrix' | 'event'; setMode: (mode: 'trends' | 'matrix' | 'event') => void; disabled: boolean; }> = ({ mode, setMode, disabled }) => {
        const getButtonClasses = (buttonMode: 'trends' | 'matrix' | 'event') => {
            const isActive = mode === buttonMode;
            return `flex-1 text-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary ${
                isActive ? 'bg-accent-primary text-white shadow-sm' : 'bg-surface hover:bg-border text-text-secondary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
        };
        return (
            <div className="flex gap-2 p-1 bg-background rounded-lg border border-border mb-4">
                <button onClick={() => setMode('trends')} className={getButtonClasses('trends')} disabled={disabled}>Top Trends</button>
                <button onClick={() => setMode('matrix')} className={getButtonClasses('matrix')} disabled={disabled}>Structured Matrix</button>
                <button onClick={() => setMode('event')} className={getButtonClasses('event')} disabled={disabled}>Event Analysis</button>
            </div>
        );
    };

    const isGenerateDisabled = isGenerating || !orgProfile.trim() || (landscapeMode === 'event' && !eventDescription.trim());
    
    const handleGenerateClick = () => {
        if (landscapeMode === 'event') {
            handleGenerateEventMemorandum();
        } else if (landscapeMode === 'matrix') {
            handleGenerateMatrixPreview();
        } else {
            handleGenerateTrendsReport();
        }
    };

    const generateButtonText = () => {
        if (isGenerating) {
            if (generationStep === 'preview') return 'Generating Preview...';
            if (generationStep === 'full') return 'Generating Report...';
            return 'Generating...';
        }
        if (landscapeMode === 'event') return 'Generate Memorandum';
        if (landscapeMode === 'matrix') return 'Generate Preview';
        return 'Generate Report';
    };
    
    const commonInputClass = "w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors";
    const commonSelectClass = `${commonInputClass} h-9`;


    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-card border border-border p-6 rounded-lg">
                 <h2 className="text-xl font-bold text-text-primary mb-2">Generate Threat Landscape Report</h2>
                <p className="text-sm text-text-secondary mb-4">Select an analysis mode to generate a comprehensive CTI report on relevant trends or specific events.</p>
                
                <LandscapeModeSelector mode={landscapeMode} setMode={(m) => { setLandscapeMode(m); resetResults(); }} disabled={isGenerating} />
                
                {landscapeMode === 'event' ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-4">
                        <div className="md:col-span-12">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-semibold text-text-secondary">Event Description / Topic</label>
                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                    <span className="text-text-secondary text-[11px]">Quick presets:</span>
                                    <button
                                        type="button"
                                        onClick={() => setEventDescription('Russian hybrid warfare against European critical infrastructure outlook')}
                                        className="px-2 py-0.5 rounded bg-surface hover:bg-border text-text-primary text-[11px] border border-border transition-colors"
                                    >
                                        Russian Hybrid Warfare
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEventDescription('Unidentified drones flying over Polish military bases near the Ukrainian border')}
                                        className="px-2 py-0.5 rounded bg-surface hover:bg-border text-text-primary text-[11px] border border-border transition-colors"
                                    >
                                        Drone Airspace Incursions
                                    </button>
                                </div>
                            </div>
                            <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={2} placeholder="Describe the specific event to analyze, e.g., 'Russian hybrid warfare against European critical infrastructure outlook'..." className={commonInputClass} />
                        </div>

                        <div className="md:col-span-12">
                            <label className="block text-sm font-semibold text-text-secondary mb-1">Context / Guiding Data (Optional)</label>
                            <textarea 
                                value={eventContext} 
                                onChange={(e) => setEventContext(e.target.value)} 
                                rows={5} 
                                placeholder="Paste relevant text, articles, or reports here to guide the analysis..." 
                                className={commonInputClass} 
                            />
                        </div>

                        {/* Quarterly Window Range Selector & Outlook Mode (Both can be active at the same time) */}
                        <div className="md:col-span-12">
                            <QuarterlyWindowSelector
                                periodMode={periodMode}
                                setPeriodMode={setPeriodMode}
                                startQuarter={startQuarter}
                                setStartQuarter={setStartQuarter}
                                startYear={startYear}
                                setStartYear={setStartYear}
                                endQuarter={endQuarter}
                                setEndQuarter={setEndQuarter}
                                endYear={endYear}
                                setEndYear={setEndYear}
                                timePeriod={timePeriod}
                                setTimePeriod={setTimePeriod}
                                isOutlookMode={isOutlookMode}
                                setIsOutlookMode={setIsOutlookMode}
                                activePeriod={activePeriod}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="md:col-span-6">
                            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                <label className="block text-sm font-semibold text-text-secondary">Your Organization's Profile</label>
                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                    <span className="text-text-secondary text-[11px]">Presets:</span>
                                    {ORG_PROFILE_PRESETS.map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setOrgProfile(p.value)}
                                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                                                orgProfile.includes(p.label) || orgProfile.includes(p.shortLabel)
                                                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-semibold'
                                                    : 'bg-surface hover:bg-border text-text-primary border-border'
                                            }`}
                                            title={p.label}
                                        >
                                            + {p.shortLabel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea value={orgProfile} onChange={(e) => setOrgProfile(e.target.value)} rows={2} placeholder="e.g., Large European critical infrastructure provider..." className={commonInputClass} />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-text-secondary mb-1">Target Audience</label>
                            <select value={selectedAudience} onChange={(e) => setSelectedAudience(e.target.value)} className={commonSelectClass}>
                                {AUDIENCES.map(aud => <option key={aud} value={aud}>{aud}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3 self-end">
                            <button onClick={handleGenerateClick} disabled={isGenerateDisabled} className="w-full h-9 flex items-center justify-center gap-2 px-6 bg-accent-primary hover:opacity-90 disabled:bg-border text-white font-semibold rounded-lg shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary">
                                {isGenerating ? 'Generating...' : generateButtonText()}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-4">
                        <div className="md:col-span-12">
                            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                <label className="block text-sm font-semibold text-text-secondary">Your Organization's Profile</label>
                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                    <span className="text-text-secondary text-[11px]">Presets:</span>
                                    {ORG_PROFILE_PRESETS.map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setOrgProfile(p.value)}
                                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                                                orgProfile.includes(p.label) || orgProfile.includes(p.shortLabel)
                                                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-semibold'
                                                    : 'bg-surface hover:bg-border text-text-primary border-border'
                                            }`}
                                            title={p.label}
                                        >
                                            + {p.shortLabel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea value={orgProfile} onChange={(e) => setOrgProfile(e.target.value)} rows={3} placeholder="e.g., Large European critical infrastructure provider..." className={commonInputClass} />
                        </div>
                        {landscapeMode === 'trends' && (
                            <div className="md:col-span-12">
                                <label className="block text-sm font-semibold text-text-secondary mb-1">Trend Guidance / Specific Events (Optional)</label>
                                <textarea value={trendGuidance} onChange={(e) => setTrendGuidance(e.target.value)} rows={2} placeholder="e.g., Please include recent ransomware attacks affecting the supply chain, specifically MOVEit..." className={commonInputClass} />
                            </div>
                        )}

                        {/* Quarterly Window Range Selector & Outlook Mode */}
                        <div className="md:col-span-12">
                            <QuarterlyWindowSelector
                                periodMode={periodMode}
                                setPeriodMode={setPeriodMode}
                                startQuarter={startQuarter}
                                setStartQuarter={setStartQuarter}
                                startYear={startYear}
                                setStartYear={setStartYear}
                                endQuarter={endQuarter}
                                setEndQuarter={setEndQuarter}
                                endYear={endYear}
                                setEndYear={setEndYear}
                                timePeriod={timePeriod}
                                setTimePeriod={setTimePeriod}
                                isOutlookMode={isOutlookMode}
                                setIsOutlookMode={setIsOutlookMode}
                                activePeriod={activePeriod}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-text-secondary mb-1">Number of Trends</label>
                            <select value={numTrends} onChange={(e) => setNumTrends(Number(e.target.value))} className={commonSelectClass} disabled={landscapeMode === 'matrix'}>
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Top {n}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-text-secondary mb-1">Target Audience</label>
                            <select value={selectedAudience} onChange={(e) => setSelectedAudience(e.target.value)} className={commonSelectClass} title="Select audience for subsequent tailored analysis">
                                {AUDIENCES.map(aud => <option key={aud} value={aud}>{aud}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-4 self-end">
                            <button onClick={handleGenerateClick} disabled={isGenerateDisabled} className="w-full h-9 flex items-center justify-center gap-2 px-6 bg-accent-primary hover:opacity-90 disabled:bg-border text-white font-semibold rounded-lg shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary">
                                {generateButtonText()}
                            </button>
                        </div>
                    </div>
                )}


                {topTrendsResult && landscapeMode === 'trends' && !isGenerating && (
                    <div className="mt-6 pt-4 border-t border-border">
                        <h3 className="text-lg font-bold text-accent-primary mb-2">Generate Tailored Report</h3>
                        <p className="text-sm text-text-secondary mb-4">Re-analyze the generated trends for a specific audience to provide role-specific impact and recommendations.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-text-secondary mb-1">Select Audience</label>
                                <select value={selectedAudience} onChange={(e) => setSelectedAudience(e.target.value)} className={commonSelectClass}>
                                    {AUDIENCES.map(aud => <option key={aud} value={aud}>{aud}</option>)}
                                </select>
                            </div>
                            <button onClick={handleGenerateTailoredReport} disabled={isTailoring} className="w-full h-9 flex items-center justify-center gap-2 px-6 bg-accent-pro hover:opacity-90 disabled:bg-border text-white font-semibold rounded-lg shadow-sm transition-all duration-300 focus:outline-none">
                                {isTailoring ? 'Generating View...' : `Generate for ${selectedAudience}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {(isGenerating && generationStep === 'preview') && (
                <div className="text-center p-8 bg-card/50 border border-border rounded-xl mt-8">
                    <svg className="animate-spin mx-auto h-8 w-8 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 text-text-secondary">Generating trend preview...</p>
                </div>
            )}
            
            {(isGenerating && generationStep === 'full') && (
                 <div className="space-y-8 mt-8">
                     {(landscapeMode === 'matrix' || landscapeMode === 'trends') && <MatrixSkeletonLoader />}
                    <div className="text-center p-8 bg-card/50 border border-border rounded-xl">
                        <svg className="animate-spin mx-auto h-12 w-12 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-text-secondary">Performing deep analysis and gathering evidence... This may take a moment.</p>
                    </div>
                </div>
            )}

            {error && (
                 <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {matrixPreview && !matrixResult && landscapeMode === 'matrix' && !isGenerating && (
                <div className="mt-8">
                    <MatrixPreviewView 
                        preview={matrixPreview}
                        onAccept={handleAnalyzeFromPreview}
                        onRegenerateAll={handleGenerateMatrixPreview}
                        onRegenerateQuadrant={handleRegenerateQuadrant}
                        onPreviewChange={setMatrixPreview}
                        isAnalyzing={isGenerating && generationStep === 'full'}
                        isRegeneratingQuadrant={regeneratingQuadrant}
                    />
                </div>
            )}
            
            {(matrixResult || topTrendsResult || savedMemorandums.length > 0) && !isGenerating && (
                <div className="space-y-4 mt-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-text-primary">Generated Intelligence</h2>
                        <div className="flex gap-4 items-center">
                            {topTrendsResult && <ViewModeSwitcher />}
                             {topTrendsResult && landscapeMode === 'trends' && reportViewMode === 'overview' && (
                                <button
                                    onClick={handleCheckForUpdates}
                                    disabled={isCheckingForUpdates}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-border disabled:bg-border disabled:cursor-wait text-text-primary text-xs font-semibold rounded-lg transition-all border border-border"
                                    title="Check for new intelligence on all trends"
                                >
                                    {isCheckingForUpdates ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <SearchIcon className="w-4 h-4"/>
                                            Check for Updates
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {landscapeMode === 'event' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 h-fit max-h-[600px] flex flex-col">
                                <h3 className="font-bold text-lg mb-4 text-text-primary flex-shrink-0">Saved Memorandums</h3>
                                <div className="overflow-y-auto flex-grow">
                                    {savedMemorandums.length > 0 ? (
                                        <ul className="space-y-2">
                                            {savedMemorandums.map(memo => (
                                                <li key={memo.id}>
                                                    <div className={`w-full text-left p-3 rounded-md transition-colors group relative ${activeMemorandumId === memo.id ? 'bg-accent-primary/20' : 'hover:bg-surface'}`}>
                                                        <button onClick={() => setActiveMemorandumId(memo.id)} className="w-full h-full absolute inset-0 z-0"></button>
                                                        <div className="flex justify-between items-start">
                                                            <div className="pr-8">
                                                                <p className="font-semibold text-sm text-text-primary truncate" title={memo.eventDescription}>{memo.eventDescription}</p>
                                                                <p className="text-xs text-text-secondary">{new Date(memo.timestamp).toLocaleString()}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteMemorandum(memo.id); }}
                                                                className="p-1 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors z-10"
                                                                title="Delete Memorandum"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-center text-text-secondary p-4">
                                            <p className="text-sm">No memorandums generated yet. Use the form above to create one.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                {activeMemorandum ? (
                                    <div className="animate-fade-in shadow-sm">
                                        <MemorandumDisplay 
                                            memo={activeMemorandum.memorandum} 
                                            audience={activeMemorandum.targetAudience} 
                                            subject={activeMemorandum.eventDescription}
                                        />
                                    </div>
                                ) : (
                                     <div className="bg-card border-2 border-dashed border-border rounded-lg h-full flex items-center justify-center text-center text-text-secondary p-6">
                                        <p>{savedMemorandums.length > 0 ? 'Select a memorandum from the list to view it.' : 'Your generated memorandum will be displayed here.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {landscapeMode === 'matrix' && matrixResult && (
                        <div className="space-y-8 animate-fade-in">
                            <StructuredMatrixView result={matrixResult} />
                        </div>
                    )}

                    {landscapeMode === 'trends' && reportViewMode === 'overview' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
                                {topTrendsResult && (
                                    <div className="xl:col-span-3">
                                        <TopTrendsView
                                            result={topTrendsResult}
                                            orgProfile={orgProfile}
                                            onAcceptUpdate={handleAcceptUpdate}
                                            onRejectUpdate={handleRejectUpdate}
                                        />
                                    </div>
                                )}
                                {topTrendsResult && (
                                    <div className="xl:col-span-1">
                                        <ReportChat
                                            messages={chatHistory}
                                            inputValue={chatInput}
                                            onInputChange={setChatInput}
                                            onSendMessage={handleSendMessage}
                                            isLoading={isChatLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {landscapeMode === 'trends' && reportViewMode === 'reportViewer' && topTrendsResult && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-fade-in">
                            <TailoredReportViewer
                                report={topTrendsResult}
                                orgProfile={orgProfile}
                                activeAudience={activeAudienceView}
                                onAudienceChange={setActiveAudienceView}
                                onExit={() => setReportViewMode('overview')}
                                onGenerateMemorandum={handleGenerateMemorandum}
                            />
                             <ReportChat
                                messages={chatHistory}
                                inputValue={chatInput}
                                onInputChange={setChatInput}
                                onSendMessage={handleSendMessage}
                                isLoading={isChatLoading}
                            />
                        </div>
                    )}

                    {(topTrendsResult || matrixResult) && (
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={handleSaveReport} 
                                className="px-4 py-2 bg-surface hover:bg-border text-text-primary font-semibold rounded-lg shadow-sm transition-all duration-300 border border-border flex items-center gap-2"
                            >
                                <CheckIcon className="w-4 h-4" />
                                {saveButtonText}
                            </button>
                            <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-accent-primary hover:opacity-90 text-white font-semibold rounded-lg shadow-sm transition-all duration-300 flex items-center gap-2">
                                <ClipboardIcon className="w-4 h-4" />
                                {isTailoredReportReady ? `Copy Report for ${activeAudienceView}` : copyButtonText}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
