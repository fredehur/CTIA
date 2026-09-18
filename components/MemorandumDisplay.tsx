import React, { useState } from 'react';
import type { Memorandum, MemorandumEventItem } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface MemorandumDisplayProps {
    memo: Memorandum;
    audience: string;
    subject: string;
}

export const MemorandumDisplay: React.FC<MemorandumDisplayProps> = ({ memo, audience, subject }) => {
    const [copyText, setCopyText] = useState('Copy Memorandum');

    // Title formatting
    const rawTitle = memo.title || `Memorandum – ${subject}`;
    const displayTitle = rawTitle.startsWith('Memorandum') ? rawTitle : `Memorandum – ${rawTitle}`;

    // Reflection statement
    const reflection = memo.reflectionStatement || (memo.situation && !memo.events ? memo.situation : null);

    // Purpose text
    const purposeText = memo.purpose || `This memorandum offers an assessment of ${subject} relevant to the organization's risk exposure:`;

    // Purpose numbered points
    const purposePoints: string[] = React.useMemo(() => {
        if (Array.isArray(memo.purposePoints) && memo.purposePoints.length > 0) {
            return memo.purposePoints;
        }
        if (Array.isArray(memo.pointsOfConcern) && memo.pointsOfConcern.length > 0) {
            return memo.pointsOfConcern.map((pt, i) => `${i + 1}. ${pt.replace(/^\d+[\.\)]\s*/, '')}`);
        }
        return [];
    }, [memo.purposePoints, memo.pointsOfConcern]);

    // Chronological Events
    const eventsList: MemorandumEventItem[] = React.useMemo(() => {
        if (Array.isArray(memo.events) && memo.events.length > 0) {
            return memo.events.map((e, idx) => {
                if (typeof e === 'string') {
                    return { description: e };
                }
                return e;
            });
        }
        // Fallback from legacy introduction or situation
        const introRaw = memo.introduction || memo.situation || '';
        const rawLines = introRaw
            .split(/(?:\r\n|\r|\n)+/)
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.toLowerCase().includes('brief overview of the situation'));

        if (rawLines.length > 0) {
            return rawLines.map(line => ({
                description: line.replace(/^[-•*]\s*/, '')
            }));
        }

        return [
            {
                date: "Recent Incident",
                description: "Critical security development and observed hybrid warfare activity affecting regional infrastructure."
            }
        ];
    }, [memo.events, memo.introduction, memo.situation]);

    // Context / Catalysts
    const contextText = React.useMemo(() => {
        if (memo.context && memo.context.trim()) {
            return memo.context;
        }
        return "Geopolitical tensions and preceding strategic policy changes have accelerated adversary resort to hybrid operations and asymmetric signaling across critical transit sectors.";
    }, [memo.context]);

    // Analysis / Operational Relevance (IT vs OT, Critical Assets)
    const analysisText = React.useMemo(() => {
        if (memo.analysis && memo.analysis.trim()) {
            return memo.analysis;
        }
        if (Array.isArray(memo.detailedAnalysis) && memo.detailedAnalysis.length > 0) {
            return memo.detailedAnalysis.map((d: any) => typeof d === 'string' ? d : `${d.pointTitle ? `${d.pointTitle}: ` : ''}${d.analysis || ''}`).join('\n\n');
        }
        if (typeof memo.detailedAnalysis === 'string' && memo.detailedAnalysis.trim()) {
            return memo.detailedAnalysis;
        }
        return "The organization's IT and OT (operational technology controlling critical power, distribution, or transmission networks) are assessed to be potential targets for state-sponsored cyber and hybrid operations, as disruption could inflict high society-wide impacts and test escalation thresholds.";
    }, [memo.analysis, memo.detailedAnalysis]);

    // Conclusions & Impacts to the org and customers
    const conclusionsList: string[] = React.useMemo(() => {
        if (Array.isArray(memo.conclusions) && memo.conclusions.length > 0) {
            return memo.conclusions;
        }
        if (typeof memo.conclusions === 'string' && memo.conclusions.trim()) {
            return [memo.conclusions];
        }
        if (memo.assessment) {
            return memo.assessment
                .split(/(?:\r\n|\r|\n)+/)
                .map(l => l.replace(/^[-•*]\s*/, '').trim())
                .filter(l => l.length > 0);
        }
        return [
            "The incidents demonstrate an increased willingness to utilize hybrid operations as a means to communicate aggressively while maintaining escalation control.",
            "Covert assistance, flags of convenience, and grey-zone operations in shared maritime and airspace corridors represent heightened deception risks.",
            "Organizational posture must emphasize hardened OT monitoring, cross-border intelligence sharing, and incident verification to deter and mitigate sabotage."
        ];
    }, [memo.conclusions, memo.assessment]);

    // Specific points to highlight
    const highlightPoints: { title: string; content: string }[] = React.useMemo(() => {
        if (Array.isArray(memo.specificPointsToHighlight) && memo.specificPointsToHighlight.length > 0) {
            return memo.specificPointsToHighlight.map((item: any, idx: number) => {
                if (typeof item === 'string') {
                    const match = item.match(/^(?:•\s*)?([^:]+):\s*(.*)$/);
                    if (match) {
                        return { title: match[1].trim(), content: match[2].trim() };
                    }
                    return { title: `Key Point ${idx + 1}`, content: item.replace(/^•\s*/, '').trim() };
                }
                return { title: item.title || `Key Point ${idx + 1}`, content: item.content || item.description || '' };
            });
        }
        // Fallback from legacy biasChallenges if present
        if (Array.isArray(memo.biasChallenges) && memo.biasChallenges.length > 0) {
            return memo.biasChallenges.map((b: any) => ({
                title: typeof b === 'string' ? 'Analytic Consideration' : (b.challenge || 'Analytic Consideration'),
                content: typeof b === 'string' ? b : (b.proposedSolution || '')
            }));
        }
        return [];
    }, [memo.specificPointsToHighlight, memo.biasChallenges]);

    const handleCopy = () => {
        let content = `${displayTitle}\n`;
        if (reflection) {
            content += `${reflection}\n`;
        }
        content += `\nPurpose of this memorandum\n`;
        content += `${purposeText}\n`;
        purposePoints.forEach((p) => {
            content += `${p}\n`;
        });
        content += `\nEvents\n`;
        eventsList.forEach((ev) => {
            if (ev.date || ev.headline) {
                content += `${ev.date ? `${ev.date}: ` : ''}${ev.headline ? `${ev.headline}\n` : ''}${ev.description}\n\n`;
            } else {
                content += `${ev.description}\n\n`;
            }
        });
        content += `Context\n`;
        content += `${contextText}\n\n`;
        content += `Analysis and Operational Relevance\n`;
        content += `${analysisText}\n\n`;
        content += `Conclusions and impacts to the org and the org customers\n`;
        conclusionsList.forEach((c) => {
            content += `${c}\n\n`;
        });
        if (highlightPoints.length > 0) {
            content += `Specific points to highlight:\n\n`;
            highlightPoints.forEach((hp) => {
                content += `• ${hp.title}: ${hp.content}\n\n`;
            });
        }

        navigator.clipboard.writeText(content.trim()).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Memorandum'), 2000);
        });
    };

    return (
        <div className="relative font-sans bg-[#1b1e24] text-neutral-100 rounded-lg p-6 md:p-10 shadow-xl border border-neutral-800 selection:bg-neutral-700 selection:text-white">
            {/* Top Corner Framing Brackets */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-neutral-400 pointer-events-none opacity-80" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-neutral-400 pointer-events-none opacity-80" />

            {/* Floating Quick Action Toolbar */}
            <div className="flex justify-end items-center mb-6 pt-1 pr-6 gap-2 flex-wrap">
                {memo.period && (
                    <span className="text-[11px] font-mono tracking-wider text-neutral-300 bg-neutral-800/80 px-2 py-1 rounded border border-neutral-700/60">
                        Window: {memo.period}
                    </span>
                )}
                {memo.isOutlookMode && (
                    <span className="text-[11px] font-mono tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-700/60 font-medium">
                        🔭 Outlook Mode
                    </span>
                )}
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 bg-neutral-800/60 px-2 py-1 rounded border border-neutral-700/50">
                    Target: {audience}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded border border-neutral-600 transition-colors font-medium shadow-sm cursor-pointer"
                    title="Copy full intelligence briefing memorandum"
                >
                    <ClipboardIcon className="w-3.5 h-3.5" />
                    {copyText}
                </button>
            </div>

            {/* Document Header */}
            <header className="mb-6 pl-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                    {displayTitle}
                </h1>
                {reflection && (
                    <p className="text-neutral-400 text-sm italic mt-2 leading-relaxed">
                        {reflection}
                    </p>
                )}
            </header>

            {/* Body Sections */}
            <div className="space-y-7 pl-2">
                {/* 1. Purpose of this memorandum Section */}
                <section>
                    <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-2.5 shadow-xs">
                        Purpose of this memorandum
                    </div>
                    <div className="space-y-2 pl-1 text-sm md:text-base text-neutral-200 leading-relaxed">
                        <p>{purposeText}</p>
                        {purposePoints.length > 0 && (
                            <ul className="space-y-1.5 pl-2 pt-1">
                                {purposePoints.map((pt, idx) => (
                                    <li key={idx} className="flex items-start text-sm md:text-base text-neutral-200 leading-relaxed">
                                        <span className="font-semibold text-neutral-400 mr-2 shrink-0">
                                            {pt.match(/^\d+[\.\)]/) ? '' : `${idx + 1}.`}
                                        </span>
                                        <span>{pt}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* 2. Events / Situation */}
                <section>
                    <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-3 shadow-xs">
                        Events
                    </div>
                    <div className="space-y-4 pl-1">
                        {eventsList.map((ev, idx) => (
                            <div key={idx} className="space-y-1 bg-neutral-900/40 border border-neutral-800/80 rounded-md p-3.5">
                                {(ev.date || ev.headline) && (
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        {ev.date && (
                                            <span className="text-xs font-semibold text-emerald-400 tracking-wide font-mono">
                                                {ev.date}
                                            </span>
                                        )}
                                        {ev.headline && (
                                            <span className="text-sm font-bold text-white">
                                                {ev.headline}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <p className="text-neutral-200 text-sm md:text-base leading-relaxed">
                                    {ev.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Context & Catalysts */}
                <section>
                    <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-2.5 shadow-xs">
                        Context
                    </div>
                    <p className="text-neutral-200 text-sm md:text-base leading-relaxed pl-1 whitespace-pre-line">
                        {contextText}
                    </p>
                </section>

                {/* 4. Analysis & Operational Relevance to the Organization */}
                <section>
                    <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-2.5 shadow-xs">
                        Analysis & Operational Relevance
                    </div>
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-md p-4 space-y-3">
                        <p className="text-neutral-200 text-sm md:text-base leading-relaxed whitespace-pre-line">
                            {analysisText}
                        </p>
                    </div>
                </section>

                {/* 5. Conclusions and impacts to the org and the org customers */}
                <section>
                    <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-3 shadow-xs">
                        Conclusions and impacts to the org and the org customers
                    </div>
                    <div className="space-y-3 pl-1">
                        {conclusionsList.map((conclusion, idx) => (
                            <p key={idx} className="text-neutral-200 text-sm md:text-base leading-relaxed">
                                {conclusion}
                            </p>
                        ))}
                    </div>
                </section>

                {/* 6. Specific points to highlight (if present) */}
                {highlightPoints.length > 0 && (
                    <section className="pt-2 border-t border-neutral-800/80">
                        <div className="inline-block bg-[#2d323c] border border-neutral-700 text-neutral-200 px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-3 shadow-xs">
                            Specific points to highlight:
                        </div>
                        <ul className="space-y-3 pl-2">
                            {highlightPoints.map((hp, idx) => (
                                <li key={idx} className="text-sm md:text-base leading-relaxed text-neutral-200">
                                    <strong className="text-white font-semibold">• {hp.title}:</strong>{' '}
                                    <span className="text-neutral-300">{hp.content}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
};

