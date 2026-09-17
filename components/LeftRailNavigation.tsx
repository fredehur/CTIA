import React from 'react';
import { BrainIcon } from './icons/BrainIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { RadarIcon } from './icons/RadarIcon';
import { HomeIcon } from './icons/HomeIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { CalendarTargetIcon } from './icons/CalendarTargetIcon';

type TabType = 'overview' | 'intelligence' | 'cti' | 'breach' | 'landscape' | 'radar' | 'yearly_attempts' | 'scenario_modeler';

interface LeftRailNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const navItems = [
    { id: 'overview', label: 'Overview', icon: HomeIcon },
    { id: 'intelligence', label: 'Intelligence Dashboard', icon: GlobeIcon },
    { id: 'cti', label: 'CTI Analyst', icon: BrainIcon },
    { id: 'scenario_modeler', label: 'Scenario Modeler', icon: BrainIcon },
    { id: 'yearly_attempts', label: 'Yearly Attempts', icon: CalendarTargetIcon },
    { id: 'breach', label: 'Breach Data', icon: ChartBarIcon },
    { id: 'landscape', label: 'Threat Landscape', icon: LandscapeIcon },
    { id: 'radar', label: 'Threat Radar', icon: RadarIcon },
] as const;


export const LeftRailNavigation: React.FC<LeftRailNavigationProps> = ({ activeTab, setActiveTab }) => {
  const getButtonClasses = (tabName: TabType) => {
    const isActive = activeTab === tabName;
    return `w-full flex items-center gap-3 py-2 px-3 text-sm font-medium rounded-md transition-colors duration-150 ${
      isActive
        ? 'bg-black/5 text-text-primary'
        : 'text-text-secondary hover:bg-black/5 hover:text-text-primary'
    }`;
  };

  return (
    <aside className="w-[240px] bg-card border-r border-border/60 p-4 flex-shrink-0 h-[calc(100vh-60px)] sticky top-[60px]">
        <nav>
            <ul className="space-y-1">
                {navItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <li key={item.id}>
                            <button onClick={() => setActiveTab(item.id)} className={getButtonClasses(item.id)}>
                                <Icon className="w-4 h-4 opacity-70" />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </nav>
    </aside>
  );
};
