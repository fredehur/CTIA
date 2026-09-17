import React from 'react';

export const GlobeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 01-9-9 9 9 0 019-9m9 9a9 9 0 01-9 9m9-9H3m16.5 0a16.5 16.5 0 00-5.412-8.525M3 12a16.5 16.5 0 015.412-8.525m0 0L8.25 12m0 0l-2.838 8.525M15.75 12l2.838 8.525m0-17.05L15.75 12" />
    </svg>
);