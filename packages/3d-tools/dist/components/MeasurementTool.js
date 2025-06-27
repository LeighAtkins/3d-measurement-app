import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
export const MeasurementTool = ({ onMeasurementCreate, disabled = false }) => {
    const [mode, setMode] = useState('view');
    const [firstPoint, setFirstPoint] = useState(null);
    const [measurementType, setMeasurementType] = useState('LENGTH');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [tempMeasurement, setTempMeasurement] = useState(null);
    const handleStartMeasurement = () => {
        if (disabled)
            return;
        setMode('measuring');
        setFirstPoint(null);
    };
    const handlePointClick = useCallback((point) => {
        if (mode !== 'measuring')
            return;
        if (!firstPoint) {
            // First point clicked
            setFirstPoint(point.clone());
        }
        else {
            // Second point clicked - complete measurement
            setTempMeasurement({
                start: firstPoint,
                end: point.clone()
            });
            setShowCreateDialog(true);
            setMode('view');
            setFirstPoint(null);
        }
    }, [mode, firstPoint]);
    const handleCreateMeasurement = (label) => {
        if (!tempMeasurement)
            return;
        const measurement = {
            type: measurementType,
            label,
            start: tempMeasurement.start,
            end: tempMeasurement.end,
            unit: 'cm'
        };
        onMeasurementCreate(measurement);
        setShowCreateDialog(false);
        setTempMeasurement(null);
    };
    const handleCancel = () => {
        setMode('view');
        setFirstPoint(null);
        setShowCreateDialog(false);
        setTempMeasurement(null);
    };
    const getMeasurementTypeLabel = (type) => {
        const labels = {
            LENGTH: 'Length',
            WIDTH: 'Width',
            HEIGHT: 'Height',
            DIAMETER: 'Diameter',
            CIRCUMFERENCE: 'Circumference',
            ANGLE: 'Angle',
            CUSTOM: 'Custom'
        };
        return labels[type] || type;
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4 space-y-4", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: "Measurement Tools" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Measurement Type" }), _jsxs("select", { value: measurementType, onChange: (e) => setMeasurementType(e.target.value), className: "w-full border border-gray-300 rounded-md px-3 py-2 text-sm", disabled: mode === 'measuring', children: [_jsx("option", { value: "LENGTH", children: "Length" }), _jsx("option", { value: "WIDTH", children: "Width" }), _jsx("option", { value: "HEIGHT", children: "Height" }), _jsx("option", { value: "DIAMETER", children: "Diameter" }), _jsx("option", { value: "CIRCUMFERENCE", children: "Circumference" }), _jsx("option", { value: "ANGLE", children: "Angle" }), _jsx("option", { value: "CUSTOM", children: "Custom" })] })] }), _jsx("div", { className: "space-y-2", children: mode === 'view' ? (_jsxs("button", { onClick: handleStartMeasurement, disabled: disabled, className: "w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: ["Create ", getMeasurementTypeLabel(measurementType)] })) : (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm text-blue-600 font-medium", children: firstPoint ? 'Click second point' : 'Click first point' }), _jsx("button", { onClick: handleCancel, className: "w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600", children: "Cancel" })] })) }), _jsx("div", { className: "text-xs text-gray-500", children: mode === 'view'
                            ? 'Select measurement type and click "Create" to start measuring'
                            : 'Click two points on the 3D model to create a measurement' })] }), showCreateDialog && tempMeasurement && (_jsx(CreateMeasurementDialog, { measurementType: measurementType, start: tempMeasurement.start, end: tempMeasurement.end, onConfirm: handleCreateMeasurement, onCancel: handleCancel }))] }));
};
const CreateMeasurementDialog = ({ measurementType, start, end, onConfirm, onCancel }) => {
    const [label, setLabel] = useState('');
    const distance = start.distanceTo(end);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (label.trim()) {
            onConfirm(label.trim());
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Create Measurement" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Type" }), _jsx("input", { type: "text", value: measurementType, disabled: true, className: "w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Label *" }), _jsx("input", { type: "text", value: label, onChange: (e) => setLabel(e.target.value), placeholder: "Enter measurement label", className: "w-full border border-gray-300 rounded-md px-3 py-2 text-sm", autoFocus: true, required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "3D Distance" }), _jsx("input", { type: "text", value: `${distance.toFixed(3)} units`, disabled: true, className: "w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm" })] }), _jsxs("div", { className: "bg-gray-50 p-3 rounded text-xs", children: [_jsxs("div", { children: [_jsx("strong", { children: "Start:" }), " (", start.x.toFixed(3), ", ", start.y.toFixed(3), ", ", start.z.toFixed(3), ")"] }), _jsxs("div", { children: [_jsx("strong", { children: "End:" }), " (", end.x.toFixed(3), ", ", end.y.toFixed(3), ", ", end.z.toFixed(3), ")"] })] }), _jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { type: "button", onClick: onCancel, className: "flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50", children: "Cancel" }), _jsx("button", { type: "submit", className: "flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700", children: "Create" })] })] })] }) }));
};
