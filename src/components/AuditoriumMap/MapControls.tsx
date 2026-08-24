import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Scan
} from 'lucide-react';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitScreen: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitScreen,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-xl">
      <button
        onClick={onZoomIn}
        title="Zoom In (+)"
        className="p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition active:scale-95"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="text-center font-mono text-[10px] font-bold text-slate-600 select-none py-0.5">
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={onZoomOut}
        title="Zoom Out (-)"
        className="p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition active:scale-95"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <div className="h-px bg-slate-200 my-0.5" />

      <button
        onClick={onFitScreen}
        title="Fit Entire Auditorium to Screen"
        className="p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition active:scale-95"
      >
        <Scan className="w-4 h-4" />
      </button>

      <button
        onClick={onResetZoom}
        title="Reset Pan & Zoom"
        className="p-2 rounded-lg text-slate-700 hover:text-amber-600 hover:bg-slate-100 transition active:scale-95"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        className="p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition active:scale-95"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
