import React, { useState } from 'react';
import { QuestionnaireAnswers } from '../../types/seating';
import { validateQuestionnaire } from '../../utils/seatAlgorithms';
import { 
  Crown, 
  GraduationCap, 
  Award, 
  Users, 
  Mic, 
  Music, 
  Tv, 
  Ban, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  X,
  HelpCircle
} from 'lucide-react';
import { PRESET_TEMPLATES } from '../../data/presetTemplates';

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
    totalSeats: initialAnswers.totalSeats || 763,
  });

  const validation = validateQuestionnaire(formData, formData.totalSeats || 763);

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
      formData.numConsole +
      formData.numBlocked;

    const remainingForAudience = Math.max(0, (formData.totalSeats || 763) - currentWithoutAudience);

    setFormData((prev) => ({
      ...prev,
      numAudience: remainingForAudience,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyAnswers(formData);
  };

  const questions = [
    {
      id: 'numFaculty',
      icon: GraduationCap,
      emoji: '🎓',
      color: '#ca8a04',
      title: 'How many Faculty Members / Doctors?',
      description: 'Assistant & Associate Professors, Medical Faculty (Seated in Main Center Block Rows H–U).',
      value: formData.numFaculty,
      default: 182,
    },
    {
      id: 'numSeniorFaculty',
      icon: GraduationCap,
      emoji: '⭐',
      color: '#ea580c',
      title: 'How many Senior Faculty & Registrars?',
      description: 'Dean, Registrar, HODs & Senior Professors (Seated in Ground Floor Left Wing Rows A–H).',
      value: formData.numSeniorFaculty,
      default: 54,
    },
    {
      id: 'numVip',
      icon: Crown,
      emoji: '👑',
      color: '#16a34a',
      title: 'How many VIPs & Chief Guests?',
      description: 'Director, Chief Guests, Ministry Officials & Dignitaries (Seated in Front Center Rows A–D, 4×13=52 seats).',
      value: formData.numVip,
      default: 52,
    },
    {
      id: 'numAwardees',
      icon: Award,
      emoji: '🏆',
      color: '#c026d3',
      title: 'How many Awardees & Medalists?',
      description: 'Gold medalists, best research awardees & prize winners (Seated in Ground Floor Right Wing Rows I–O).',
      value: formData.numAwardees,
      default: 49,
    },
    {
      id: 'numReporters',
      icon: Mic,
      emoji: '🎤',
      color: '#0284c7',
      title: 'How many Press & Media Reporters?',
      description: 'Accredited media journalists & photographers (Seated in Center Block Rows E–G).',
      value: formData.numReporters,
      default: 39,
    },
    {
      id: 'numAccompanying',
      icon: Users,
      emoji: '👨‍👩‍👧',
      color: '#4f46e5',
      title: 'How many Family / Accompanying Guests?',
      description: 'Parents & family members of students/awardees (Seated in Center Rows V–W & Right Rows P–X).',
      value: formData.numAccompanying,
      default: 89,
    },
    {
      id: 'numBandParty',
      icon: Music,
      emoji: '🎵',
      color: '#d97706',
      title: 'How many Band Party & Orchestra Members?',
      description: 'Ceremonial brass band / cultural orchestra (Seated in Upper Center Balcony).',
      value: formData.numBandParty,
      default: 39,
    },
    {
      id: 'numConsole',
      icon: Tv,
      emoji: '💻',
      color: '#0891b2',
      title: 'How many AV & Technical Console Staff?',
      description: 'Audio, projection, webcast & lights team (Seated in Ground Floor Left Wing Rows I–M).',
      value: formData.numConsole,
      default: 35,
    },
    {
      id: 'numBlocked',
      icon: Ban,
      emoji: '🚫',
      color: '#e11d48',
      title: 'How many Blocked / Buffer Seats?',
      description: 'Seats kept empty for security cordon, camera cranes, or spacing (Front Right Rows A–H).',
      value: formData.numBlocked,
      default: 54,
    },
    {
      id: 'numAudience',
      icon: Users,
      emoji: '👥',
      color: '#9333ea',
      title: 'Remaining Seats for General Audience & Students:',
      description: 'Medical students, nursing trainees, hospital staff & public (Seated in Balcony & Upper Left).',
      value: formData.numAudience,
      default: 174,
    },
  ];

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-900 max-w-4xl mx-auto relative animate-fade-in">
      
      {/* Optional Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
          title="Close Wizard"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3.5 pb-5 mb-5 border-b border-slate-200">
        <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 flex-shrink-0">
          <Sparkles className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 leading-tight">
            ✨ Event Seating Auto-Calculator (Simple Wizard)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Just enter your guest numbers below. The computer will automatically calculate and place everyone into the best seats in the auditorium!
          </p>
        </div>
      </div>

      {/* Quick Event Templates Bar */}
      <div className="mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          ⚡ Or 1-Click Load Event Template:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFormData({ ...preset.answers, totalSeats: 763 })}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-amber-900 line-clamp-1">
                {preset.name.split(' - ')[0]}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {preset.answers.numVip} VIP • {preset.answers.numFaculty} Faculty
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Live Balance Status Card */}
      <div className={`mb-6 p-4 rounded-2xl border transition-all ${
        validation.isValid && validation.difference === 0
          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          : validation.difference > 0
          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
          : 'bg-rose-50/90 border-rose-300 text-rose-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {validation.isValid && validation.difference === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold text-xs">
                {validation.isValid && validation.difference === 0
                  ? '✅ Perfect! All 763 Seats are exactly balanced.'
                  : validation.difference > 0
                  ? `💡 You have ${validation.difference} empty seats remaining.`
                  : `⚠️ Over-allocated by ${Math.abs(validation.difference)} seats! Please reduce counts.`}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                Total counted: <strong>{validation.totalRequested}</strong> / {formData.totalSeats || 763} seats.
              </p>
            </div>
          </div>

          {validation.difference !== 0 && (
            <button
              type="button"
              onClick={handleAutoBalanceAudience}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Auto-Fill Empty Seats into Audience</span>
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Event Title & Dept Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Event Name:
            </label>
            <input
              type="text"
              value={formData.eventTitle}
              onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              placeholder="e.g. Annual Medical Conference 2026"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Organizing Department:
            </label>
            <input
              type="text"
              value={formData.departmentName}
              onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              placeholder="e.g. Department of Physiology"
              required
            />
          </div>
        </div>

        {/* Big Easy Question Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="text-xl flex-shrink-0 select-none">{q.emoji}</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight">
                    {q.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {q.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <span className="text-[11px] text-slate-400">
                  Default: <span className="font-mono font-bold text-slate-600">{q.default}</span>
                </span>

                {/* Big Touchable +/- Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNumberChange(q.id as any, (formData as any)[q.id] - 5)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 active:scale-90 transition cursor-pointer"
                    title="Decrease by 5"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="763"
                    value={(formData as any)[q.id]}
                    onChange={(e) => handleNumberChange(q.id as any, parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumberChange(q.id as any, (formData as any)[q.id] + 5)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 active:scale-90 transition cursor-pointer"
                    title="Increase by 5"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setFormData({ ...initialAnswers, totalSeats: 763 })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset to Blueprint Defaults</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={!validation.isValid && validation.difference < 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>🚀 Click Here to Auto-Arrange the Auditorium Plan</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
