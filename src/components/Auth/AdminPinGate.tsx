import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldCheck, ArrowRight, Delete, RotateCcw, Eye, EyeOff, Search } from 'lucide-react';

interface AdminPinGateProps {
  onUnlock: () => void;
  onOpenGuestKiosk: () => void;
}

const REQUIRED_PIN = '0907';

export const AdminPinGate: React.FC<AdminPinGateProps> = ({ onUnlock, onOpenGuestKiosk }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus hidden input for physical keyboard entry
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPin('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleDigitInput = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(null);

    if (nextPin.length === 4) {
      validatePin(nextPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const validatePin = (inputPin: string) => {
    if (inputPin === REQUIRED_PIN) {
      setError(null);
      onUnlock();
    } else {
      setIsShaking(true);
      setError('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div
        className={`w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-transform ${
          isShaking ? 'animate-shake ring-2 ring-red-500/80' : ''
        }`}
      >
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-3.5 border border-blue-400/30">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/15 border border-blue-500/30 px-3 py-1 rounded-full mb-1.5">
            AIIMS Kalyani • Convocation Portal
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Organizer Access</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Enter the 4-digit security PIN to unlock the master seating arrangement and coordinator dashboard.
          </p>
        </div>

        {/* 4-Digit Display Indicator */}
        <div className="flex items-center justify-center gap-3.5 my-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            const isCurrent = pin.length === idx;
            return (
              <div
                key={idx}
                className={`w-14 h-16 rounded-2xl flex items-center justify-center text-2xl font-mono font-black transition-all ${
                  isFilled
                    ? 'bg-blue-600/30 border-2 border-blue-400 text-white shadow-lg shadow-blue-500/20 scale-105'
                    : isCurrent
                    ? 'bg-slate-800/80 border-2 border-blue-500 text-slate-400 ring-4 ring-blue-500/20'
                    : 'bg-slate-800/50 border border-slate-700/80 text-slate-600'
                }`}
              >
                {isFilled ? (showDigits ? pin[idx] : '•') : ''}
              </div>
            );
          })}
        </div>

        {/* Error / Feedback Message */}
        <div className="h-6 flex items-center justify-center mb-4">
          {error ? (
            <p className="text-xs font-bold text-red-400 animate-fade-in flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowDigits((prev) => !prev)}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDigits ? 'Hide Digits' : 'Show Digits'}</span>
            </button>
          )}
        </div>

        {/* Touch-Friendly Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitInput(digit)}
              className="h-13 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-lg font-bold font-mono text-slate-100 border border-slate-700/60 shadow-xs hover:border-blue-500/50 transition cursor-pointer active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            title="Clear all"
            className="h-13 rounded-2xl bg-slate-800/50 hover:bg-slate-700/70 text-xs font-bold text-slate-400 border border-slate-700/40 transition cursor-pointer flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigitInput('0')}
            className="h-13 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-lg font-bold font-mono text-slate-100 border border-slate-700/60 shadow-xs hover:border-blue-500/50 transition cursor-pointer active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            title="Backspace"
            className="h-13 rounded-2xl bg-slate-800/50 hover:bg-slate-700/70 text-slate-300 border border-slate-700/40 transition cursor-pointer flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Seat Tracker Banner (No PIN required) */}
        <div className="pt-5 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Looking for your seat as an attendee or faculty?</p>
          <button
            type="button"
            onClick={onOpenGuestKiosk}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Open Guest Seat Tracker (No PIN needed)</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-[11px] text-slate-500">
        AIIMS Kalyani Convocation Seating Management System • Protected Portal
      </footer>
    </div>
  );
};
