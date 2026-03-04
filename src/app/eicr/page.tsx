'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BoardAnalysis, Circuit, Observation, EICRFormData } from '@/lib/types';

export default function EICRFormPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [nextInspectionDate, setNextInspectionDate] = useState('');

  // Board analysis state
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [boardInfo, setBoardInfo] = useState<{
    manufacturer: string;
    main_switch_amps: number;
  }>({ manufacturer: '', main_switch_amps: 0 });

  // Load board analysis from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('boardAnalysis');
    if (!stored) {
      router.push('/');
      return;
    }

    try {
      const analysis: BoardAnalysis = JSON.parse(stored);
      setCircuits(analysis.circuits || []);
      setObservations(analysis.observations || []);
      setBoardInfo({
        manufacturer: analysis.manufacturer || '',
        main_switch_amps: analysis.main_switch_amps || 0,
      });

      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      setInspectionDate(today);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 5);
      setNextInspectionDate(nextYear.toISOString().split('T')[0]);

      setIsLoading(false);
    } catch {
      router.push('/');
    }
  }, [router]);

  // Calculate overall condition
  const overallCondition = observations.some(
    (obs) => obs.severity === 'C1' || obs.severity === 'C2'
  )
    ? 'Unsatisfactory'
    : 'Satisfactory';

  // Circuit handlers
  const updateCircuit = (index: number, field: keyof Circuit, value: string | number | boolean) => {
    setCircuits((prev) =>
      prev.map((circuit, i) =>
        i === index ? { ...circuit, [field]: value } : circuit
      )
    );
  };

  const addCircuit = () => {
    const newPosition = circuits.length > 0 ? Math.max(...circuits.map((c) => c.position)) + 1 : 1;
    setCircuits((prev) => [
      ...prev,
      {
        position: newPosition,
        type: 'MCB',
        rating_amps: 16,
        label: '',
        rcd_protected: false,
      },
    ]);
  };

  const removeCircuit = (index: number) => {
    setCircuits((prev) => prev.filter((_, i) => i !== index));
  };

  // Observation handlers
  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    setObservations((prev) =>
      prev.map((obs, i) =>
        i === index ? { ...obs, [field]: value } : obs
      )
    );
  };

  const addObservation = () => {
    setObservations((prev) => [
      ...prev,
      {
        code: '',
        description: '',
        severity: 'C3' as const,
      },
    ]);
  };

  const removeObservation = (index: number) => {
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  // Generate PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    const formData: EICRFormData = {
      client_name: clientName,
      client_address: clientAddress,
      installation_address: installationAddress,
      inspector_name: inspectorName,
      inspection_date: inspectionDate,
      next_inspection_date: nextInspectionDate,
      analysis: {
        manufacturer: boardInfo.manufacturer,
        main_switch_amps: boardInfo.main_switch_amps,
        rcds: [],
        circuits,
        observations,
      },
    };

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white">
            Electrical Installation Condition Report
          </h1>
          <p className="text-zinc-400 dark:text-zinc-400 text-sm mt-1">
            Review and edit the inspection details before generating the PDF
          </p>
        </div>
        <div
          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
            overallCondition === 'Satisfactory'
              ? 'bg-green-500/20 text-green-400 dark:bg-green-500/20 dark:text-green-400'
              : 'bg-red-500/20 text-red-400 dark:bg-red-500/20 dark:text-red-400'
          }`}
        >
          Overall: {overallCondition}
        </div>
      </div>

      {/* Client Details Section */}
      <section className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white dark:text-white mb-4">
          Client Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="clientName">Client Name</label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="clientAddress">Client Address</label>
            <input
              id="clientAddress"
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Enter client address"
              className="w-full"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="installationAddress">Installation Address</label>
            <input
              id="installationAddress"
              type="text"
              value={installationAddress}
              onChange={(e) => setInstallationAddress(e.target.value)}
              placeholder="Enter installation address (if different from client address)"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Electrician Details Section */}
      <section className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white dark:text-white mb-4">
          Electrician Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="inspectorName">Inspector Name</label>
            <input
              id="inspectorName"
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Enter inspector name"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="inspectionDate">Inspection Date</label>
            <input
              id="inspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nextInspectionDate">Next Inspection Date</label>
            <input
              id="nextInspectionDate"
              type="date"
              value={nextInspectionDate}
              onChange={(e) => setNextInspectionDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-zinc-800 dark:bg-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-400 dark:text-zinc-400">
            Board: {boardInfo.manufacturer} | Main Switch: {boardInfo.main_switch_amps}A
          </p>
        </div>
      </section>

      {/* Circuit Schedule Section */}
      <section className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white dark:text-white">
            Circuit Schedule
          </h2>
          <button
            onClick={addCircuit}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Circuit
          </button>
        </div>

        {/* Mobile view - cards */}
        <div className="md:hidden space-y-4">
          {circuits.map((circuit, index) => (
            <div
              key={index}
              className="bg-zinc-800 dark:bg-zinc-800 border border-zinc-700 dark:border-zinc-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">
                  Circuit {circuit.position}
                </span>
                <button
                  onClick={() => removeCircuit(index)}
                  className="text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Position</label>
                  <input
                    type="number"
                    value={circuit.position}
                    onChange={(e) => updateCircuit(index, 'position', parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label>Type</label>
                  <select
                    value={circuit.type}
                    onChange={(e) => updateCircuit(index, 'type', e.target.value)}
                    className="w-full"
                  >
                    <option value="MCB">MCB</option>
                    <option value="RCBO">RCBO</option>
                    <option value="Fuse">Fuse</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Rating (A)</label>
                  <input
                    type="number"
                    value={circuit.rating_amps}
                    onChange={(e) => updateCircuit(index, 'rating_amps', parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label>RCD Protected</label>
                  <select
                    value={circuit.rcd_protected ? 'yes' : 'no'}
                    onChange={(e) => updateCircuit(index, 'rcd_protected', e.target.value === 'yes')}
                    className="w-full"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label>Label</label>
                <input
                  type="text"
                  value={circuit.label}
                  onChange={(e) => updateCircuit(index, 'label', e.target.value)}
                  placeholder="Circuit label"
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop view - table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700 dark:border-zinc-700">
                <th className="text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 uppercase tracking-wide py-3 px-2">
                  Position
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 uppercase tracking-wide py-3 px-2">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 uppercase tracking-wide py-3 px-2">
                  Rating (A)
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 uppercase tracking-wide py-3 px-2">
                  Label
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 uppercase tracking-wide py-3 px-2">
                  RCD Protected
                </th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {circuits.map((circuit, index) => (
                <tr
                  key={index}
                  className="border-b border-zinc-800 dark:border-zinc-800"
                >
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={circuit.position}
                      onChange={(e) => updateCircuit(index, 'position', parseInt(e.target.value) || 0)}
                      className="w-16"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={circuit.type}
                      onChange={(e) => updateCircuit(index, 'type', e.target.value)}
                      className="w-24"
                    >
                      <option value="MCB">MCB</option>
                      <option value="RCBO">RCBO</option>
                      <option value="Fuse">Fuse</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={circuit.rating_amps}
                      onChange={(e) => updateCircuit(index, 'rating_amps', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={circuit.label}
                      onChange={(e) => updateCircuit(index, 'label', e.target.value)}
                      placeholder="Circuit label"
                      className="w-full min-w-[150px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={circuit.rcd_protected ? 'yes' : 'no'}
                      onChange={(e) => updateCircuit(index, 'rcd_protected', e.target.value === 'yes')}
                      className="w-20"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => removeCircuit(index)}
                      className="text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {circuits.length === 0 && (
          <p className="text-center text-zinc-500 dark:text-zinc-500 py-8">
            No circuits added. Click &quot;Add Circuit&quot; to add one.
          </p>
        )}
      </section>

      {/* Observations Section */}
      <section className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white dark:text-white">
            Observations
          </h2>
          <button
            onClick={addObservation}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Observation
          </button>
        </div>

        <div className="space-y-4">
          {observations.map((observation, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                observation.severity === 'C1'
                  ? 'border-red-500/50 bg-red-500/10 dark:border-red-500/50 dark:bg-red-500/10'
                  : observation.severity === 'C2'
                  ? 'border-orange-500/50 bg-orange-500/10 dark:border-orange-500/50 dark:bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1 sm:w-24">
                  <label>Code</label>
                  <input
                    type="text"
                    value={observation.code}
                    onChange={(e) => updateObservation(index, 'code', e.target.value)}
                    placeholder="e.g. 4.1"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label>Description</label>
                  <input
                    type="text"
                    value={observation.description}
                    onChange={(e) => updateObservation(index, 'description', e.target.value)}
                    placeholder="Enter observation description"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1 sm:w-28">
                  <label>Severity</label>
                  <select
                    value={observation.severity}
                    onChange={(e) => updateObservation(index, 'severity', e.target.value)}
                    className={`w-full ${
                      observation.severity === 'C1'
                        ? 'text-red-400'
                        : observation.severity === 'C2'
                        ? 'text-orange-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    <option value="C1" className="text-red-400">
                      C1 - Danger
                    </option>
                    <option value="C2" className="text-orange-400">
                      C2 - Potentially Dangerous
                    </option>
                    <option value="C3" className="text-yellow-400">
                      C3 - Improvement
                    </option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeObservation(index)}
                    className="text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300 text-sm px-2 py-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {observations.length === 0 && (
          <p className="text-center text-zinc-500 dark:text-zinc-500 py-8">
            No observations added. Click &quot;Add Observation&quot; to add one.
          </p>
        )}

        {/* Severity Legend */}
        <div className="mt-6 pt-4 border-t border-zinc-700 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">Severity Codes:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-red-400 dark:text-red-400">
              C1 - Danger present, risk of injury
            </span>
            <span className="text-orange-400 dark:text-orange-400">
              C2 - Potentially dangerous
            </span>
            <span className="text-yellow-400 dark:text-yellow-400">
              C3 - Improvement recommended
            </span>
          </div>
        </div>
      </section>

      {/* Download Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800 rounded-xl p-6">
        <div>
          <p className="text-white dark:text-white font-medium">Ready to generate?</p>
          <p className="text-zinc-400 dark:text-zinc-400 text-sm">
            Overall condition:{' '}
            <span
              className={
                overallCondition === 'Satisfactory'
                  ? 'text-green-400 dark:text-green-400'
                  : 'text-red-400 dark:text-red-400'
              }
            >
              {overallCondition}
            </span>
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-zinc-700 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isGeneratingPDF ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating PDF...
            </>
          ) : (
            'Download PDF'
          )}
        </button>
      </div>
    </div>
  );
}
