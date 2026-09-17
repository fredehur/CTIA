import React, { useState } from 'react';
import type { QueryPlan } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ListChecksIcon } from './icons/ListChecksIcon';

interface QueryPlanPreviewProps {
  plans: QueryPlan[];
  onRun: () => void;
  onCancel: () => void;
}

const PlanDetail: React.FC<{ plan: QueryPlan }> = ({ plan }) => {
    return (
        <div className="space-y-4 text-sm animate-fade-in">
            {plan.qualityGateMessage && (
                <div className="p-3 bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 rounded-md flex items-start gap-3">
                    <ShieldCheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">Quality Gate Warning</h4>
                        <p className="text-xs">{plan.qualityGateMessage}</p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-3 rounded-md border border-border">
                    <p className="text-xs text-text-secondary font-semibold">Coverage Score</p>
                    <p className="text-2xl font-bold text-accent-primary">{plan.coverageScore}%</p>
                </div>
                <div className="bg-surface p-3 rounded-md border border-border">
                    <p className="text-xs text-text-secondary font-semibold">Expected Yield (Last Year)</p>
                    <div className="text-xs mt-1 space-y-0.5">
                        {plan.expectedYield.map(y => (
                            <div key={y.metricKey} className="flex justify-between">
                                <span className="text-text-secondary">{y.metricKey}:</span>
                                <span className="font-mono text-text-primary">{y.lastYearCount}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-text-primary mb-2">Metrics & Weights</h4>
                <div className="overflow-x-auto border border-border rounded-md">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-surface text-text-secondary">
                            <tr>
                                <th className="p-2">Dataset</th>
                                <th className="p-2">Filter</th>
                                <th className="p-2 text-center">Base</th>
                                <th className="p-2 text-center">Boost</th>
                                <th className="p-2 text-center">Final Weight</th>
                                <th className="p-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {plan.metrics.map(metric => (
                                <tr key={metric.metricKey} className="hover:bg-surface/50">
                                    <td className="p-2 font-semibold text-text-primary">{metric.datasetTitle}</td>
                                    <td className="p-2 font-mono">{metric.filterApplied}</td>
                                    <td className="p-2 font-mono text-center">{metric.baseWeight.toFixed(2)}</td>
                                    <td className="p-2 font-mono text-center text-green-400">+{metric.boost.toFixed(2)}</td>
                                    <td className="p-2 font-mono text-center font-bold text-accent-primary">{metric.finalWeight.toFixed(2)}</td>
                                    <td className="p-2 text-text-secondary italic truncate max-w-xs" title={metric.notes}>{metric.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const QueryPlanPreview: React.FC<QueryPlanPreviewProps> = ({ plans, onRun, onCancel }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card w-full max-w-4xl h-[90vh] flex flex-col border border-border rounded-lg shadow-2xl">
        <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <ListChecksIcon className="w-6 h-6 text-accent-primary" />
            <h2 className="text-xl font-bold text-text-primary">Search Plan Preview</h2>
          </div>
          <button onClick={onCancel} className="text-text-secondary hover:text-white">&times;</button>
        </header>
        
        <main className="flex-grow p-6 overflow-y-auto">
            <p className="text-sm text-text-secondary mb-4">
                Based on your scenario, the system has generated the following deterministic query plan. Review the data sources, weights, and quality checks before execution.
            </p>
            <div className="border-b border-border mb-4">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {plans.map((plan, index) => (
                        <button
                            key={plan.bucket}
                            onClick={() => setActiveTab(index)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                                activeTab === index
                                    ? 'border-accent-primary text-accent-primary'
                                    : 'border-transparent text-text-secondary hover:border-border hover:text-text-primary'
                            }`}
                        >
                            {plan.bucket} Plan
                        </button>
                    ))}
                </nav>
            </div>
            {plans[activeTab] && <PlanDetail plan={plans[activeTab]} />}
        </main>

        <footer className="p-4 border-t border-border bg-surface flex justify-end gap-4 flex-shrink-0">
          <button onClick={onCancel} className="px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 bg-surface hover:bg-border text-text-primary border border-border">
            Cancel & Refine Scenario
          </button>
          <button onClick={onRun} className="px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 bg-accent-pro hover:opacity-90 text-white">
            Run with Plan
          </button>
        </footer>
      </div>
    </div>
  );
};
