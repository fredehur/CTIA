import React, { useMemo } from 'react';
import type { AnalysisHistoryRecord } from '../types';
import { HexagonIcon } from './icons/HexagonIcon';

const Node: React.FC<{ x: number, y: number, type: 'actor' | 'mo' | 'target', label: string }> = ({ x, y, type, label }) => {
  const typeStyles = {
    actor: { color: 'text-red-400', fill: 'fill-red-900/50', stroke: 'stroke-red-500' },
    mo: { color: 'text-cyan-400', fill: 'fill-cyan-900/50', stroke: 'stroke-cyan-500' },
    target: { color: 'text-yellow-400', fill: 'fill-yellow-900/50', stroke: 'stroke-yellow-500' },
  };
  const style = typeStyles[type];

  return (
    <g transform={`translate(${x}, ${y})`} className="transition-transform duration-300 hover:scale-110">
      {type === 'actor' && (
        <>
            <HexagonIcon className={`${style.color} w-24 h-24 -translate-x-12 -translate-y-12`} />
            <text x="0" y="0" textAnchor="middle" dominantBaseline="central" className="font-bold text-sm fill-text-primary pointer-events-none">
                {label.length > 15 ? label.substring(0, 13) + '...' : label}
            </text>
        </>
      )}
      {type === 'mo' && (
         <>
            <rect x="-75" y="-20" width="150" height="40" rx="10" className={`${style.fill} ${style.stroke}`} strokeWidth="1" />
            <foreignObject x="-70" y="-15" width="140" height="30">
                 <p className="text-xs text-center text-text-primary font-semibold p-1 leading-tight pointer-events-none">
                    {label}
                 </p>
            </foreignObject>
         </>
      )}
      {type === 'target' && (
         <>
            <circle r="45" className={`${style.fill} ${style.stroke}`} strokeWidth="1" />
            <foreignObject x="-40" y="-30" width="80" height="60">
                <p className="text-xs text-center text-text-primary font-semibold p-1 leading-tight pointer-events-none">
                    {label}
                </p>
            </foreignObject>
         </>
      )}
      <title>{label}</title>
    </g>
  );
};

const Edge: React.FC<{ fromPos: {x:number, y:number}, toPos: {x:number, y:number} }> = ({ fromPos, toPos }) => {
    const d = `M${fromPos.x},${fromPos.y} C${fromPos.x + 100},${fromPos.y} ${toPos.x - 100},${toPos.y} ${toPos.x},${toPos.y}`;
    return <path d={d} stroke="url(#edge-gradient)" strokeWidth="2" fill="none" className="transition-all duration-300" />;
};

export const RelationshipVisualizer: React.FC<{ history: AnalysisHistoryRecord[] }> = ({ history }) => {
    const { actorNodes, moNodes, targetNodes, edges } = useMemo(() => {
        const actors = new Map<string, { id: string; type: 'actor' }>();
        const mos = new Map<string, { id: string; type: 'mo' }>();
        const targets = new Map<string, { id: string; type: 'target' }>();
        const edges: { from: string; to: string }[] = [];

        history.forEach(record => {
            const { threatActor, modusOperandi, target } = record.scenario;
            if (!actors.has(threatActor)) actors.set(threatActor, { id: threatActor, type: 'actor' });
            if (!mos.has(modusOperandi)) mos.set(modusOperandi, { id: modusOperandi, type: 'mo' });
            if (!targets.has(target)) targets.set(target, { id: target, type: 'target' });

            const actorToMo = { from: threatActor, to: modusOperandi };
            if (!edges.some(e => e.from === actorToMo.from && e.to === actorToMo.to)) edges.push(actorToMo);

            const moToTarget = { from: modusOperandi, to: target };
            if (!edges.some(e => e.from === moToTarget.from && e.to === moToTarget.to)) edges.push(moToTarget);
        });

        return {
            actorNodes: Array.from(actors.values()),
            moNodes: Array.from(mos.values()),
            targetNodes: Array.from(targets.values()),
            edges,
        };
    }, [history]);

    const { nodePositions, width, height } = useMemo(() => {
        const positions = new Map<string, { x: number; y: number }>();
        const X_COORDS = { actor: 150, mo: 450, target: 750 };
        const Y_SPACING = 120;
        
        const calculateY = (nodes: {id: string}[], col: 'actor'|'mo'|'target') => {
            nodes.forEach((node, i) => {
                positions.set(node.id, { x: X_COORDS[col], y: (i + 1) * Y_SPACING });
            });
        };

        calculateY(actorNodes, 'actor');
        calculateY(moNodes, 'mo');
        calculateY(targetNodes, 'target');

        const height = Math.max(actorNodes.length, moNodes.length, targetNodes.length) * Y_SPACING + Y_SPACING;
        const width = 900;
        
        return { nodePositions: positions, width, height };
    }, [actorNodes, moNodes, targetNodes]);

    if (actorNodes.length === 0) return null;

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-3 bg-surface border-b border-border">
                <h3 className="text-sm font-semibold text-text-primary">Threat Actor Relationship Map</h3>
            </div>
            <div className="p-4 overflow-x-auto">
                <svg width={width} height={height}>
                    <defs>
                        <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#4A5568', stopOpacity: 0.8 }} />
                            <stop offset="100%" style={{ stopColor: '#718096', stopOpacity: 0.8 }} />
                        </linearGradient>
                    </defs>
                    <g>
                        {edges.map((edge, i) => {
                            const fromPos = nodePositions.get(edge.from);
                            const toPos = nodePositions.get(edge.to);
                            if (!fromPos || !toPos) return null;
                            return <Edge key={i} fromPos={fromPos} toPos={toPos} />;
                        })}
                    </g>
                     <g>
                        {[...actorNodes, ...moNodes, ...targetNodes].map(node => {
                           const pos = nodePositions.get(node.id);
                           if(!pos) return null;
                           return <Node key={node.id} x={pos.x} y={pos.y} type={node.type} label={node.id} />;
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};
