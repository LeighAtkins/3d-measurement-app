import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from 'clsx';
export const Card = ({ children, className, padding = 'md' }) => {
    const paddingClasses = {
        sm: 'p-3',
        md: 'p-6',
        lg: 'p-8',
    };
    return (_jsx("div", { className: clsx('bg-white rounded-lg border border-gray-200 shadow-sm', paddingClasses[padding], className), children: children }));
};
export const CardHeader = ({ children, className, }) => (_jsx("div", { className: clsx('mb-4', className), children: children }));
export const CardTitle = ({ children, className, }) => (_jsx("h3", { className: clsx('text-lg font-semibold text-gray-900', className), children: children }));
export const CardContent = ({ children, className, }) => (_jsx("div", { className: clsx(className), children: children }));
