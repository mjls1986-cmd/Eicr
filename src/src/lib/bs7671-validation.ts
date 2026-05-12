/**
 * BS 7671:2018+A2:2022 Validation Engine
 * Checks test results against IET Wiring Regulations limits
 */

import type { Circuit, ValidationFailure } from './types';

// ─── Zs limits (Ω) per BS 7671 Table 41.2 / Appendix 14 ──────────────────────
const ZS_LIMITS: Record<string, Record<number, number>> = {
  MCB_B: { 6: 7.67, 10: 4.60, 16: 2.87, 20: 2.30, 25: 1.84, 32: 1.44, 40: 1.15, 50: 0.92, 63: 0.73 },
  MCB_C: { 6: 3.84, 10: 2.30, 16: 1.44, 20: 1.15, 25: 0.92, 32: 0.72, 40: 0.57, 50: 0.46, 63: 0.36 },
  MCB_D: { 6: 1.92, 10: 1.15, 16: 0.72, 20: 0.57, 25: 0.46, 32: 0.36, 40: 0.29, 50: 0.23, 63: 0.18 },
  RCBO_B: { 6: 7.67, 10: 4.60, 16: 2.87, 20: 2.30, 25: 1.84, 32: 1.44, 40: 1.15, 50: 0.92 },
  RCBO_C: { 6: 3.84, 10: 2.30, 16: 1.44, 20: 1.15, 25: 0.92, 32: 0.72, 40: 0.57, 50: 0.46 },
  Fuse_BS88: { 6: 7.39, 10: 4.44, 16: 2.78, 20: 2.22, 25: 1.78, 32: 1.39, 40: 1.11, 50: 0.87, 63: 0.70 },
};

// RCD trip times per BS 7671 Table 3A
const RCD_MAX_TRIP_MS: Record<number, number> = {
  10: 300,
  30: 300,
  100: 300,
  300: 300,
};

// Minimum IR values per BS 7671 Table 61 (MΩ)
const IR_MIN_MOHM = 1.0;

// ─── Helper: get Zs limit ─────────────────────────────────────────────────────
function getZsLimit(circuit: Circuit): number | null {
  const type = circuit.type;
  const rating = circuit.rating_amps;

  let key = `${type}_B`;
  if (type === 'Fuse') key = 'Fuse_BS88';

  const table = ZS_LIMITS[key];
  if (!table) return null;

  const standardRatings = Object.keys(table).map(Number).sort((a, b) => a - b);
  const matchedRating = standardRatings.filter(r => r <= rating).pop();
  if (!matchedRating) return null;

  return table[matchedRating];
}

// ─── Helper: get RCD max trip time ───────────────────────────────────────────
function getRcdTripLimit(tripCurrentMa: number): number {
  const currents = Object.keys(RCD_MAX_TRIP_MS).map(Number).sort((a, b) => a - b);
  const closest = currents.reduce((prev, curr) =>
    Math.abs(curr - tripCurrentMa) < Math.abs(prev - tripCurrentMa) ? curr : prev
  );
  return RCD_MAX_TRIP_MS[closest];
}

// ─── Main validation function ─────────────────────────────────────────────────
export function validateCircuit(circuit: Circuit): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const tr = circuit.test_results;
  if (!tr) return failures;

  // 1. Insulation Resistance checks
  const irValues = [
    { val: tr.ir_live_earth, label: 'IR (L-E)' },
    { val: tr.ir_live_neutral, label: 'IR (L-N)' },
    { val: tr.ir_neutral_earth, label: 'IR (N-E)' },
  ];

  for (const { val, label } of irValues) {
    if (val !== undefined && val !== null && val < IR_MIN_MOHM) {
      failures.push({
        field: label,
        measured: val,
        limit: IR_MIN_MOHM,
        unit: 'MΩ',
        severity: val < 0.5 ? 'C1' : 'C2',
        message: `${label} of ${val} MΩ is below the 1 MΩ minimum (BS 7671 Table 61). ${val < 0.5 ? 'Danger present.' : 'Potentially dangerous.'}`,
      });
    }
  }

  // 2. Earth Fault Loop Impedance (Zs)
  if (tr.zs !== undefined && tr.zs !== null) {
    const limit = getZsLimit(circuit);
    if (limit !== null && tr.zs > limit) {
      failures.push({
        field: 'Zs',
        measured: tr.zs,
        limit,
        unit: 'Ω',
        severity: tr.zs > limit * 1.5 ? 'C1' : 'C2',
        message: `Zs of ${tr.zs} Ω exceeds the ${limit} Ω limit for a ${circuit.rating_amps}A ${circuit.type} (BS 7671 Table 41.2). Disconnection time may exceed 0.4s.`,
      });
    }
  }

  // 3. RCD trip time
  if (circuit.rcd_protected && tr.rcd_trip_time !== undefined && tr.rcd_trip_time !== null) {
    const testCurrent = tr.rcd_trip_current ?? 30;
    const limit = getRcdTripLimit(testCurrent);
    if (tr.rcd_trip_time > limit) {
      failures.push({
        field: 'RCD Trip Time',
        measured: tr.rcd_trip_time,
        limit,
        unit: 'ms',
        severity: tr.rcd_trip_time > 400 ? 'C1' : 'C2',
        message: `RCD trip time of ${tr.rcd_trip_time} ms exceeds the ${limit} ms limit at ${testCurrent} mA (BS 7671 Table 3A). RCD may not provide adequate protection.`,
      });
    }
  }

  return failures;
}

// ─── Validate all circuits ────────────────────────────────────────────────────
export function validateAllCircuits(circuits: Circuit[]): {
  circuits: Circuit[];
  autoObservations: Array<{ code: string; description: string; severity: 'C1' | 'C2' | 'C3' }>;
} {
  const autoObservations: Array<{ code: string; description: string; severity: 'C1' | 'C2' | 'C3' }> = [];

  const validatedCircuits = circuits.map(circuit => {
    const failures = validateCircuit(circuit);
    failures.forEach(f => {
      autoObservations.push({
        code: f.field === 'Zs' ? '6.1' : f.field.startsWith('IR') ? '6.2' : '6.3',
        description: `Circuit ${circuit.position} (${circuit.label || circuit.type}): ${f.message}`,
        severity: f.severity,
      });
    });
    return { ...circuit, validation_failures: failures };
  });

  return { circuits: validatedCircuits, autoObservations };
}

// ─── Summary stats ────────────────────────────────────────────────────────────
export function getValidationSummary(circuits: Circuit[]) {
  const tested = circuits.filter(c => c.test_results && Object.keys(c.test_results).length > 0);
  const failed = circuits.filter(c => c.validation_failures && c.validation_failures.length > 0);
  const c1Count = circuits.flatMap(c => c.validation_failures ?? []).filter(f => f.severity === 'C1').length;
  const c2Count = circuits.flatMap(c => c.validation_failures ?? []).filter(f => f.severity === 'C2').length;

  return {
    total: circuits.length,
    tested: tested.length,
    passed: tested.length - failed.length,
    failed: failed.length,
    c1Count,
    c2Count,
  };
}
