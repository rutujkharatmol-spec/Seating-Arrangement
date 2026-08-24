import React, { useState } from 'react';
import { Volunteer } from '../../types/seating';
import { Shield, Trash2, Edit2, MapPin } from 'lucide-react';

interface VolunteerEditorProps {
  volunteers: Volunteer[];
  onAddVolunteer: (vol: Volunteer) => void;
  onUpdateVolunteer: (vol: Volunteer) => void;
  onDeleteVolunteer: (id: string) => void;
}

export const VolunteerEditor: React.FC<VolunteerEditorProps> = ({
  volunteers,
  onAddVolunteer,
  onUpdateVolunteer,
  onDeleteVolunteer,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [gate, setGate] = useState('Gate-1');

  const startEdit = (vol: Volunteer) => {
    setEditingId(vol.id);
    setName(vol.name);
    setRole(vol.role);
    setLocation(vol.location);
    setPhone(vol.phone || '');
    setGate(vol.gate || 'Gate-1');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    if (editingId) {
      const existing = volunteers.find((v) => v.id === editingId);
      if (existing) {
        onUpdateVolunteer({
          ...existing,
          name: name.trim(),
          role: role.trim(),
          location: location.trim(),
          phone: phone.trim(),
          gate,
        });
      }
      setEditingId(null);
    } else {
      onAddVolunteer({
        id: `vol-${Date.now()}`,
        name: name.trim(),
        role: role.trim(),
        location: location.trim() || 'Auditorium Aisle',
        phone: phone.trim(),
        gate,
        x: 500,
        y: 500,
      });
    }

    setName('');
    setRole('');
    setLocation('');
    setPhone('');
  };

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xl text-slate-900 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>Volunteer & Usher Checkpoints ({volunteers.length})</span>
        </div>
      </div>

      {/* Volunteer List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
        {volunteers.map((vol) => (
          <div
            key={vol.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">{vol.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {vol.gate || 'General'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{vol.role}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {vol.location} {vol.phone && `• ${vol.phone}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startEdit(vol)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteVolunteer(vol.id)}
                className="p-1 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSave} className="pt-3 border-t border-slate-200 space-y-2.5">
        <div className="text-xs font-bold text-slate-800">
          {editingId ? 'Edit Volunteer Station' : 'Add New Volunteer Station'}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Volunteer Name"
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
            required
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role / Assignment"
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Station Location"
            className="col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
          />
          <select
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-xs"
          >
            <option value="Gate-1">Gate-1</option>
            <option value="Gate-2">Gate-2</option>
            <option value="Balcony Gate">Balcony</option>
            <option value="Stage/VIP">Stage</option>
          </select>
        </div>

        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number (e.g. +91 98300 00000)"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
        />

        <button
          type="submit"
          className="w-full py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
        >
          {editingId ? 'Update Volunteer' : 'Add Volunteer'}
        </button>
      </form>
    </div>
  );
};
