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
    setCircuits(validated);
    setObservations(prev => {
      const manual = prev.filter(o => !o.code.startsWith('6.'));
      return [...manual, ...autoObservations];
    });
  }, []);

  const updateCircuit = (index: number, field: keyof Circuit, value: string | number | boolean) => {
    setCircuits(prev => {
      const updated = prev.map((c, i) => i === index ? { ...c, [field]: value } : c);
      runValidation(updated);
      return updated;
    });
  };

  const updateTestResults = (index: number, tr: CircuitTestResults) => {
    setCircuits(prev => {
      const updated = prev.map((c, i) => i === index ? { ...c, test_results: tr } : c);
      runValidation(updated);
      return updated;
    });
  };

  const addCircuit = () => {
    const pos = circuits.length > 0 ? Math.max(...circuits.map(c => c.position)) + 1 : 1;
    setCircuits(prev => [...prev, { position: pos, type: 'MCB', rating_amps: 16, label: '', rcd_protected: false }]);
  };

  const removeCircuit = (index: number) => {
    setCircuits(prev => { const updated = prev.filter((_, i) => i !== index); runValidation(updated); return updated; });
  };

  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    setObservations(prev => prev.map((o, i) => i === index ? { ...o, [field]: value } : o));
  };
  const addObservation = () => setObservations(prev => [...prev, { code: '', description: '', severity: 'C3' as const }]);
  const removeObservation = (index: number) => setObservations(prev => prev.filter((_, i) => i !== index));

  const hasC1 = observations.some(o => o.severity === 'C1') || circuits.some(c => c.validation_failures?.some(f => f.severity === 'C1'));
  const hasC2 = observations.some(o => o.severity === 'C2') || circuits.some(c => c.validation_failures?.some(f => f.severity === 'C2'));
  const overallCondition = hasC1 || hasC2 ? 'Unsatisfactory' : 'Satisfactory';
  const summary = getValidationSummary(circuits);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    const formData: EICRFormData = {
      client_name: clientName,
      client_address: clientAddress,
      installation_address: installationAddress,
      inspector_name: inspectorName,
      inspector_number: inspectorNumber,
      inspection_date: inspectionDate,
      next_inspection_date: nextInspectionDate,
      purpose_of_report: purposeOfReport,
      analysis: {
        manufacturer: boardInfo.manufacturer,
        main_switch_amps: boardInfo.main_switch_amps,
        system_type: boardInfo.system_type,
        rcds: [],
        circuits,
        observations,
      },
    };
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EICR-${clientName || 'report'}-${inspectionDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-zinc-400">Loading...</div></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Electrical Installation Condition Report</h1>
          <p className="text-zinc-400 text-sm mt-1">BS 7671:2018+A2:2022 — Review, enter test results, then generate PDF</p>
        </div>
        <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${overallCondition === 'Satisfactory' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          Overall: {overallCondition}
        </div>
      </div>

      {summary.tested > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Circuits', value: summary.total, color: 'text-white' },
            { label: 'Tested', value: summary.tested, color: 'text-blue-400' },
            { label: 'Passed', value: summary.passed, color: 'text-green-400' },
            { label: 'Failed', value: summary.failed, color: summary.failed > 0 ? 'text-red-400' : 'text-zinc-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      <Section title="Client Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Client Name</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. J Smith" /></div>
          <div><Label>Client Address</Label><Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Client billing address" /></div>
          <div className="md:col-span-2"><Label>Installation Address (if different)</Label><Input value={installationAddress} onChange={e => setInstallationAddress(e.target.value)} placeholder="Leave blank if same as client address" /></div>
        </div>
      </Section>

      <Section title="Inspector Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><Label>Inspector Name</Label><Input value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="Full name" /></div>
          <div><Label>Cert / Registration No.</Label><Input value={inspectorNumber} onChange={e => setInspectorNumber(e.target.value)} placeholder="e.g. ECS12345" /></div>
          <div><Label>Inspection Date</Label><Input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} /></div>
          <div><Label>Next Inspection Date</Label><Input type="date" value={nextInspectionDate} onChange={e => setNextInspectionDate(e.target.value)} /></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Purpose of Report</Label>
            <Select value={purposeOfReport} onChange={e => setPurposeOfReport(e.target.value)}>
              <option>Periodic Inspection</option>
              <option>Change of Occupancy</option>
              <option>Change of Use</option>
              <option>Suspected Damage</option>
              <option>After Alterations</option>
              <option>Completion of New Installation</option>
            </Select>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg text-xs text-zinc-400 self-end">
            Board: <span className="text-white">{boardInfo.manufacturer || '—'}</span> &nbsp;|&nbsp;
            Main Switch: <span className="text-white">{boardInfo.main_switch_amps || '—'}A</span> &nbsp;|&nbsp;
            System: <span className="text-white">{boardInfo.system_type || '—'}</span>
          </div>
        </div>
      </Section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Circuit Schedule & Test Results</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Tap a circuit to expand and enter test results — validated against BS 7671 limits in real time</p>
          </div>
          <button onClick={addCircuit} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Add Circuit
          </button>
        </div>

        <div className="space-y-2">
          {circuits.map((circuit, index) => (
            <div key={index} className="space-y-2">
              <CircuitTestPanel circuit={circuit} index={index} onUpdate={updateTestResults} />
              <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
                <Select className="w-24 text-xs py-1" value={circuit.type} onChange={e => updateCircuit(index, 'type', e.target.value)}>
                  <option>MCB</option><option>RCBO</option><option>Fuse</option>
                </Select>
                <Input className="w-16 text-xs py-1" type="number" value={circuit.rating_amps}
                  onChange={e => updateCircuit(index, 'rating_amps', parseInt(e.target.value) || 0)} />
                <span className="text-xs text-zinc-500">A</span>
                <Input className="flex-1 min-w-[120px] text-xs py-1" type="text" value={circuit.label}
                  placeholder="Label" onChange={e => updateCircuit(index, 'label', e.target.value)} />
                <Select className="w-28 text-xs py-1" value={circuit.rcd_protected ? 'yes' : 'no'}
                  onChange={e => updateCircuit(index, 'rcd_protected', e.target.value === 'yes')}>
                  <option value="yes">RCD ✓</option><option value="no">No RCD</option>
                </Select>
                <button onClick={() => removeCircuit(index)} className="text-red-400 hover:text-red-300 text-xs px-2">Remove</button>
              </div>
            </div>
          ))}
        </div>

        {circuits.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No circuits. Click &quot;Add Circuit&quot; to add one.</p>
        )}
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Observations</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Validation failures are added automatically — add manual observations below</p>
          </div>
          <button onClick={addObservation} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Add Observation
          </button>
        </div>

        <div className="space-y-3">
          {observations.map((obs, index) => (
            <div key={index} className={`border rounded-lg p-4 ${obs.severity === 'C1' ? 'border-red-500/50 bg-red-500/10' : obs.severity === 'C2' ? 'border-orange-500/50 bg-orange-500/10' : 'border-zinc-700 bg-zinc-800'}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-20">
                  <Label>Code</Label>
                  <Input type="text" value={obs.code} onChange={e => updateObservation(index, 'code', e.target.value)} placeholder="e.g. 4.1" />
                </div>
                <div className="flex-1">
                  <Label>Description</Label>
                  <Input type="text" value={obs.description} onChange={e => updateObservation(index, 'description', e.target.value)} placeholder="Description" />
                </div>
                <div className="sm:w-32">
                  <Label>Severity</Label>
                  <Select value={obs.severity} onChange={e => updateObservation(index, 'severity', e.target.value)}>
                    <option value="C1">C1 — Danger</option>
                    <option value="C2">C2 — Potentially Dangerous</option>
                    <option value="C3">C3 — Improvement</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => removeObservation(index)} className="text-red-400 hover:text-red-300 text-sm px-2 py-2">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {observations.length === 0 && (
          <p className="text-center text-zinc-500 py-6 text-sm">No observations yet.</p>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-700 flex flex-wrap gap-4 text-xs">
          <span className="text-red-400">C1 — Danger present, immediate action required</span>
          <span className="text-orange-400">C2 — Potentially dangerous</span>
          <span className="text-yellow-400">C3 — Improvement recommended</span>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div>
          <p className="text-white font-medium">Ready to generate?</p>
          <p className="text-zinc-400 text-sm">
            Overall: <span className={overallCondition === 'Satisfactory' ? 'text-green-400' : 'text-red-400'}>{overallCondition}</span>
            {summary.tested > 0 && (
              <span className="ml-2 text-zinc-500">· {summary.tested}/{summary.total} circuits tested · {summary.failed} failed</span>
            )}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isGeneratingPDF ? (
            <><svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>Generating PDF...</>
          ) : 'Download EICR PDF'}
        </button>
      </div>
    </div>
  );
}
