import React from 'react';

export const HexagonIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22.05 9.62999L18.2 3.26999C17.34 1.83999 15.82 0.949993 14.15 0.949993H9.85C8.18 0.949993 6.66 1.83999 5.8 3.26999L1.95 9.62999C1.09 11.06 1.09 12.94 1.95 14.37L5.8 20.73C6.66 22.16 8.18 23.05 9.85 23.05H14.15C15.82 23.05 17.34 22.16 18.2 20.73L22.05 14.37C22.91 12.94 22.91 11.06 22.05 9.62999Z" />
  </svg>
);
