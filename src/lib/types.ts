export interface Circuit {
  position: number;
  type: string;
  rating_amps: number;
  label: string;
  rcd_protected: boolean;
  // Test results
  test_results?: CircuitTestResults;
  // Validation failures (auto-populated)
  validation_failures?: ValidationFailure[];
}

export interface CircuitTestResults {
  // Insulation Resistance (MΩ)
  ir_live_earth?: number;
  ir_live_neutral?: number;
  ir_neutral_earth?: number;
  // Earth Fault Loop Impedance (Ω)
  zs?: number;
  // Continuity (Ω)
  r1_r2?: number;
  // RCD trip time (ms)
  rcd_trip_time?: number;
  rcd_trip_current?: number; // mA
}

export interface ValidationFailure {
  field: string;
  measured: number;
  limit: number;
  unit: string;
  severity: 'C1' | 'C2';
  message: string;
}

export interface RCD {
  position: string;
  type: string;
  rating_ma: number;
}

export interface Observation {
  code: string;
  description: string;
  severity: 'C1' | 'C2' | 'C3';
}

export interface BoardAnalysis {
  manufacturer: string;
  main_switch_amps: number;
  system_type?: string;
  rcds: RCD[];
  circuits: Circuit[];
  observations: Observation[];
}

export interface EICRFormData {
  client_name: string;
  client_address: string;
  installation_address: string;
  inspector_name: string;
  inspector_number?: string;
  inspection_date: string;
  next_inspection_date: string;
  purpose_of_report?: string;
  analysis: BoardAnalysis;
}
