export interface Circuit {
  position: number;
  type: string;
  rating_amps: number;
  label: string;
  rcd_protected: boolean;
}

export interface RCD {
  position: string;
  type: string;
  rating_ma: number;
}

export interface Observation {
  code: string;
  description: string;
  severity: "C1" | "C2" | "C3";
}

export interface BoardAnalysis {
  manufacturer: string;
  main_switch_amps: number;
  rcds: RCD[];
  circuits: Circuit[];
  observations: Observation[];
}

export interface EICRFormData {
  // Client details
  client_name: string;
  client_address: string;
  installation_address: string;
  inspector_name: string;
  inspection_date: string;
  next_inspection_date: string;
  // Board analysis
  analysis: BoardAnalysis;
}
