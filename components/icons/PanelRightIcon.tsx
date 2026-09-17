import React from 'react';

export const PanelRightIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="none" fill="none"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v18" />
  </svg>
);
