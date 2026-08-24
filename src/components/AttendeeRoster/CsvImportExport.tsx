import React, { useState } from 'react';
import { Attendee } from '../../types/seating';
import { parseAttendeesCsv } from '../../utils/exportHelpers';
import { X, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface CsvImportExportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAttendees: (attendees: Attendee[]) => void;
}

export const CsvImportExport: React.FC<CsvImportExportProps> = ({
  isOpen,
  onClose,
  onImportAttendees,
}) => {
  if (!isOpen) return null;

  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    try {
      if (!csvText.trim()) {
        setError('Please paste or upload CSV data.');
        return;
      }

      const parsed = parseAttendeesCsv(csvText);
      if (parsed.length === 0) {
        setError('No valid attendee rows detected in CSV.');
        return;
      }

      const fullAttendees: Attendee[] = parsed.map((p, idx) => ({
        id: p.id || `att-csv-${Date.now()}-${idx}`,
        name: p.name || 'Unknown Attendee',
        designation: p.designation || '',
        department: p.department || '',
        institution: p.institution || 'AIIMS Kalyani',
        email: p.email || '',
        phone: p.phone || '',
        categoryId: p.categoryId || 'faculty',
        seatId: p.seatId || undefined,
        isVip: p.categoryId === 'vip',
      }));

      onImportAttendees(fullAttendees);
      setSuccessCount(fullAttendees.length);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error parsing CSV.');
    }
  };

  const sampleCsv = `Name,Designation,Department,Institution,Category,SeatId
"Prof. Dr. Rajesh Verma","Dean Student Affairs","Dean Office","AIIMS Kalyani","vip","C-A1"
"Dr. Priyanka Das","Associate Professor","Physiology","AIIMS Kalyani","faculty","C-H1"
"Dr. Subham Roy","Gold Medalist 2026","Anatomy","AIIMS Kalyani","awardees","R-I1"
"Amit Mukherjee","Senior Correspondent","Media Bureau","PTI News","reporters","C-E1"`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_attendee_import_template.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-2xl max-w-xl w-full text-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Import Attendees (CSV)</h3>
            <p className="text-xs text-slate-500">Upload a spreadsheet or paste CSV rows below.</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Successfully imported {successCount} attendees!</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Select CSV File:</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Or Paste CSV Content:</label>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Download Sample Template
              </button>
            </div>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Name,Designation,Department,Category,SeatId\n"Dr. A. Sen","Professor","Physiology","faculty","C-H1"`}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 font-mono text-slate-900 text-[11px] focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcessImport}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm cursor-pointer transition"
            >
              Process & Import Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
