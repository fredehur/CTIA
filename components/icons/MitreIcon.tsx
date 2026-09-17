import React from 'react';

export const MitreIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 256 256" 
    className={className}
    fill="currentColor"
  >
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-88a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H136A8,8,0,0,1,128,128Zm-8-40a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H136A8,8,0,0,1,128,88Zm-8,80a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H136A8,8,0,0,1,128,168ZM80,88a8,8,0,0,1-16,0V72a8,8,0,0,1,16,0Zm0,40a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm0,40a8,8,0,0,1-16,0V152a8,8,0,0,1,16,0Z"></path>
  </svg>
);