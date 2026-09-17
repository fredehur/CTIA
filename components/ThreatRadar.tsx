import React, { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ThreatRadarPoint, ThreatCategory, ThreatRadarQuarterlyPoint, ThreatRadarResult, SavedThreatRadar } from '../types';
import { generateThreatRadarData, generateArchetypeRadarData } from '../services/geminiService';
import { FlagIcon } from './icons/FlagIcon';
import { NoSymbolIcon } from './icons/NoSymbolIcon';
import { UserSlashIcon } from './icons/UserSlashIcon';
import { CriminalIcon } from './icons/CriminalIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { SearchIcon } from './icons/SearchIcon';

const CATEGORY_CONFIG: { [key in ThreatCategory]: { angle: number; color: string; icon: React.ReactNode } } = {
  'Nation-State': { angle: 45, color: '#1E3A8A', icon: <FlagIcon className="w-5 h-5"/> },
  'Criminal': { angle: 135, color: '#475569', icon: <CriminalIcon className="w-5 h-5"/> },
  'Insider': { angle: 225, color: '#0D9488', icon: <UserSlashIcon className="w-5 h-5"/> },
  'Hacktivist': { angle: 315, color: '#64748B', icon: <NoSymbolIcon className="w-5 h-5"/> },
};

const getNextQuarter = (quarterStr: string): string => {
    const [qStr, yearStr] = quarterStr.split(' ');
    const qNum = parseInt(qStr.substring(1), 10);
    let year = parseInt(yearStr, 10);

    let nextQNum = qNum + 1;
    let nextYear = year;

    if (nextQNum > 4) {
        nextQNum = 1;
        nextYear = year + 1;
    }

    return `Q${nextQNum} ${nextYear}`;
};


const Blip: React.FC<{ threat: any; onClick: (id: string) => void; isSelected: boolean; isPinged: boolean; }> = ({ threat, onClick, isSelected, isPinged }) => {
    const { x, y, radius, color, icon } = threat;
    
    const scaleFactor = isSelected ? 1.2 : (isPinged ? 1.15 : 1);
    const currentRadius = radius * scaleFactor;
    const pingColor = '#99FFFF';

    const iconContainerSize = radius * 1.4;
    const iconTransform = isSelected ? 'scale(1.15)' : (isPinged ? 'scale(1.1)' : 'scale(1)');

    return (
        <g 
            onClick={(e) => {
              e.stopPropagation();
              onClick(threat.name);
            }}
            className="cursor-pointer group"
        >
            <circle 
                cx={x}
                cy={y}
                r={currentRadius}
                fill={color}
                fillOpacity="0.3"
                stroke={isPinged ? pingColor : color}
                strokeWidth={isSelected ? 2.5 : 2}
                style={{ 
                    transition: 'r 0.15s ease-in-out, stroke 0.15s ease-in-out, transform 0.15s ease-in-out, cy 0.2s ease-in-out, cx 0.2s ease-in-out',
                    transformOrigin: `${x}px ${y}px`,
                    animation: `blip-pulse ${2.5 + Math.random() * 2}s ease-in-out infinite`
                }}
            />
            
            <circle cx={x} cy={y} r={radius * 1.5} fill="transparent" />
            
            <foreignObject x={x - iconContainerSize / 2} y={y - iconContainerSize / 2} width={iconContainerSize} height={iconContainerSize} className="text-white pointer-events-none" style={{transition: 'x 0.2s ease-in-out, y 0.2s ease-in-out'}}>
                 <div 
                    style={{ transform: iconTransform, transition: 'transform 0.1s ease-in-out', transformOrigin: 'center center' }}
                    className="w-full h-full flex items-center justify-center"
                >
                    {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-2/3 h-2/3' })}
                 </div>
            </foreignObject>
        </g>
    );
};

const Tooltip: React.FC<{ threat: any }> = ({ threat }) => (
    <div 
        className="absolute bg-surface border border-border rounded-lg p-3 text-xs text-white shadow-xl pointer-events-none transition-all duration-300"
        style={{ left: threat.x + threat.radius, top: threat.y, transform: 'translate(10px, -50%)', maxWidth: '200px' }}
    >
        <h4 className="font-bold text-sm mb-1 text-accent-primary">{threat.name}</h4>
        <p className="text-text-secondary mb-2">{threat.description}</p>
        <div className="flex justify-between font-mono text-text-secondary">
            <span>Motivation: {threat.motivation.toFixed(1)}/10</span>
            <span>Resources: {threat.resources.toFixed(1)}/10</span>
        </div>
    </div>
);

const ProjectionTrail: React.FC<{ threat: any, scales: any }> = ({ threat, scales }) => {
    const { getCoords } = scales;
    
    let pathData = `M ${threat.x} ${threat.y}`;
    const points = threat.quarterlyData;
    
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const { x, y } = getCoords(p.motivation, threat.angle);
        pathData += ` L ${x} ${y}`;
    }

    return (
        <g className="pointer-events-none animate-fade-in" style={{ transition: 'd 0.2s ease-in-out' }}>
            <path
                d={pathData}
                fill="none"
                stroke={threat.color}
                strokeWidth="2"
                opacity="0.9"
                style={{ filter: `drop-shadow(0 0 3px ${threat.color})`, transition: 'd 0.2s ease-in-out' }}
            />
            {threat.quarterlyData.map((p: any, i: number) => {
                const { x, y } = getCoords(p.motivation, threat.angle);
                return <circle key={i} cx={x} cy={y} r="4" fill={threat.color} stroke="#F9FAFB" strokeWidth="0.5" opacity="0.9" style={{ transition: 'cx 0.2s ease-in-out, cy 0.2s ease-in-out' }} />;
            })}
        </g>
    );
};


const Slider: React.FC<{label: string; value: number; onChange: (v: number) => void; color: string}> = ({ label, value, onChange, color }) => (
    <div>
        <label className="flex justify-between text-xs font-medium text-text-secondary mb-1">
            <span>{label}</span>
            <span className="font-bold" style={{color: color}}>{value.toFixed(1)}</span>
        </label>
        <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{'--slider-color': color} as React.CSSProperties}
        />
    </div>
);

const ThreatControlPanel: React.FC<{
    threat: ThreatRadarPoint;
    onUpdate: (updatedThreat: ThreatRadarPoint) => void;
    onClose: () => void;
}> = ({ threat, onUpdate, onClose }) => {
    
    const handleCurrentChange = (field: 'motivation' | 'resources', value: number) => {
        onUpdate({ ...threat, [field]: value });
    };

    const handleQuarterlyChange = (index: number, field: 'motivation' | 'resources', value: number) => {
        const newQuarterlyData = [...threat.quarterlyData];
        newQuarterlyData[index] = { ...newQuarterlyData[index], [field]: value };
        onUpdate({ ...threat, quarterlyData: newQuarterlyData });
    };

    const handleAddQuarter = () => {
        if (!threat.quarterlyData.length) return;
        const lastQuarter = threat.quarterlyData[threat.quarterlyData.length - 1];
        const newQuarter: ThreatRadarQuarterlyPoint = {
            quarter: getNextQuarter(lastQuarter.quarter),
            motivation: lastQuarter.motivation,
            resources: lastQuarter.resources,
        };
        onUpdate({ ...threat, quarterlyData: [...threat.quarterlyData, newQuarter] });
    };

    const handleRemoveQuarter = () => {
        if (threat.quarterlyData.length <= 1) return;
        onUpdate({ ...threat, quarterlyData: threat.quarterlyData.slice(0, -1) });
    };

    return (
        <div className="bg-card border border-border p-4 rounded-lg h-full animate-fade-in flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Threat Customization</h3>
                <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            <p className="text-sm font-semibold text-accent-primary mb-4">{threat.name}</p>
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-2 border-b border-border pb-1">Current State</h4>
                    <div className="space-y-3">
                        <Slider label="Motivation" value={threat.motivation} onChange={(v) => handleCurrentChange('motivation', v)} color="#EC4899" />
                        <Slider label="Resources" value={threat.resources} onChange={(v) => handleCurrentChange('resources', v)} color="#38BDF8" />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2 border-b border-border pb-1">
                        <h4 className="text-sm font-semibold text-text-secondary">Quarterly Projections</h4>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={handleRemoveQuarter} 
                                disabled={threat.quarterlyData.length <= 1}
                                className="px-2 py-0.5 text-lg font-bold rounded bg-surface hover:bg-red-700 disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
                                title="Remove Last Quarter"
                            >
                                -
                            </button>
                            <button 
                                onClick={handleAddQuarter}
                                disabled={!threat.quarterlyData.length}
                                className="px-2 py-0.5 text-lg font-bold rounded bg-surface hover:bg-green-700 disabled:bg-border disabled:cursor-not-allowed transition-colors"
                                title="Add New Quarter"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {threat.quarterlyData.map((q, i) => (
                            <div key={i}>
                                <p className="text-xs font-bold text-text-secondary mb-2">{q.quarter}</p>
                                <div className="space-y-2 pl-2 border-l-2 border-border">
                                    <Slider label="Motivation" value={q.motivation} onChange={(v) => handleQuarterlyChange(i, 'motivation', v)} color="#EC4899" />
                                    <Slider label="Resources" value={q.resources} onChange={(v) => handleQuarterlyChange(i, 'resources', v)} color="#38BDF8" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ThreatProjectionChart: React.FC<{ threat: ThreatRadarPoint | null }> = ({ threat }) => {
    const width = 600;
    const height = 250;
    const margin = { top: 30, right: 40, bottom: 40, left: 40 };

    const plotData = useMemo(() => {
        if (!threat) return [];
        return [
            { quarter: 'Current', motivation: threat.motivation, resources: threat.resources },
            ...threat.quarterlyData
        ];
    }, [threat]);

    const xScale = (index: number) => {
        if (plotData.length <= 1) return margin.left;
        return margin.left + (index / (plotData.length - 1)) * (width - margin.left - margin.right);
    };
    const yScale = (value: number) => height - margin.bottom - ((value - 1) / 9) * (height - margin.top - margin.bottom);

    const motivationPath = plotData
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.motivation)}`)
        .join(' ');
    
    const resourcesPath = plotData
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.resources)}`)
        .join(' ');

    return (
        <div className="bg-card border border-border p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-accent-primary mb-4">
                Projection Timeline: {threat ? threat.name : 'Select a threat'}
            </h3>
            <div className="relative">
                {threat && plotData.length > 0 ? (
                    <div className="animate-fade-in">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-sans">
                            {/* Y-axis grid lines and labels */}
                            {[1, 4, 7, 10].map(val => (
                                <g key={val} className="text-xs fill-text-secondary">
                                    <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeWidth="1" />
                                    <text x={margin.left - 8} y={yScale(val)} dy="0.32em" textAnchor="end">{val}</text>
                                </g>
                            ))}
                            <text x={margin.left - 25} y={height / 2} transform={`rotate(-90 ${margin.left-25},${height / 2})`} textAnchor="middle" className="text-xs fill-text-secondary font-semibold uppercase tracking-wider">Score (1-10)</text>

                            {/* X-axis labels */}
                            {plotData.map((d, i) => (
                                <text key={d.quarter} x={xScale(i)} y={height - margin.bottom + 20} textAnchor="middle" className={`text-xs ${i === 0 ? 'fill-text-primary font-bold' : 'fill-text-secondary'}`}>{d.quarter}</text>
                            ))}
                        
                            {/* Motivation line */}
                            <path d={motivationPath} fill="none" stroke="#EC4899" strokeWidth="2" style={{ transition: 'd 0.2s ease-in-out' }} />

                            {/* Resources line */}
                            <path d={resourcesPath} fill="none" stroke="#38BDF8" strokeWidth="2" style={{ transition: 'd 0.2s ease-in-out' }} />

                             {/* Data Points */}
                            {plotData.map((d, i) => (
                                <g key={`points-${i}`}>
                                    {i === 0 ? (
                                        <>
                                            <circle cx={xScale(i)} cy={yScale(d.motivation)} r="6" fill="#FFFFFF" stroke="#EC4899" strokeWidth="2" style={{ transition: 'cy 0.2s ease-in-out' }} />
                                            <circle cx={xScale(i)} cy={yScale(d.resources)} r="6" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" style={{ transition: 'cy 0.2s ease-in-out' }} />
                                        </>
                                    ) : (
                                        <>
                                            <circle cx={xScale(i)} cy={yScale(d.motivation)} r="4" fill="#EC4899" style={{ transition: 'cy 0.2s ease-in-out' }} />
                                            <circle cx={xScale(i)} cy={yScale(d.resources)} r="4" fill="#38BDF8" style={{ transition: 'cy 0.2s ease-in-out' }} />
                                        </>
                                    )}
                                </g>
                            ))}

                            {/* Legend */}
                            <g transform={`translate(${width - margin.right - 180}, ${margin.top - 25})`}>
                                <rect x="0" y="0" width="10" height="10" fill="#EC4899" rx="2"/>
                                <text x="15" y="9" className="text-xs fill-text-primary">Motivation</text>
                                <rect x="100" y="0" width="10" height="10" fill="#38BDF8" rx="2"/>
                                <text x="115" y="9" className="text-xs fill-text-primary">Resources</text>
                            </g>
                        </svg>
                    </div>
                ) : (
                    <div className="h-[250px] flex items-center justify-center text-text-secondary italic">
                        Click a threat on the radar to view its projection timeline and edit its parameters.
                    </div>
                )}
            </div>
        </div>
    );
};

export const ThreatRadar: React.FC = () => {
    const [radarMode, setRadarMode] = useState<'profile' | 'archetype'>('profile');
    const [orgProfile, setOrgProfile] = useState<string>('A mid-sized US healthcare provider');
    const [radarData, setRadarData] = useState<ThreatRadarResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [threats, setThreats] = useState<ThreatRadarPoint[]>([]);
    const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
    const [pingedThreatIds, setPingedThreatIds] = useState(new Set<string>());
    const sweepRef = useRef<SVGPathElement>(null);

    const handleGenerateRadar = async () => {
        if (radarMode === 'profile' && !orgProfile.trim()) return;
        setIsLoading(true);
        setError(null);
        setSelectedThreatId(null);
        setRadarData(null); // Clear previous data
        try {
            const result = radarMode === 'profile'
                ? await generateThreatRadarData(orgProfile)
                : await generateArchetypeRadarData();
            setRadarData(result);

            const newRecord: SavedThreatRadar = {
                id: uuidv4(),
                timestamp: Date.now(),
                report: result,
                orgProfile: radarMode === 'profile' ? orgProfile : 'N/A',
                mode: radarMode,
            };
            try {
                const existing = JSON.parse(localStorage.getItem('ctiRadarReports') || '[]');
                existing.unshift(newRecord);
                localStorage.setItem('ctiRadarReports', JSON.stringify(existing.slice(0, 50)));
            } catch (e) { console.error('Failed to save radar report', e); }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setRadarData(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (radarData) {
            setThreats(radarData.threats);
        } else {
            setThreats([]);
        }
    }, [radarData]);

    const handleThreatUpdate = (updatedThreat: ThreatRadarPoint) => {
        setThreats(prevThreats => 
            prevThreats.map(t => t.name === updatedThreat.name ? updatedThreat : t)
        );
    };
    
    const size = 450;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 50;

    const scales = useMemo(() => {
        const getCoords = (motivation: number, angle: number) => {
            const r = (motivation / 10) * maxRadius;
            const rad = (angle - 90) * (Math.PI / 180);
            return {
                x: centerX + r * Math.cos(rad),
                y: centerY + r * Math.sin(rad),
            };
        };
        return { getCoords };
    }, [centerX, centerY, maxRadius]);

    const processedThreats = useMemo(() => {
        const threatsByCategory = threats.reduce((acc, threat) => {
            if (!acc[threat.category]) {
                acc[threat.category] = [];
            }
            acc[threat.category].push(threat);
            return acc;
        }, {} as Record<ThreatCategory, ThreatRadarPoint[]>);

        return threats.map(threat => {
            const categoryConf = CATEGORY_CONFIG[threat.category];
            const categoryThreats = threatsByCategory[threat.category];
            const threatIndex = categoryThreats.findIndex(t => t.name === threat.name);
            const numThreatsInCategory = categoryThreats.length;

            let angle = categoryConf.angle;
            // Create separate "lanes" for multiple threats in the same category
            if (numThreatsInCategory > 1) {
                const spread = 40; // degrees
                const baseAngle = categoryConf.angle - spread / 2;
                const angleStep = spread / (numThreatsInCategory - 1);
                angle = baseAngle + threatIndex * angleStep;
            }

            const { x, y } = scales.getCoords(threat.motivation, angle);
            return {
                ...threat,
                x,
                y,
                angle, // Store the calculated angle for trail projection
                radius: 10 + threat.resources * 1.5,
                color: categoryConf.color,
                icon: categoryConf.icon,
            };
        });
    }, [scales, threats]);

    const orgDisplayName = useMemo(() => {
        if (radarData?.title) {
            const parts = radarData.title.split(' for ');
            if (parts.length > 1) {
                return parts.slice(1).join(' for ');
            }
            return radarData.title;
        }
        if (isLoading) return "Loading...";
        return "No Profile";
    }, [radarData, isLoading]);

    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            if (sweepRef.current) {
                const style = window.getComputedStyle(sweepRef.current);
                const transform = style.transform;
                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform);
                    const currentAngle = (Math.atan2(matrix.b, matrix.a) * (180 / Math.PI) + 360) % 360;

                    const sweepWidth = 90; // sweepAngleDegrees
                    const leadingEdge = (currentAngle + sweepWidth / 2 + 360) % 360;
                    const trailingEdge = (currentAngle - sweepWidth / 2 + 360) % 360;
                    
                    const newPingedIds = new Set<string>();

                    processedThreats.forEach(threat => {
                        const threatAngle = threat.angle;
                        
                        let isInside = false;
                        if (leadingEdge >= trailingEdge) {
                            // Normal case, no 0/360 wrap
                            isInside = threatAngle >= trailingEdge && threatAngle <= leadingEdge;
                        } else {
                            // The wedge wraps around 0/360
                            isInside = threatAngle >= trailingEdge || threatAngle <= leadingEdge;
                        }

                        if (isInside) {
                            newPingedIds.add(threat.name);
                        }
                    });
                    
                    setPingedThreatIds(prevPingedIds => {
                        if (prevPingedIds.size === newPingedIds.size && [...prevPingedIds].every(id => newPingedIds.has(id))) {
                            return prevPingedIds;
                        }
                        return newPingedIds;
                    });
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [processedThreats]);


    const handleCycleForward = () => {
        setThreats(prevThreats => {
            return prevThreats.map(threat => {
                if (threat.quarterlyData.length < 1) return threat;

                const newCurrentState = threat.quarterlyData[0];
                const newQuarterlyData = threat.quarterlyData.slice(1);

                const lastQuarter = newQuarterlyData.length > 0 
                    ? newQuarterlyData[newQuarterlyData.length - 1] 
                    : newCurrentState;

                const newQuarter: ThreatRadarQuarterlyPoint = {
                    quarter: getNextQuarter(lastQuarter.quarter),
                    motivation: lastQuarter.motivation,
                    resources: lastQuarter.resources,
                };
                newQuarterlyData.push(newQuarter);

                return {
                    ...threat,
                    motivation: newCurrentState.motivation,
                    resources: newCurrentState.resources,
                    quarterlyData: newQuarterlyData,
                };
            });
        });
    };

    const sweepAngleDegrees = 90;
    const startAngleRad = - (sweepAngleDegrees / 2) * (Math.PI / 180);
    const endAngleRad = (sweepAngleDegrees / 2) * (Math.PI / 180);

    const startX = centerX + maxRadius * Math.sin(startAngleRad);
    const startY = centerY - maxRadius * Math.cos(startAngleRad);

    const endX = centerX + maxRadius * Math.sin(endAngleRad);
    const endY = centerY - maxRadius * Math.cos(endAngleRad);

    const largeArcFlag = sweepAngleDegrees <= 180 ? '0' : '1';

    const sweepPath = `M ${centerX},${centerY} L ${startX},${startY} A ${maxRadius},${maxRadius} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
    
    const handleThreatSelect = (threatId: string) => {
        setSelectedThreatId(currentId => (currentId === threatId ? null : threatId));
    };
    
    const selectedThreatForRadar = useMemo(() => {
        return processedThreats.find(t => t.name === selectedThreatId) || null;
    }, [selectedThreatId, processedThreats]);

    const selectedThreatData = useMemo(() => {
        return threats.find(t => t.name === selectedThreatId) || null;
    }, [selectedThreatId, threats]);

    const RadarModeSelector: React.FC = () => {
        const getButtonClasses = (buttonMode: 'profile' | 'archetype') => {
            const isActive = radarMode === buttonMode;
            return `flex-1 text-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-primary ${
                isActive ? 'bg-accent-primary text-white shadow-sm' : 'bg-surface hover:bg-border text-text-secondary hover:text-text-primary'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`;
        };
        return (
            <div className="flex gap-2 p-1 bg-card rounded-lg border border-border mb-4">
                <button 
                    onClick={() => { setRadarMode('profile'); setRadarData(null); }} 
                    className={getButtonClasses('profile')} 
                    disabled={isLoading}
                >
                    Profile-Based Radar
                </button>
                <button 
                    onClick={() => { setRadarMode('archetype'); setRadarData(null); }} 
                    className={getButtonClasses('archetype')} 
                    disabled={isLoading}
                >
                    Actor Archetype Radar
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
             <style>{`
                @keyframes sweep {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes blip-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
            `}</style>
            <h2 className="text-2xl font-semibold text-text-primary">Cyber Threat Radar</h2>
            <div className="bg-card border border-border p-4 rounded-lg">
                <p className="text-sm text-text-secondary mb-4">
                     {radarMode === 'profile' 
                        ? "Define your organization to generate a custom CTI radar." 
                        : "Generate a CTI radar based on 7 common threat actor archetypes."}
                </p>
                <RadarModeSelector />
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {radarMode === 'profile' && (
                        <div className="md:col-span-9 animate-fade-in">
                            <label className="block text-sm font-semibold text-text-secondary mb-1">Your Organization's Profile</label>
                            <textarea
                                value={orgProfile}
                                onChange={(e) => setOrgProfile(e.target.value)}
                                rows={2}
                                placeholder="e.g., A US-based financial services firm..."
                                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-colors"
                                disabled={isLoading}
                            />
                        </div>
                    )}
                    <div className={radarMode === 'profile' ? "md:col-span-3" : "md:col-span-12"}>
                        <button
                            onClick={handleGenerateRadar}
                            disabled={isLoading || (radarMode === 'profile' && !orgProfile.trim())}
                            className="w-full h-9 flex items-center justify-center gap-2 px-6 bg-accent-pro hover:opacity-90 disabled:bg-border disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-accent-pro"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SearchIcon className="w-5 h-5" />
                                    {radarMode === 'profile' ? 'Generate' : 'Generate Archetype Radar'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3 bg-surface p-4 rounded-lg border border-border relative aspect-square">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                            <svg className="animate-spin h-12 w-12 text-accent-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg">Generating Threat Radar...</p>
                            <p className="text-sm">This may take a moment.</p>
                        </div>
                    ) : error ? (
                         <div className="flex items-center justify-center h-full text-red-400 text-center">
                            <p>
                                <strong className="block text-lg mb-2">Failed to generate radar</strong>
                                {error}
                            </p>
                        </div>
                    ) : radarData ? (
                        <>
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={handleCycleForward}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 bg-surface/80 backdrop-blur-sm border border-border hover:bg-accent-primary text-white shadow-sm"
                                    title="Advance all threats to the next projected quarter"
                                >
                                    Cycle to Next Quarter &rarr;
                                </button>
                            </div>
                            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full font-sans" onClick={() => setSelectedThreatId(null)}>
                                {/* Background Grid */}
                                <defs>
                                    <radialGradient id="grad1">
                                        <stop offset="0%" stopColor="var(--color-surface)" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="var(--color-background)" stopOpacity="0" />
                                    </radialGradient>
                                    <radialGradient id="sweep-radial-gradient">
                                        <stop offset="20%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
                                        <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0.25" />
                                    </radialGradient>
                                </defs>
                                <circle cx={centerX} cy={centerY} r={maxRadius} fill="url(#grad1)" />
                                {[0.25, 0.5, 0.75, 1].map(r => (
                                    <circle key={r} cx={centerX} cy={centerY} r={maxRadius * r} fill="none" stroke="var(--color-border)" strokeWidth="1" />
                                ))}
                                {Object.values(CATEGORY_CONFIG).map(c => (
                                    <line key={c.angle} x1={centerX} y1={centerY} x2={scales.getCoords(10, c.angle).x} y2={scales.getCoords(10, c.angle).y} stroke="var(--color-border)" strokeWidth="1" />
                                ))}

                                {/* Radar Sweep */}
                                <path
                                    ref={sweepRef}
                                    d={sweepPath}
                                    fill="url(#sweep-radial-gradient)"
                                    style={{
                                        transformOrigin: `${centerX}px ${centerY}px`,
                                        animation: 'sweep 4s linear infinite',
                                    }}
                                    pointerEvents="none"
                                />

                                {/* Central Text Display */}
                                <g transform={`translate(${centerX}, ${centerY})`}>
                                    <circle r="50" fill="var(--color-background)" fillOpacity="0.7" />
                                    <foreignObject x="-45" y="-45" width="90" height="90">
                                        <div className="flex flex-col items-center justify-center h-full text-center text-accent-primary">
                                            <BuildingIcon className="w-8 h-8 mb-1" />
                                            <p className="text-[10px] font-bold leading-tight px-1">{orgDisplayName}</p>
                                        </div>
                                    </foreignObject>
                                </g>

                                {/* Blips and Trails */}
                                {selectedThreatForRadar && (
                                    <ProjectionTrail threat={selectedThreatForRadar} scales={scales} />
                                )}
                                {processedThreats.map(threat => (
                                    <Blip 
                                        key={threat.name} 
                                        threat={threat}
                                        onClick={handleThreatSelect}
                                        isSelected={selectedThreatId === threat.name}
                                        isPinged={pingedThreatIds.has(threat.name)}
                                    />
                                ))}
                            </svg>
                            {selectedThreatForRadar && <Tooltip threat={selectedThreatForRadar} />}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Select a radar mode above and click 'Generate' to begin.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2">
                   {selectedThreatData ? (
                        <ThreatControlPanel 
                            threat={selectedThreatData}
                            onUpdate={handleThreatUpdate}
                            onClose={() => setSelectedThreatId(null)}
                        />
                   ) : (
                    <div className="bg-card border border-border p-4 rounded-lg h-full">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Threat Categories</h3>
                        <div className="space-y-3">
                            {Object.entries(CATEGORY_CONFIG).map(([name, conf]) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: `${conf.color}33`, border: `1px solid ${conf.color}` }}>
                                        {conf.icon}
                                    </div>
                                    <span className="font-semibold text-text-primary">{name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 border-t border-border pt-4 text-xs text-text-secondary space-y-2">
                             <p><strong className="text-text-primary">Motivation (Proximity to Center):</strong> The closer a threat is to the center, the lower its motivation or potential impact.</p>
                             <p><strong className="text-text-primary">Resources (Blip Size):</strong> The larger the blip, the more sophisticated the resources required to execute the threat.</p>
                        </div>
                    </div>
                   )}
                </div>
            </div>
            <ThreatProjectionChart threat={selectedThreatData} />
        </div>
    );
};
