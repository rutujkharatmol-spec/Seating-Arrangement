import React, { useState } from 'react';
import { QuestionnaireAnswers } from '../../types/seating';
import { validateQuestionnaire } from '../../utils/seatAlgorithms';
import { 
  Sparkles, 
  RotateCcw, 
  Sliders, 
  Building, 
  Award, 
  Users, 
  Mic, 
  Tv, 
  Music, 
  Ban, 
  GraduationCap,
  Crown
} from 'lucide-react';

interface QuestionnaireWizardProps {
  answers: QuestionnaireAnswers;
  onApplyAnswers: (answers: QuestionnaireAnswers) => void;
  onClose?: () => void;
}

export const QuestionnaireWizard: React.FC<QuestionnaireWizardProps> = ({
  answers: initialAnswers,
  onApplyAnswers,
  onClose,
}) => {
  const [formData, setFormData] = useState<QuestionnaireAnswers>({ ...initialAnswers });

  const validation = validateQuestionnaire(formData);

  const handleNumberChange = (field: keyof QuestionnaireAnswers, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setFormData((prev) => ({ ...prev, [field]: safeVal }));
  };

  const handleAutoBalanceAudience = () => {
    const otherSum =
      formData.numVip +
      formData.numSeniorFaculty +
      formData.numFaculty +
      formData.numAwardees +
      formData.numReporters +
      formData.numAccompanying +
      formData.numBandParty +
      formData.numConsole +
      formData.numBlocked;

    const remainingForAudience = Math.max(0, 750 - otherSum);
    setFormData((prev) => ({ ...prev, numAudience: remainingForAudience }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid && validation.difference < 0) {
      alert(`Cannot apply configuration: Over-allocated by ${Math.abs(validation.difference)} seats!`);
      return;
    }
    onApplyAnswers(formData);
    if (onClose) onClose();
  };

  // Questions configuration
  const questions = [
    {
      id: 'numFaculty',
      icon: GraduationCap,
      color: '#d97706',
      title: 'How many Faculty Members are attending?',
      description: 'Assistant/Associate Professors, Resident Doctors, and Teaching Staff (Placed in Center Block Rows H–U).',
      value: formData.numFaculty,
      default: 182,
    },
    {
      id: 'numSeniorFaculty',
      icon: Building,
      color: '#ea580c',
      title: 'How many Senior Faculty & Registrars?',
      description: 'Registrar, Dean, HODs and Senior Academic Professors (Placed in Left Wing Rows A–H).',
      value: formData.numSeniorFaculty,
      default: 54,
    },
    {
      id: 'numVip',
      icon: Crown,
      color: '#16a34a',
      title: 'How many VIPs & Chief Guests?',
      description: 'Director, Chief Guests, Ministry Officials, and Governing Body Members (Placed in Front Center Rows A–D, 4×13=52 seats).',
      value: formData.numVip,
      default: 52,
    },
    {
      id: 'numAwardees',
      icon: Award,
      color: '#c026d3',
      title: 'How many Awardees & Prize Recipients?',
      description: 'Gold medalists, best research awardees, and presenters (Placed in Right Wing Rows I–O).',
      value: formData.numAwardees,
      default: 49,
    },
    {
      id: 'numReporters',
      icon: Mic,
      color: '#2563eb',
      title: 'How many Press & Media Reporters?',
      description: 'Accredited journalists, press photographers & broadcasters (Placed in Center Rows E–G).',
      value: formData.numReporters,
      default: 39,
    },
    {
      id: 'numAccompanying',
      icon: Users,
      color: '#4f46e5',
      title: 'How many Accompanying Family Members?',
      description: 'Family & guests of awardees and faculty (Placed in Center Rows V–W & Right Rows P–X).',
      value: formData.numAccompanying,
      default: 89,
    },
    {
      id: 'numBandParty',
      icon: Music,
      color: '#d97706',
      title: 'How many Band Party & Orchestra Members?',
      description: 'Ceremonial brass band / cultural orchestra (Placed in Upper Center Balcony).',
      value: formData.numBandParty,
      default: 39,
    },
    {
      id: 'numConsole',
      icon: Tv,
      color: '#0891b2',
      title: 'How many Technical & AV Console Staff?',
      description: 'Audio, projection, lighting, and live webcast technicians (Placed in Left Wing Rows I–M).',
      value: formData.numConsole,
      default: 35,
    },
    {
      id: 'numBlocked',
      icon: Ban,
      color: '#e11d48',
      title: 'How many Blocked / Buffer Seats required?',
      description: 'Seats kept empty for camera cranes, security cordon, or spacing (Placed in Front Right Rows A–H).',
      value: formData.numBlocked,
      default: 54,
    },
    {
      id: 'numAudience',
      icon: Users,
      color: '#9333ea',
      title: 'Remaining Seats for General Audience & Students:',
      description: 'Medical students, nursing trainees, staff, and walk-in audience (Placed in Balcony & Left Upper Rows).',
      value: formData.numAudience,
      default: 174,
    },
  ];

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xl text-slate-900 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Seating Questionnaire & Auto-Allocation Wizard
            </h2>
            <p className="text-xs text-slate-500">
              Answer the event questions below to automatically calculate & redistribute the 750 auditorium seats.
            </p>
          </div>
        </div>

        {/* Capacity Meter */}
        <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <div className="text-right">
            <div className="text-[11px] text-slate-500 uppercase font-bold">Total Capacity</div>
            <div className="text-sm font-black font-mono text-slate-900">
              {validation.totalRequested} <span className="text-slate-400 font-normal">/ {formData.totalSeats || 763}</span>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
            style={{
              backgroundColor: validation.difference === 0 ? '#10b981' : validation.difference > 0 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
          <span className="text-slate-700">Live Allocation Progress:</span>
          <span className={validation.isValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
            {validation.message}
          </span>
        </div>

        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (validation.totalRequested / (formData.totalSeats || 763)) * 100)}%` }}
          />
          {validation.totalRequested > (formData.totalSeats || 763) && (
            <div
              className="h-full bg-rose-500 animate-pulse"
              style={{ width: `${((validation.totalRequested - (formData.totalSeats || 763)) / (formData.totalSeats || 763)) * 100}%` }}
            />
          )}
        </div>

        {validation.difference !== 0 && (
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={handleAutoBalanceAudience}
              className="text-xs text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              Auto-fill remaining {validation.difference > 0 ? validation.difference : 0} seats into General Audience
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Event Title & Dept Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Event Title:
            </label>
            <input
              type="text"
              value={formData.eventTitle}
              onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
              placeholder="e.g. Seating Arrangement (Auditorium, AIIMS Kalyani)"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Organizing Department:
            </label>
            <input
              type="text"
              value={formData.departmentName}
              onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
              placeholder="e.g. Department of Physiology"
              required
            />
          </div>
        </div>

        {/* Questionnaire Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {questions.map((q) => {
            const Icon = q.icon;
            return (
              <div
                key={q.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <div
                    className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${q.color}15`, color: q.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {q.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {q.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                  <span className="text-[11px] text-slate-400">
                    Blueprint Default: <span className="font-mono font-bold text-slate-600">{q.default}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNumberChange(q.id as any, (formData as any)[q.id] - 5)}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="763"
                      value={(formData as any)[q.id]}
                      onChange={(e) => handleNumberChange(q.id as any, parseInt(e.target.value) || 0)}
                      className="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleNumberChange(q.id as any, (formData as any)[q.id] + 5)}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 active:scale-95 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setFormData({ ...initialAnswers })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            Reset to Blueprint Defaults
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={!validation.isValid && validation.difference < 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Auto-Reallocate Seating Plan</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
