import React, { useState } from 'react';
import type { Memorandum, AnalyticalBiasChallenge, DetailedAnalysisPoint } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface MemorandumDisplayProps {
    memo: Memorandum;
    audience: string;
    subject: string;
}

export const MemorandumDisplay: React.FC<MemorandumDisplayProps> = ({ memo, audience, subject }) => {
    const [copyText, setCopyText] = useState('Copy Template');

    // Title formatting
    const rawTitle = memo.title || `Memorandum — ${subject} outlook`;
    const displayTitle = rawTitle.startsWith('Memorandum —') ? rawTitle : `Memorandum — ${rawTitle}`;

    // Normalize Introduction / Situation
    const introRaw = memo.introduction || memo.situation || '';
    const introLines = introRaw
        .split(/(?:\r\n|\r|\n)+/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.toLowerCase().includes('brief overview of the situation'));

    // Normalize Purpose
    const purposeText = memo.purpose || "Provide a concise and comprehensive assessment of the given situation, focusing on specific points of concern and offering actionable recommendations.";

    // Normalize Points of Concern
    const pointsOfConcern: string[] = React.useMemo(() => {
        if (Array.isArray(memo.pointsOfConcern) && memo.pointsOfConcern.length > 0) {
            return memo.pointsOfConcern;
        }
        if (memo.considerations) {
            return memo.considerations
                .split(/(?:\r\n|\r|\n)+/)
                .map(l => l.replace(/^[-•*]\s*/, '').trim())
                .filter(l => l.length > 0);
        }
        return [
            "Critical infrastructure exposure and supply chain dependency vectors",
            "Attribution indicators, threat actor persistence, and command infrastructure",
            "Potential for cascading operational disruptions or regulatory exposure"
        ];
    }, [memo.pointsOfConcern, memo.considerations]);

    // Normalize Assessment
    const assessmentLines = (memo.assessment || '')
        .split(/(?:\r\n|\r|\n)+/)
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(l => l.length > 0);

    // Normalize Detailed Analysis
    const detailedPoints: { pointTitle: string; analysis: string }[] = React.useMemo(() => {
        if (Array.isArray(memo.detailedAnalysis) && memo.detailedAnalysis.length > 0) {
            return memo.detailedAnalysis.map((item, idx) => {
                if (typeof item === 'string') {
                    return {
                        pointTitle: `Paragraph ${idx + 1}: Elaboration on point ${idx + 1}`,
                        analysis: item
                    };
                }
                return {
                    pointTitle: item.pointTitle || `Paragraph ${idx + 1}: Elaboration on point ${idx + 1}`,
                    analysis: item.analysis || ''
                };
            });
        }
        if (typeof memo.detailedAnalysis === 'string' && memo.detailedAnalysis.trim()) {
            return [{
                pointTitle: "Paragraph 1: Elaboration on point 1",
                analysis: memo.detailedAnalysis
            }];
        }
        // Fallback derived from points of concern or considerations
        return pointsOfConcern.map((pt, idx) => ({
            pointTitle: `Paragraph ${idx + 1}: Elaboration on point ${idx + 1}`,
            analysis: `Detailed analytical evaluation of ${pt.toLowerCase()}. Threat telemetry and historical reporting indicate intentional reconnaissance and multi-stage staging against exposed interfaces, with strategic intent to maintain persistent access and maximize leverage against key stakeholders.`
        }));
    }, [memo.detailedAnalysis, pointsOfConcern]);

    // Normalize Bias & Analytic Challenges
    const biasList: AnalyticalBiasChallenge[] = React.useMemo(() => {
        if (Array.isArray(memo.biasChallenges) && memo.biasChallenges.length > 0) {
            return memo.biasChallenges.map((item, idx) => {
                if (typeof item === 'string') {
                    const parts = item.split(/:\s*/);
                    return {
                        challenge: parts[0] || `Bias/Challenge ${idx + 1}`,
                        proposedSolution: parts[1] || item
                    };
                }
                return item;
            });
        }
        if (typeof memo.biasChallenges === 'string' && memo.biasChallenges.trim()) {
            return [{
                challenge: "Potential bias or analytical challenge",
                proposedSolution: memo.biasChallenges
            }];
        }
        return [
            {
                challenge: "Bias/Challenge 1: Attribution Uncertainty & Reporting Lag",
                proposedSolution: "Cross-referencing technical telemetry from multiple independent CTI sources rather than relying on initial public claims."
            },
            {
                challenge: "Bias/Challenge 2: Mirror Imaging Assumptions",
                proposedSolution: "Assessing adversary actions based on published doctrine, regional strategic doctrine, and asymmetric geopolitical goals."
            }
        ];
    }, [memo.biasChallenges]);

    const handleCopy = () => {
        let content = `${displayTitle}\n`;
        content += `==================================================\n`;
        content += `Audience: ${audience} | Date: ${new Date().toLocaleDateString()}\n\n`;
        
        content += `▲ Introduction\nBrief overview of the situation:\n`;
        introLines.forEach(l => {
            content += `  - ${l.replace(/^[-•*]\s*/, '')}\n`;
        });
        content += `\n`;

        content += `Purpose of this memorandum:\n${purposeText}\n\n`;

        content += `Specific points of concern:\nMain Areas of Concern:\n`;
        pointsOfConcern.forEach((p, idx) => {
            content += `  - Point ${idx + 1}: ${p}\n`;
        });
        content += `\n`;

        content += `[ Assessment ]\n`;
        assessmentLines.forEach((a, idx) => {
            content += `  - Assessment ${idx + 1}: ${a}\n`;
        });
        content += `\n`;

        content += `Detailed Analysis\n`;
        detailedPoints.forEach((d) => {
            content += `${d.pointTitle}\n${d.analysis}\n\n`;
        });

        content += `Bias/Analytic Challenge Section\n`;
        content += `Addressing Biases and Challenges\n`;
        content += `Potential biases or analytical challenges:\n`;
        biasList.forEach((b) => {
            content += `  - ${b.challenge}: ${b.proposedSolution}\n`;
        });

        navigator.clipboard.writeText(content.trim()).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Template'), 2000);
        });
    };

    return (
        <div className="relative font-sans bg-[#1b1e24] text-neutral-100 rounded-lg p-6 md:p-10 shadow-xl border border-neutral-800 selection:bg-neutral-700 selection:text-white">
            {/* Top Corner Framing Brackets - matching uploaded template */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-neutral-400 pointer-events-none opacity-80" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-neutral-400 pointer-events-none opacity-80" />

            {/* Floating Quick Action Toolbar */}
            <div className="flex justify-end items-center mb-6 pt-1 pr-6 gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 bg-neutral-800/60 px-2 py-1 rounded border border-neutral-700/50">
                    Target: {audience}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded border border-neutral-600 transition-colors font-medium shadow-sm"
                    title="Copy full structured memorandum"
                >
                    <ClipboardIcon className="w-3.5 h-3.5" />
                    {copyText}
                </button>
            </div>

            {/* Document Header */}
            <header className="mb-8 pl-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                    {displayTitle}
                </h1>
            </header>

            {/* Body Sections */}
            <div className="space-y-7 pl-2">
                {/* 1. Introduction Section */}
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-white text-xs">▲</span>
                        <h2 className="text-base md:text-lg font-bold text-white">Introduction</h2>
                    </div>
                    <div className="space-y-2 pl-4 text-sm text-neutral-200">
                        <p className="font-medium text-neutral-300">Brief overview of the situation:</p>
                        <ul className="space-y-2 pl-2">
                            {introLines.map((line, idx) => {
                                const clean = line.replace(/^[-•*]\s*/, '');
                                const isContext = clean.toLowerCase().startsWith('relevant context');
                                return (
                                    <li key={idx} className="flex items-start text-sm leading-relaxed">
                                        <span className="mr-2 text-neutral-400 font-mono">-</span>
                                        <span className={isContext ? 'font-medium text-neutral-200' : 'text-neutral-300'}>
                                            {clean}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>

                {/* 2. Purpose of this memorandum Section */}
                <section>
                    <div className="inline-block bg-[#343842] text-white px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-2 shadow-sm">
                        Purpose of this memorandum:
                    </div>
                    <p className="text-neutral-200 text-sm md:text-base leading-relaxed pl-1">
                        {purposeText}
                    </p>
                </section>

                {/* 3. Specific points of concern Section */}
                <section>
                    <div className="inline-block bg-[#343842] text-white px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-2 shadow-sm">
                        Specific points of concern:
                    </div>
                    <div className="pl-1 space-y-2 text-sm">
                        <p className="text-neutral-300 font-medium">Main Areas of Concern</p>
                        <ul className="space-y-1.5 pl-3">
                            {pointsOfConcern.map((point, idx) => (
                                <li key={idx} className="flex items-start text-sm text-neutral-200 leading-relaxed">
                                    <span className="mr-2 text-neutral-400 font-mono">-</span>
                                    <span>
                                        <strong className="text-neutral-100 mr-1.5">Point {idx + 1}:</strong>
                                        {point.replace(/^Point \d+:\s*/i, '')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* 4. Assessment Callout Box (Distinct White Card per template image) */}
                <section className="my-6">
                    <div className="bg-white text-neutral-900 rounded-sm p-6 md:p-8 shadow-lg border border-neutral-300">
                        <h3 className="text-center font-bold text-base md:text-lg text-neutral-900 mb-5 tracking-wide">
                            Assessment
                        </h3>
                        <ul className="space-y-3 max-w-3xl mx-auto">
                            {assessmentLines.map((item, idx) => (
                                <li key={idx} className="flex items-start text-sm md:text-base leading-relaxed text-neutral-800">
                                    <span className="mr-3 font-semibold text-neutral-700">•</span>
                                    <div>
                                        <strong className="text-neutral-950 mr-1.5">Assessment {idx + 1}:</strong>
                                        <span>{item.replace(/^Assessment \d+:\s*/i, '')}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* 5. Detailed Analysis Section */}
                <section>
                    <div className="inline-block bg-[#343842] text-white px-3 py-1 rounded text-xs md:text-sm font-semibold tracking-wide mb-3 shadow-sm">
                        Detailed Analysis
                    </div>
                    <div className="space-y-4 pl-1 text-sm md:text-base leading-relaxed">
                        {detailedPoints.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                                <p className="font-semibold text-white text-sm">
                                    {item.pointTitle}
                                </p>
                                <p className="text-neutral-300 text-sm leading-relaxed pl-1">
                                    {item.analysis}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 6. Bias/Analytic Challenge Section */}
                <section className="pt-2 border-t border-neutral-800/80">
                    <h2 className="text-base md:text-lg font-bold text-white mb-1">
                        Bias/Analytic Challenge Section
                    </h2>
                    <p className="text-neutral-300 text-sm font-medium mb-1">
                        Addressing Biases and Challenges
                    </p>
                    <p className="text-neutral-400 text-sm mb-3">
                        Potential biases or analytical challenges:
                    </p>
                    <ul className="space-y-2 pl-2">
                        {biasList.map((item, idx) => (
                            <li key={idx} className="flex items-start text-sm leading-relaxed">
                                <span className="mr-2 text-neutral-400 font-mono">-</span>
                                <span className="text-neutral-200">
                                    <strong className="text-white">
                                        {item.challenge}:
                                    </strong>{' '}
                                    <span className="text-neutral-300">{item.proposedSolution}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
};
