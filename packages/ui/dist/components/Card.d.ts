import React from 'react';
export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}
export declare const Card: React.FC<CardProps>;
export declare const CardHeader: React.FC<{
    children: React.ReactNode;
    className?: string;
}>;
export declare const CardTitle: React.FC<{
    children: React.ReactNode;
    className?: string;
}>;
export declare const CardContent: React.FC<{
    children: React.ReactNode;
    className?: string;
}>;
