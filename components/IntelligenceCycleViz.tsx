import React from 'react';
import type { CycleStage } from '../types';

// Updated stages with pre-split labels for multi-line display
const STAGES = [
  { id: 'problem', label: ['PROBLEM', 'DEFINITION'] },
  { id: 'needs', label: ['INITIAL', 'NEEDS'] },
  { id: 'analysis_gaps', label: ['GAP', 'ANALYSIS'] },
  { id: 'collecting', label: ['DATA', 'COLLECTION'] },
  { id: 'new_info', label: ['EVIDENCE', 'REVIEW'] },
  { id: 'analysis_answers', label: ['INTELLIGENCE', 'SYNTHESIS'] },
] as const;


const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};


export const IntelligenceCycleViz: React.FC<{ activeStage: CycleStage }> = ({ activeStage }) => {
  const activeStageInfo = STAGES.find(s => s.id === activeStage);
  const activeLabelLines = activeStageInfo ? activeStageInfo.label : [];

  return (
    <div className="p-4 bg-card border rounded-lg h-full border-accent-pro/50 shadow-[0_0_15px_var(--color-focus-ring)]">
       <h3 className="text-sm font-semibold text-text-primary mb-4 text-center">Intelligence Cycle Status</h3>
      
      <div className="relative w-full max-w-[200px] mx-auto aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <g transform="translate(100, 100)">
            {/* Center Text */}
            <circle cx="0" cy="0" r="45" fill="var(--color-surface)" />
             <text
                x="0"
                y="-5"
                textAnchor="middle"
                className="font-bold text-[12px] fill-[var(--color-accent-primary)] transition-opacity duration-500 uppercase tracking-wider"
                style={{ opacity: activeStage === 'idle' ? 0 : 1 }}
              >
                {activeLabelLines[0]}
              </text>
              <text
                x="0"
                y="10"
                textAnchor="middle"
                className="font-bold text-[12px] fill-[var(--color-accent-primary)] transition-opacity duration-500 uppercase tracking-wider"
                style={{ opacity: activeStage === 'idle' ? 0 : 1 }}
              >
                {activeLabelLines[1]}
              </text>
              <text
                x="0"
                y="0"
                textAnchor="middle"
                alignmentBaseline="central"
                className="font-bold text-[14px] fill-text-secondary transition-opacity duration-500"
                style={{ opacity: activeStage === 'idle' ? 1 : 0 }}
              >
                Idle
              </text>


            {/* Arcs and Labels */}
            {STAGES.map((stage, index) => {
              const isActive = activeStage === stage.id;
              const angle = 360 / STAGES.length;
              const startAngle = index * angle;
              const endAngle = startAngle + angle;
              const textRadius = 82;
              const textAngle = startAngle + angle / 2;
              const { x, y } = polarToCartesian(0, 0, textRadius, textAngle);

              return (
                <g key={stage.id}>
                  <path
                    d={describeArc(0, 0, 65, startAngle, endAngle - 5)} // -5 for gap
                    strokeWidth="12"
                    fill="none"
                    className="transition-all duration-500"
                    style={isActive 
                        ? { stroke: 'var(--color-accent-primary)', filter: 'drop-shadow(0 0 4px var(--color-accent-primary))' }
                        : { stroke: 'rgba(148,161,178,0.16)' }
                    }
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fill="var(--color-text-primary)"
                    className={`font-semibold text-[8px] uppercase tracking-wider transition-all duration-500 ${isActive ? 'opacity-100 scale-105' : 'opacity-60'}`}
                  >
                    <tspan x={x} dy="-0.4em">{stage.label[0]}</tspan>
                    <tspan x={x} dy="1.2em">{stage.label[1]}</tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};