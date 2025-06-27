import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
export const LoadingSpinner = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    return (_jsx("div", { className: clsx('animate-spin rounded-full border-b-2 border-blue-600', sizeClasses[size], className) }));
};
export const LoadingPage = ({ message = 'Loading...' }) => (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsxs("div", { className: "text-center", children: [_jsx(LoadingSpinner, { size: "lg", className: "mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: message })] }) }));
