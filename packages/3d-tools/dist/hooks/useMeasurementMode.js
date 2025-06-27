import { useState, useCallback } from 'react';
export const useMeasurementMode = () => {
    const [mode, setMode] = useState({
        isActive: false,
        firstPoint: null,
        previewPoint: null
    });
    const startMeasurement = useCallback(() => {
        setMode({
            isActive: true,
            firstPoint: null,
            previewPoint: null
        });
    }, []);
    const handlePointClick = useCallback((point) => {
        if (!mode.isActive)
            return null;
        if (!mode.firstPoint) {
            // First point clicked
            setMode(prev => ({
                ...prev,
                firstPoint: point.clone()
            }));
            return null;
        }
        else {
            // Second point clicked - complete measurement
            const measurement = {
                start: mode.firstPoint,
                end: point.clone()
            };
            // Reset mode
            setMode({
                isActive: false,
                firstPoint: null,
                previewPoint: null
            });
            return measurement;
        }
    }, [mode]);
    const updatePreview = useCallback((point) => {
        if (mode.isActive && mode.firstPoint) {
            setMode(prev => ({
                ...prev,
                previewPoint: point.clone()
            }));
        }
    }, [mode.isActive, mode.firstPoint]);
    const cancelMeasurement = useCallback(() => {
        setMode({
            isActive: false,
            firstPoint: null,
            previewPoint: null
        });
    }, []);
    return {
        mode,
        startMeasurement,
        handlePointClick,
        updatePreview,
        cancelMeasurement
    };
};
