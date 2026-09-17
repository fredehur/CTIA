import React from 'react';

export const HillsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={1.5}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3.75 12C3.75 9.25 6 7 9 7s5.25 2.25 5.25 5" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M10.5 9.75c0 1.5 1.125 3 2.25 3s2.25-1.5 2.25-3" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M15 9.75c0 2.25 1.5 4.5 3.75 4.5s3.75-2.25 3.75-4.5" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 21h18" 
        />
    </svg>
);
