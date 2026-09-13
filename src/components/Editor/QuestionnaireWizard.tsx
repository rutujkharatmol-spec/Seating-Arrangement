import React, { useState } from 'react';
import { QuestionnaireAnswers } from '../../types/seating';
import { validateQuestionnaire } from '../../utils/seatAlgorithms';
import { 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  X
} from 'lucide-react';
import { PRESET_TEMPLATES } from '../../data/presetTemplates';
import { CATEGORIES } from '../../data/categories';

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
  const [formData, setFormData] = useState<QuestionnaireAnswers>({
    ...initialAnswers,
    totalSeats: initialAnswers.totalSeats || 750,
  });

  const validation = validateQuestionnaire(formData, formData.totalSeats || 750);

  const handleNumberChange = (key: keyof QuestionnaireAnswers, val: number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleAutoBalanceAudience = () => {
    const currentWithoutAudience =
      formData.numVip +
      formData.numSeniorFaculty +
      formData.numFaculty +
      formData.numAwardees +
      formData.numReporters +
      formData.numAccompanying +
      formData.numBandParty +
      formData.numBlocked;

    const remainingForAudience = Math.max(0, (formData.totalSeats || 750) - currentWithoutAudience);

    setFormData((prev) => ({
      ...prev,
      numAudience: remainingForAudience,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyAnswers(formData);
  };

  const categories = [
    {
      id: 'numVip',
      name: 'VIP',
      emoji: '👑',
      color: '#86efac',
      textColor: '#14532d',
      borderColor: '#22c55e',
      value: formData.numVip,
      default: 52,
    },
    {
      id: 'numFaculty',
      name: 'Faculty',
      emoji: '🎓',
      color: '#fef08a',
      textColor: '#713f12',
      borderColor: '#eab308',
      value: formData.numFaculty,
      default: 182,
    },
    {
      id: 'numSeniorFaculty',
      name: 'Senior Faculty',
      emoji: '⭐',
      color: '#fed7aa',
      textColor: '#7c2d12',
      borderColor: '#f97316',
      value: formData.numSeniorFaculty,
      default: 54,
    },
    {
      id: 'numAwardees',
      name: 'Awardees',
      emoji: '🏆',
      color: '#f5d0fe',
      textColor: '#701a75',
      borderColor: '#d946ef',
      value: formData.numAwardees,
      default: 49,
    },
    {
      id: 'numReporters',
      name: 'Reporter',
      emoji: '🎤',
      color: '#bae6fd',
      textColor: '#0c4a6e',
      borderColor: '#0284c7',
      value: formData.numReporters,
      default: 39,
    },
    {
      id: 'numAccompanying',
      name: 'Accompanying',
      emoji: '👨‍👩‍👧',
      color: '#bfdbfe',
      textColor: '#1e3a8a',
      borderColor: '#3b82f6',
      value: formData.numAccompanying,
      default: 89,
    },
    {
      id: 'numBandParty',
      name: 'Band Party',
      emoji: '🎵',
      color: '#fef08a',
      textColor: '#854d0e',
      borderColor: '#ca8a04',
      value: formData.numBandParty,
      default: 39,
    },
    {
      id: 'numAudience',
      name: 'Audience',
      emoji: '👥',
      color: '#e9d5ff',
      textColor: '#581c87',
      borderColor: '#a855f7',
      value: formData.numAudience,
      default: 174,
    },
    {
      id: 'numBlocked',
      name: 'Blocked',
      emoji: '🚫',
      color: '#fecdd3',
      textColor: '#881337',
      borderColor: '#f43f5e',
      value: formData.numBlocked,
      default: 54,
    },
  ];

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-900 max-w-4xl mx-auto relative animate-fade-in">
      
      {/* Optional Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Seat Counts & Auto-Arrangement
            </h2>
            <p className="text-xs text-slate-500">
              Set seat counts for each group. The system arranges the auditorium automatically.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="hidden sm:flex items-center gap-1">
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFormData({ ...preset.answers, totalSeats: preset.answers.totalSeats || 750 })}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 text-[11px] font-bold text-slate-600 transition cursor-pointer"
            >
              {preset.name.split(' - ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Live Status Bar */}
      <div className={`mb-4 p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
        validation.isValid && validation.difference === 0
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : validation.difference > 0
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-rose-50 border-rose-300 text-rose-950'
      }`}>
        <div className="flex items-center gap-2">
          {validation.isValid && validation.difference === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          )}
          <span className="font-bold">
            Total: {validation.totalRequested} / {formData.totalSeats || 750} Seats
            {validation.difference === 0 && ' (Balanced ✓)'}
            {validation.difference > 0 && ` (${validation.difference} seats remaining)`}
            {validation.difference < 0 && ` (${Math.abs(validation.difference)} seats over capacity!)`}
          </span>
        </div>

        {validation.difference !== 0 && (
          <button
            type="button"
            onClick={handleAutoBalanceAudience}
            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>Balance with Audience</span>
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Event Name & Dept */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-0.5">Event Name:</label>
            <input
              type="text"
              value={formData.eventTitle}
              onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              placeholder="e.g. Seating Arrangement (Auditorium, AIIMS Kalyani)"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-0.5">Department:</label>
            <input
              type="text"
              value={formData.departmentName}
              onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              placeholder="e.g. Department of Physiology"
              required
            />
          </div>
        </div>

        {/* Compact Category Grid with Short Names */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-slate-300 transition shadow-2xs flex flex-col justify-between"
            >
              {/* Short Label */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base select-none">{cat.emoji}</span>
                  <span className="font-extrabold text-xs text-slate-900 truncate">
                    {cat.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {cat.default}
                </span>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleNumberChange(cat.id as any, (formData as any)[cat.id] - 5)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center border border-slate-200 active:scale-90 transition cursor-pointer shadow-2xs"
                  title="Decrease"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="750"
                  value={(formData as any)[cat.id]}
                  onChange={(e) => handleNumberChange(cat.id as any, parseInt(e.target.value) || 0)}
                  className="w-12 bg-transparent text-center text-xs font-mono font-black text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleNumberChange(cat.id as any, (formData as any)[cat.id] + 5)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center border border-slate-200 active:scale-90 transition cursor-pointer shadow-2xs"
                  title="Increase"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setFormData({ ...initialAnswers, totalSeats: 750 })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Defaults</span>
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Auto-Arrange Seats</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
