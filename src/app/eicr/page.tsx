'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BoardAnalysis, Circuit, Observation, EICRFormData, CircuitTestResults } from '@/lib/types';
import { validateAllCircuits, getValidationSummary } from '@/lib/bs7671-validation';

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-zinc-400 mb-1">{children}</label>;
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}

function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function TestInput({
  label, value, unit, onChange, placeholder, failed,
}: {
  label: string; value?: number; unit: string; onChange: (v: number | undefined) => void;
  placeholder?: string; failed?: boolean;
}) {
  return (
    <div>
      <Label>{label} ({unit})</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          value={value ?? ''}
          placeholder={placeholder ?? '—'}
          onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
          className={failed ? 'border-red-500 focus:ring-red-500' : ''}
        />
        {failed && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 text-xs">✕ FAIL</span>
        )}
      </div>
    </div>
  );
}

function CircuitTestPanel({
  circuit, index, onUpdate,
}: {
  circuit: Circuit; index: number; onUpdate: (i: number, tr: CircuitTestResults) => void;
}) {
  const [open, setOpen] = useState(false);
  const tr = circuit.test_results ?? {};
  const failures = circuit.validation_failures ?? [];
  const failedFields = new Set(failures.map(f => f.field));

  const update = (field: keyof CircuitTestResults, value: number | undefined) => {
    onUpdate(index, { ...tr, [field]: value });
  };

  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800/50">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 w-6">{circuit.position}</span>
          <span className="text-sm text-white">{circuit.label || circuit.type}</span>
          <span className="text-xs text-zinc-500">{circuit.rating_amps}A {circuit.type}</span>
          {circuit.rcd_protected && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">RCD</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {failures.length > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">
              {failures.length} FAIL{failures.length > 1 ? 'S' : ''}
            </span>
          )}
          {failures.length === 0 && Object.keys(tr).length > 0 && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">PASS</span>
          )}
          <span className="text-zinc-500 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-700 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Insulation Resistance (min 1 MΩ)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <TestInput label="L–E" unit="MΩ" value={tr.ir_live_earth}
                onChange={v => update('ir_live_earth', v)}
                failed={failedFields.has('IR (L-E)')} />
              <TestInput label="L–N" unit="MΩ" value={tr.ir_live_neutral}
                onChange={v => update('ir_live_neutral', v)}
                failed={failedFields.has('IR (L-N)')} />
              <TestInput label="N–E" unit="MΩ" value={tr.ir_neutral_earth}
                onChange={v => update('ir_neutral_earth', v)}
                failed={failedFields.has('IR (N-E)')} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Earth Fault Loop Impedance & Continuity
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TestInput label="Zs" unit="Ω" value={tr.zs}
                onChange={v => update('zs', v)}
                failed={failedFields.has('Zs')} />
              <TestInput label="R1+R2" unit="Ω" value={tr.r1_r2}
                onChange={v => update('r1_r2', v)} />
            </div>
          </div>

          {circuit.rcd_protected && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                RCD Test (max 300 ms at rated current)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <TestInput label="Trip Time" unit="ms" value={tr.rcd_trip_time}
                  onChange={v => update('rcd_trip_time', v)}
                  failed={failedFields.has('RCD Trip Time')} />
                <div>
                  <Label>Test Current (mA)</Label>
                  <Select
                    value={tr.rcd_trip_current ?? 30}
                    onChange={e => update('rcd_trip_current', parseInt(e.target.value))}
                  >
                    <option value={10}>10 mA</option>
                    <option value={30}>30 mA</option>
                    <option value={100}>100 mA</option>
                    <option value={300}>300 mA</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {failures.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-700">
              {failures.map((f, i) => (
                <div key={i} className={`text-xs rounded p-2 ${f.severity === 'C1' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                  <span className="font-semibold">{f.severity}:</span> {f.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EICRFormPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorNumber, setInspectorNumber] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [purposeOfReport, setPurposeOfReport] = useState('Periodic Inspection');

  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [boardInfo, setBoardInfo] = useState<{ manufacturer: string; main_switch_amps: number; system_type: string }>({
    manufacturer: '', main_switch_amps: 0, system_type: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('boardAnalysis');
    if (!stored) { router.push('/'); return; }
    try {
      const analysis: BoardAnalysis = JSON.parse(stored);
      setCircuits(analysis.circuits ?? []);
      setObservations(analysis.observations ?? []);
      setBoardInfo({
        manufacturer: analysis.manufacturer ?? '',
        main_switch_amps: analysis.main_switch_amps ?? 0,
        system_type: analysis.system_type ?? '',
      });
      const today = new Date().toISOString().split('T')[0];
      setInspectionDate(today);
      const next = new Date();
      next.setFullYear(next.getFullYear() + 5);
      setNextInspectionDate(next.toISOString().split('T')[0]);
      setIsLoading(false);
    } catch { router.push('/'); }
  }, [router]);

  const runValidation = useCallback((updatedCircuits: Circuit[]) => {
    const { circuits: validated, autoObservations } = validateAllCircuits(updatedCircuits);
    setCirc
