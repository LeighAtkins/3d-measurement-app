"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMeasurement = exports.calculateDistance = exports.generateId = void 0;
const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};
exports.generateId = generateId;
const calculateDistance = (point1, point2) => {
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    const dz = point2[2] - point1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
exports.calculateDistance = calculateDistance;
const formatMeasurement = (value, unit = 'cm') => {
    return `${value.toFixed(2)} ${unit}`;
};
exports.formatMeasurement = formatMeasurement;
//# sourceMappingURL=index.js.map