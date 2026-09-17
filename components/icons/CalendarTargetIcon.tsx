import React from 'react';

export const CalendarTargetIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v-1m0 6v-1m-3-2h1m4 0h1" />
    </svg>
);
