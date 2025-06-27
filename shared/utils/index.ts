export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const calculateDistance = (
  point1: [number, number, number],
  point2: [number, number, number]
): number => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const formatMeasurement = (value: number, unit: string = 'cm'): string => {
  return `${value.toFixed(2)} ${unit}`;
};