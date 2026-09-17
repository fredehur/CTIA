


import React, { useState, useEffect, useMemo } from 'react';
import type { AnalysisHistoryRecord, SavedBreachData, SavedThreatLandscape, SavedThreatRadar, SavedMemorandum, RecentActivityItem, SavedYearlyAttempts, SavedSuccessRate } from '../types';
import { RelationshipVisualizer } from './RelationshipVisualizer';
import { BrainIcon } from './icons/BrainIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { RadarIcon } from './icons/RadarIcon';
import { CalendarTargetIcon } from './icons/CalendarTargetIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-card border border-border p-4 rounded-lg flex items-center gap-4">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-surface rounded-md text-accent-primary">
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const ActivityItem: React.FC<{ item: RecentActivityItem }> = ({ item }) => {
    let icon, title, subtitle;

    switch (item.type) {
        case 'CTI Analysis':
            icon = <BrainIcon className="w-5 h-5 text-accent-primary" />;
            title = `CTI Analysis: ${item.data.scenario.threatActor}`;
            subtitle = item.data.scenario.target;
            break;
        case 'Landscape Report':
            icon = <LandscapeIcon className="w-5 h-5 text-accent-primary" />;
            title = `Landscape Report (${item.data.mode})`;
            subtitle = item.data.orgProfile;
            break;
        case 'Radar Report':
            icon = <RadarIcon className="w-5 h-5 text-accent-primary" />;
            title = `Threat Radar (${item.data.mode})`;
            subtitle = item.data.orgProfile;
            break;
        case 'Breach Data':
            icon = <ChartBarIcon className="w-5 h-5 text-accent-primary" />;
            title = 'Breach Data Search';
            subtitle = `${item.data.threatActor} / ${item.data.modusOperandi}`;
            break;
        case 'Event Memo':
            icon = <LandscapeIcon className="w-5 h-5 text-accent-primary" />;
            title = 'Event Memorandum';
            subtitle = item.data.eventDescription;
            break;
        case 'Yearly Attempts Report':
            icon = <CalendarTargetIcon className="w-5 h-5 text-accent-primary" />;
            title = 'Yearly Attempts Report';
            subtitle = `${item.data.results.length} scenarios analyzed`;
            break;
        case 'Success Rate Report':
            icon = <ShieldCheckIcon className="w-5 h-5 text-accent-primary" />;
            title = 'Success Rate Report';
            subtitle = `${item.data.results.length} scenarios analyzed`;
            break;
    }

    return (
        <li className="flex items-center gap-4 p-2 -m-2 rounded-lg hover:bg-surface transition-colors">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-surface rounded-md border border-border">
                {icon}
            </div>
            <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm text-text-primary truncate">{title}</p>
                <p className="text-xs text-text-secondary truncate">{subtitle}</p>
            </div>
            <p className="text-xs text-text-secondary flex-shrink-0 font-mono">
                {new Date(item.data.timestamp).toLocaleDateString()}
            </p>
        </li>
    );
};

export const Overview: React.FC<{ history: AnalysisHistoryRecord[] }> = ({ history }) => {
    const [activity, setActivity] = useState<RecentActivityItem[]>([]);
    
    useEffect(() => {
        const loadData = () => {
            const breachData: SavedBreachData[] = JSON.parse(localStorage.getItem('ctiBreachDataSearches') || '[]');
            const landscapeData: SavedThreatLandscape[] = JSON.parse(localStorage.getItem('ctiLandscapeReports') || '[]');
            const radarData: SavedThreatRadar[] = JSON.parse(localStorage.getItem('ctiRadarReports') || '[]');
            const memoData: SavedMemorandum[] = JSON.parse(localStorage.getItem('ctiEventMemorandums') || '[]');
            const yearlyAttemptsData: SavedYearlyAttempts[] = JSON.parse(localStorage.getItem('ctiYearlyAttemptsReports') || '[]');
            const successRateData: SavedSuccessRate[] = JSON.parse(localStorage.getItem('ctiSuccessRateReports') || '[]');
            
            const allActivity: RecentActivityItem[] = [
                ...history.map(data => ({ type: 'CTI Analysis' as const, data })),
                ...breachData.map(data => ({ type: 'Breach Data' as const, data })),
                ...landscapeData.map(data => ({ type: 'Landscape Report' as const, data })),
                ...radarData.map(data => ({ type: 'Radar Report' as const, data })),
                ...memoData.map(data => ({ type: 'Event Memo' as const, data })),
                ...yearlyAttemptsData.map(data => ({ type: 'Yearly Attempts Report' as const, data })),
                ...successRateData.map(data => ({ type: 'Success Rate Report' as const, data })),
            ];

            allActivity.sort((a, b) => b.data.timestamp - a.data.timestamp);
            setActivity(allActivity);
        };

        loadData();
         // Also listen for storage changes from other tabs
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, [history]);

    const stats = useMemo(() => {
        const ctiAnalyses = history.length;
        const eventMemos = activity.filter(a => a.type === 'Event Memo').length;
        const landscapeReports = activity.filter(a => a.type === 'Landscape Report').length;
        
        const actorCounts = history.reduce((acc, curr) => {
            acc[curr.scenario.threatActor] = (acc[curr.scenario.threatActor] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        // Fix: Explicitly cast the values to `number` to resolve TypeScript error where
        // it fails to infer the correct type for the subtraction operation.
        const mostFrequentActor = Object.entries(actorCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'N/A';

        return { ctiAnalyses, eventMemos, landscapeReports, mostFrequentActor };
    }, [history, activity]);

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-semibold text-text-primary">Intelligence Overview</h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <RelationshipVisualizer history={history} />
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary">Key Metrics</h3>
                    <StatCard title="CTI Analyses Conducted" value={stats.ctiAnalyses} icon={<BrainIcon className="w-6 h-6" />} />
                    <StatCard title="Event Memos Drafted" value={stats.eventMemos} icon={<LandscapeIcon className="w-6 h-6" />} />
                    <StatCard title="Landscape Reports" value={stats.landscapeReports} icon={<LandscapeIcon className="w-6 h-6" />} />
                    <StatCard title="Most Frequent Actor" value={stats.mostFrequentActor} icon={<BrainIcon className="w-6 h-6" />} />
                </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
                {activity.length > 0 ? (
                    <ul className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {activity.map(item => <ActivityItem key={item.data.id} item={item} />)}
                    </ul>
                ) : (
                    <div className="text-center py-10 text-text-secondary">
                        <p>No activity yet.</p>
                        <p className="text-sm">Start an analysis in one of the other tabs to see your work summarized here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};