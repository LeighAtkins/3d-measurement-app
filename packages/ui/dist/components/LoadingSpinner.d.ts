import React from 'react';
export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}
export declare const LoadingSpinner: React.FC<LoadingSpinnerProps>;
export declare const LoadingPage: React.FC<{
    message?: string;
}>;
