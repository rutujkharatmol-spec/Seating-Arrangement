import React, { useState } from 'react';
import { CategoryInfo } from '../../types/seating';
import { COLOR_SWATCH_PRESETS } from '../../data/categories';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  RotateCcw, 
  Tag, 
  Paintbrush,
  AlertCircle
} from 'lucide-react';

interface SectionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Record<string, CategoryInfo>;
  onAddCategory: (category: CategoryInfo) => void;
  onUpdateCategory: (category: CategoryInfo) => void;
  onDeleteCategory: (categoryId: string) => void;
  onResetCategoriesToDefault: () => void;
  seatCounts: Record<string, number>;
}

export const SectionManagerModal: React.FC<SectionManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetCategoriesToDefault,
  seatCounts,
}) => {
  if (!isOpen) return null;

  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Form state for creating / editing
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#86efac');
  const [borderColor, setBorderColor] = useState('#16a34a');
  const [textColor, setTextColor] = useState('#14532d');
  const [gate, setGate] = useState('Gate-1 or Gate-2');
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);

  const startEdit = (cat: CategoryInfo) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setShortName(cat.shortName);
    setColor(cat.color);
    setBorderColor(cat.borderColor || '#334155');
    setTextColor(cat.textColor || '#0f172a');
    setGate(cat.recommendedGate || 'Gate-1 or Gate-2');
    setIsCustomFormOpen(true);
  };

  const resetForm = () => {
    setEditingCatId(null);
    setName('');
    setShortName('');
    setColor('#86efac');
    setBorderColor('#16a34a');
    setTextColor('#14532d');
    setGate('Gate-1 or Gate-2');
    setIsCustomFormOpen(false);
  };

  const handleSelectSwatch = (swatch: typeof COLOR_SWATCH_PRESETS[0]) => {
    setColor(swatch.color);
    setBorderColor(swatch.borderColor);
    setTextColor(swatch.textColor);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;

    if (editingCatId) {
      const existing = categories[editingCatId];
      if (existing) {
        onUpdateCategory({
          ...existing,
          name: name.trim(),
          shortName: shortName.trim(),
          color,
          borderColor,
          textColor,
          recommendedGate: gate,
        });
      }
    } else {
      const newId = `section_${Date.now()}_${shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      onAddCategory({
        id: newId,
        name: name.trim(),
        shortName: shortName.trim(),
        color,
        borderColor,
        textColor,
        description: `Custom Section: ${name.trim()}`,
        recommendedGate: gate,
        isCustom: true,
      });
    }

    resetForm();
  };

  const catList = Object.values(categories).filter((c) => c.id !== 'available');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-900 relative max-h-[90vh] flex flex-col">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200 shrink-0">
          <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Manage Seat Sections & Colors
            </h2>
            <p className="text-xs text-slate-500">
              Add custom seating sections, customize colors, or rename existing categories.
            </p>
          </div>
        </div>

        {/* Section List (Scrollable) */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Auditorium Sections ({catList.length})
            </span>
            {!isCustomFormOpen && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsCustomFormOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Section</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catList.map((cat) => {
              const count = seatCounts[cat.id] || 0;
              const isDefaultProtected = cat.id === 'blocked' || cat.id === 'audience';

              return (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-2xl border flex items-center justify-between gap-2 shadow-2xs transition"
                  style={{
                    backgroundColor: `${cat.color}18`,
                    borderColor: cat.borderColor,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border"
                      style={{
                        backgroundColor: cat.color,
                        borderColor: cat.borderColor,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-white/80 border border-slate-300">
                          {cat.shortName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <strong className="font-mono text-slate-800">{count}</strong> seats • {cat.recommendedGate || 'Gate 1/2'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/80 cursor-pointer"
                      title="Edit Section"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isDefaultProtected && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete section "${cat.name}"? Chairs in this section will become Audience seats.`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add / Edit Form Panel */}
        {isCustomFormOpen && (
          <form onSubmit={handleSave} className="mt-4 pt-4 border-t border-slate-200 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>{editingCatId ? 'Edit Section Details' : 'Create New Custom Section'}</span>
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PG Residents, Sponsors, Organizing Committee"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Tag / Badge *</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g. Residents, Sponsor"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-2xs"
                  required
                />
              </div>
            </div>

            {/* Color Swatch Picker */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                Pick Section Color (High Contrast Swatches):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_SWATCH_PRESETS.map((swatch) => (
                  <button
                    key={swatch.label}
                    type="button"
                    onClick={() => handleSelectSwatch(swatch)}
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      color === swatch.color ? 'ring-2 ring-slate-900 scale-110 shadow-sm' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: swatch.color,
                      borderColor: swatch.borderColor,
                    }}
                    title={swatch.label}
                  >
                    {color === swatch.color && <Check className="w-3.5 h-3.5" style={{ color: swatch.textColor }} />}
                  </button>
                ))}

                {/* Custom Color Picker Input */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded-xl shadow-2xs">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setBorderColor(e.target.value);
                      setTextColor('#0f172a');
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                  <span className="text-[10px] font-mono text-slate-600 font-bold">{color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recommended Gate</label>
                <select
                  value={gate}
                  onChange={(e) => setGate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="Gate-1">Gate-1 Entry (Right Wing)</option>
                  <option value="Gate-2">Gate-2 Entry (Left Wing)</option>
                  <option value="Gate-1 or Gate-2">Gate-1 or Gate-2</option>
                  <option value="Balcony Gate">Balcony Gate (Upper Tier)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-98 cursor-pointer"
                >
                  {editingCatId ? 'Save Section Changes' : 'Create & Add Section'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all sections and colors to official AIIMS Kalyani defaults?')) {
                onResetCategoriesToDefault();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sections to Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
