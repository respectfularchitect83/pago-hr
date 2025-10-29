import React from 'react';

const WandIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2.5l1 2-1 2-2-1-2 1 1-2-1-2 2 1zM3.5 10.5l1 2-1 2-2-1-2 1 1-2-1-2 2 1zM10 17l2 2 2-2-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.002 4.999a8.956 8.956 0 012.823 2.829 9.004 9.004 0 01.444 8.732 8.962 8.962 0 01-5.29 5.29 9.004 9.004 0 01-8.732-.444 8.956 8.956 0 01-2.829-2.823 9.004 9.004 0 01-.444-8.732 8.962 8.962 0 015.29-5.29 9.004 9.004 0 018.732.444z" />
    </svg>
);

export default WandIcon;