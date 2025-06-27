export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'CLIENT' | 'COMPANY' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  clientId: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'MEASUREMENTS_DRAWN' | 'CLIENT_INPUT_NEEDED' | 'COMPLETED' | 'CANCELLED';
  photos: Photo[];
  model3dUrl?: string;
  measurements: Measurement[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  orderId: string;
  url: string;
  name: string;
}

export interface Measurement {
  id: string;
  orderId: string;
  label: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  value?: number;
  unit: string;
  notes?: string;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}