import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Attendee, CategoryId, CategoryInfo, Seat } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import {
  parseSpreadsheetFile,
  SpreadsheetParseResult,
  downloadExcelSampleTemplate,
} from '../../utils/excelHelpers';
import { parseAttendeesCsv } from '../../utils/exportHelpers';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import {
  extractUniqueDesignations,
  assignSeatsByDesignationOrder,
  DesignationGroupInfo,
} from '../../utils/designationHierarchy';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Layers,
  Users,
  Eye,
  Trash2,
  FileText,
  Sparkles,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  Armchair,
  ArrowDownUp,
} from 'lucide-react';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAttendees: (
    attendees: Attendee[],
    replace: boolean,
    targetCategory?: string,
    autoSeat?: boolean,
    designationPriority?: string[],
    withinSort?: 'alphabetical' | 'department' | 'original',
    seatPattern?: 'sequential' | 'center_out'
  ) => void;
  currentAttendeeCount?: number;
  categories?: Record<string, CategoryInfo>;
  seats?: Seat[];
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onImportAttendees,
  currentAttendeeCount = 0,
  categories = CATEGORIES,
  seats = [],
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parsed Excel data state
  const [parseResult, setParseResult] = useState<SpreadsheetParseResult | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [previewFilter, setPreviewFilter] = useState('');

  // Manual CSV text state
  const [csvText, setCsvText] = useState('');

  // Target Category & Auto-Seat state
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [autoSeat, setAutoSeat] = useState<boolean>(true);

  // Designation Priority & Front-to-Back Seating State
  const [orderedDesignations, setOrderedDesignations] = useState<string[]>([]);
  const [withinSort, setWithinSort] = useState<'alphabetical' | 'department' | 'original'>('alphabetical');
  const [seatPattern, setSeatPattern] = useState<'sequential' | 'center_out'>('sequential');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useDismissOnEscape(isOpen, onClose);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setParseResult(null);

    try {
      const result = await parseSpreadsheetFile(file);
      if (result.allAttendees.length === 0) {
        throw new Error(
          'No valid attendee rows could be found. Please ensure the Excel or CSV file contains a column with names.'
        );
      }

      setParseResult(result);

      // Select all sheets by default
      const sheetSelection: Record<string, boolean> = {};
      result.sheets.forEach((s) => {
        sheetSelection[s.sheetName] = true;
      });
      setSelectedSheets(sheetSelection);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse spreadsheet file.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSheetSelection = (sheetName: string) => {
    setSelectedSheets((prev) => ({
      ...prev,
      [sheetName]: !prev[sheetName],
    }));
  };

  const selectAllSheets = (selected: boolean) => {
    if (!parseResult) return;
    const updated: Record<string, boolean> = {};
    parseResult.sheets.forEach((s) => {
      updated[s.sheetName] = selected;
    });
    setSelectedSheets(updated);
  };

  // Get active list of attendees based on selected sheets (memoized to prevent render loops)
  const activeAttendeesToImport = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.sheets
      .filter((s) => selectedSheets[s.sheetName])
      .flatMap((s) => s.attendees);
  }, [parseResult, selectedSheets]);

  // Detect unique designations from active attendees
  const detectedDesignationGroups = useMemo(() => {
    return extractUniqueDesignations(activeAttendeesToImport);
  }, [activeAttendeesToImport]);

  // Keep ordered designations in sync with detected groups
  useEffect(() => {
    if (detectedDesignationGroups.length > 0) {
      setOrderedDesignations(detectedDesignationGroups.map((g) => g.designation));

      // Intelligent auto-detection of Target Category
      setTargetCategory((prevCat) => {
        if (prevCat) return prevCat;
        const combined = detectedDesignationGroups.map((g) => g.designation.toLowerCase()).join(' ');
        if (combined.includes('prof') || combined.includes('faculty') || combined.includes('dean')) {
          return 'faculty';
        } else if (combined.includes('mbbs')) {
          return 'mbbs';
        } else if (combined.includes('nurs')) {
          return 'nursing';
        } else if (combined.includes('resident') || combined.includes('pg') || combined.includes('fellow')) {
          return 'pg';
        }
        return prevCat;
      });
    }
  }, [detectedDesignationGroups]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrderedDesignations((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === orderedDesignations.length - 1) return;
    setOrderedDesignations((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    setOrderedDesignations((prev) => {
      const item = prev[index];
      return [item, ...prev.filter((_, i) => i !== index)];
    });
  };

  const moveToBottom = (index: number) => {
    if (index === orderedDesignations.length - 1) return;
    setOrderedDesignations((prev) => {
      const item = prev[index];
      return [...prev.filter((_, i) => i !== index), item];
    });
  };

  const resetDesignationOrder = () => {
    setOrderedDesignations(detectedDesignationGroups.map((g) => g.designation));
  };

  // Preview allocation from front to back
  const previewAllocation = useMemo(() => {
    if (!autoSeat || activeAttendeesToImport.length === 0 || orderedDesignations.length === 0 || seats.length === 0) {
      return null;
    }
    return assignSeatsByDesignationOrder({
      attendees: activeAttendeesToImport,
      seats,
      designationPriority: orderedDesignations,
      withinSort,
      seatPattern,
      targetCategory: targetCategory || undefined,
      onlyUnseated: false,
    });
  }, [autoSeat, activeAttendeesToImport, seats, orderedDesignations, withinSort, seatPattern, targetCategory]);

  const filteredPreviewAttendees = useMemo(() => {
    if (!previewFilter.trim()) return activeAttendeesToImport;
    const q = previewFilter.toLowerCase();
    return activeAttendeesToImport.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.designation && a.designation.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q))
    );
  }, [activeAttendeesToImport, previewFilter]);

  const handleCommitFileImport = () => {
    if (activeAttendeesToImport.length === 0) {
      setError('Please select at least one sheet with attendees to import.');
      return;
    }

    onImportAttendees(
      activeAttendeesToImport,
      importMode === 'replace',
      targetCategory || undefined,
      autoSeat,
      orderedDesignations,
      withinSort,
      seatPattern
    );
    setSuccessMessage(
      `Successfully ${importMode === 'replace' ? 'replaced list with' : 'added'} ${activeAttendeesToImport.length} guests!`
    );

    setTimeout(() => {
      onClose();
      setParseResult(null);
      setSuccessMessage(null);
    }, 1200);
  };

  const handleCommitCsvPaste = () => {
    try {
      if (!csvText.trim()) {
        setError('Please enter or paste CSV content.');
        return;
      }

      const parsed = parseAttendeesCsv(csvText);
      if (parsed.length === 0) {
        setError('No valid rows found in CSV text.');
        return;
      }

      const attendees: Attendee[] = parsed.map((p, idx) => ({
        id: p.id || `att-paste-${Date.now()}-${idx + 1}`,
        name: p.name || `Guest #${idx + 1}`,
        designation: p.designation || 'Guest',
        department: p.department || '',
        institution: p.institution || 'AIIMS Kalyani',
        email: p.email || undefined,
        phone: p.phone || undefined,
        categoryId: (p.categoryId as CategoryId) || 'faculty',
        seatId: p.seatId || undefined,
        notes: p.notes || undefined,
        isVip: p.categoryId === 'vip',
      }));

      onImportAttendees(attendees, importMode === 'replace', targetCategory || undefined, autoSeat);
      setSuccessMessage(`Successfully imported ${attendees.length} guests!`);

      setTimeout(() => {
        setCsvText('');
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Error processing CSV.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/65 backdrop-blur-xs animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-900 relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Upload Excel / CSV Roster</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  .xlsx .xls .csv
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Upload student lists, convocation batches, or custom guest rosters directly.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/70 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.xlsx / .csv)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste CSV Text</span>
          </button>

          <div className="ml-auto flex items-center gap-2 pb-1.5">
            <button
              onClick={downloadExcelSampleTemplate}
              className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2.5 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2.5 font-bold animate-bounce-short">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-5">
              
              {/* Dropzone Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-slate-800">
                    Click to select or drag & drop your Excel workbook here
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Supports Microsoft Excel (<span className="font-semibold text-emerald-700">.xlsx, .xls</span>) and Comma-Separated Values (<span className="font-semibold text-emerald-700">.csv</span>)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {isLoading && (
                <div className="py-6 text-center text-slate-500 space-y-2">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full" />
                  <p className="font-bold">Reading and analyzing spreadsheet sheets...</p>
                </div>
              )}

              {/* Parsed Result Section */}
              {parseResult && (
                <div className="space-y-4 animate-fade-in border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                  
                  {/* File summary bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm">{parseResult.fileName}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({(parseResult.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px]">
                        {activeAttendeesToImport.length} Guests Selected
                      </span>
                    </div>
                  </div>

                  {/* Multi-sheet selection cards if multiple sheets exist */}
                  {parseResult.sheets.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span>Select Workbook Sheets to Include:</span>
                        </label>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => selectAllSheets(true)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => selectAllSheets(false)}
                            className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {parseResult.sheets.map((sheet) => {
                          const isSelected = Boolean(selectedSheets[sheet.sheetName]);
                          return (
                            <button
                              key={sheet.sheetName}
                              type="button"
                              onClick={() => toggleSheetSelection(sheet.sheetName)}
                              className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-2xs ring-1 ring-emerald-400'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <p className="font-bold text-xs truncate max-w-[120px]">{sheet.sheetName}</p>
                                <p className="text-[10px] text-slate-500">{sheet.totalRows} attendees</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-0.5 accent-emerald-600 cursor-pointer"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preview Table with Search */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span>Data Preview ({filteredPreviewAttendees.length} records)</span>
                      </span>

                      <input
                        type="text"
                        placeholder="Search preview..."
                        value={previewFilter}
                        onChange={(e) => setPreviewFilter(e.target.value)}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="max-h-56 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Guest Name</th>
                            <th className="py-2 px-3">Designation / Role</th>
                            <th className="py-2 px-3">Department</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3">Phone</th>
                            <th className="py-2 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredPreviewAttendees.slice(0, 100).map((a, i) => (
                            <tr key={a.id || i} className="hover:bg-slate-50 transition">
                              <td className="py-1.5 px-3 font-mono text-slate-400">{i + 1}</td>
                              <td className="py-1.5 px-3 font-bold text-slate-900">{a.name}</td>
                              <td className="py-1.5 px-3 text-slate-600">{a.designation || '-'}</td>
                              <td className="py-1.5 px-3 text-slate-600">{a.department || '-'}</td>
                              <td className="py-1.5 px-3 font-mono text-slate-500 text-[10px]">{a.email || '-'}</td>
                              <td className="py-1.5 px-3 font-mono text-slate-500 text-[10px]">{a.phone || '-'}</td>
                              <td className="py-1.5 px-3 text-slate-500 truncate max-w-[150px]">{a.notes || '-'}</td>
                            </tr>
                          ))}
                          {filteredPreviewAttendees.length > 100 && (
                            <tr>
                              <td colSpan={7} className="py-2 text-center text-slate-400 font-bold bg-slate-50">
                                ... and {filteredPreviewAttendees.length - 100} more attendees
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Seating & Import Configuration */}
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <label className="font-extrabold text-slate-800 text-xs">Target Zone:</label>
                        <select
                          value={targetCategory}
                          onChange={(e) => setTargetCategory(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 shadow-2xs"
                        >
                          <option value="">Auto-Detect from File</option>
                          {Object.values(categories).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} ({cat.id === 'faculty' ? 'Center Block Rows H–W' : cat.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 bg-white px-3.5 py-2 rounded-lg border border-slate-300 shadow-2xs hover:border-emerald-400 transition">
                        <input
                          type="checkbox"
                          checked={autoSeat}
                          onChange={(e) => setAutoSeat(e.target.checked)}
                          className="accent-emerald-600 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Armchair className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Assign Seats Front-to-Back</span>
                        </span>
                      </label>
                    </div>

                    {/* Interactive Front-to-Back Designation Ordering Card */}
                    {autoSeat && orderedDesignations.length > 0 && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-emerald-50/40 border border-indigo-200/80 shadow-2xs space-y-3.5 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-indigo-600" />
                              <span>Front-to-Back Seating Order by Designation</span>
                            </h4>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Seats are assigned strictly starting from the <strong>Front Row (closest to stage)</strong> to the <strong>Back Row</strong>. Use buttons to reorder who sits in the front.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={resetDesignationOrder}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 px-2.5 py-1 bg-indigo-100/70 rounded-lg hover:bg-indigo-200/70 transition cursor-pointer"
                            title="Reset to default academic hierarchy"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Hierarchy</span>
                          </button>
                        </div>

                        {/* Visual Front Indicator */}
                        <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-300/60 rounded-lg text-[10px] font-extrabold text-amber-900">
                          <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded font-black tracking-wider uppercase text-[9px]">
                            STAGE
                          </span>
                          <span>Rows closest to stage (e.g. Row H) fill first from top of list to bottom ⬇</span>
                        </div>

                        {/* Reorderable Designation List */}
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {orderedDesignations.map((desig, idx) => {
                            const groupInfo = detectedDesignationGroups.find((g) => g.designation === desig);
                            const count = groupInfo ? groupInfo.count : 0;
                            const isFirst = idx === 0;
                            const isLast = idx === orderedDesignations.length - 1;

                            return (
                              <div
                                key={desig}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                                  isFirst
                                    ? 'bg-white border-indigo-300 shadow-2xs ring-1 ring-indigo-200'
                                    : 'bg-white/80 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      isFirst
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                  <div className="truncate">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900 truncate">
                                        {desig}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                                        {count} {count === 1 ? 'guest' : 'guests'}
                                      </span>
                                      {isFirst && (
                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[9px] rounded uppercase tracking-wider">
                                          Front-most
                                        </span>
                                      )}
                                    </div>
                                    {groupInfo && groupInfo.sampleAttendees.length > 0 && (
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                        e.g. {groupInfo.sampleAttendees.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Reorder Controls */}
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => moveToTop(idx)}
                                    disabled={isFirst}
                                    title="Move to front row"
                                    className="p-1 rounded hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <ChevronsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveUp(idx)}
                                    disabled={isFirst}
                                    title="Move closer to front"
                                    className="p-1 rounded hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveDown(idx)}
                                    disabled={isLast}
                                    title="Move further back"
                                    className="p-1 rounded hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveToBottom(idx)}
                                    disabled={isLast}
                                    title="Move to back row"
                                    className="p-1 rounded hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <ChevronsDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Secondary Sorting & Pattern Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Sort within each designation:
                            </label>
                            <select
                              value={withinSort}
                              onChange={(e) => setWithinSort(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="alphabetical">Alphabetical by Name (A → Z)</option>
                              <option value="department">By Department, then Name</option>
                              <option value="original">Original Spreadsheet Order</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Row filling pattern:
                            </label>
                            <select
                              value={seatPattern}
                              onChange={(e) => setSeatPattern(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="sequential">Sequential Left to Right (Cols 1 → 13)</option>
                              <option value="center_out">Center-Outwards (Prime Center First)</option>
                            </select>
                          </div>
                        </div>

                        {/* Live Allocation Row Preview */}
                        {previewAllocation && previewAllocation.allocationByDesignation.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-white border border-indigo-100 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between text-indigo-950 font-bold">
                              <span>Live Row Allocation Preview:</span>
                              <span className="text-emerald-700 font-extrabold">
                                {previewAllocation.assignedCount} seats assigned front-to-back
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {previewAllocation.allocationByDesignation.map((alloc) => (
                                <span
                                  key={alloc.designation}
                                  className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-medium border border-slate-200 text-[10px]"
                                >
                                  <strong>{alloc.designation}</strong> ({alloc.count}):{' '}
                                  <span className="text-indigo-700 font-bold">
                                    Row{alloc.rows.length > 1 ? 's' : ''} {alloc.rows.join(', ')}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Import Mode Radio selection */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                      <label className="font-extrabold text-slate-800 text-xs">Import Mode:</label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-700">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-emerald-600 cursor-pointer"
                        />
                        <span>Replace existing roster ({currentAttendeeCount} guests)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-700">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-emerald-600 cursor-pointer"
                        />
                        <span>Append / add to current roster</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CSV Paste Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800">Paste CSV Content:</label>
              </div>
              <textarea
                rows={9}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Name,Designation,Department,Email,Phone,Notes\n"Dr. Samya Mitra","MD Resident","Paediatric","samyamitra120598@gmail.com","","20230311"\n"Aditi Mandal","B.Sc Nursing Graduate","Nursing","aditimandal0328@gmail.com","7584874474","20210201"`}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-slate-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-2xs"
              />

              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <label className="font-extrabold text-slate-800">Target Category:</label>
                    <select
                      value={targetCategory}
                      onChange={(e) => setTargetCategory(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="">Auto-Detect from CSV</option>
                      {Object.values(categories).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetCategory && (
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <input
                        type="checkbox"
                        checked={autoSeat}
                        onChange={(e) => setAutoSeat(e.target.checked)}
                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                      <span>Auto-Seat Guests from Front to Back</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="font-extrabold text-slate-800">Import Mode:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="pasteImportMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span>Replace existing roster</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="pasteImportMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span>Append to roster</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'upload' ? (
            <button
              type="button"
              disabled={!parseResult || activeAttendeesToImport.length === 0 || isLoading}
              onClick={handleCommitFileImport}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import {activeAttendeesToImport.length} Guests into Plan</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!csvText.trim()}
              onClick={handleCommitCsvPaste}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Process & Import CSV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
