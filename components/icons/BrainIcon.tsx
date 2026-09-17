
import React from 'react';

export const BrainIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.5 13.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.5 13.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.5 6.5A.5.5 0 019 7v1a.5.5 0 01-1 0V7a.5.5 0 01.5-.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM10 11.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"
    />
  </svg>
);