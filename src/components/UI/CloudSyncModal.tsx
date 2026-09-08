import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  UploadCloud, 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Wifi, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Printer 
} from 'lucide-react';
import { PlanState } from '../../state/plan';
import { publishPlanToCloud, getMobileKioskUrl } from '../../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanState;
  onPlanPublished?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  plan,
  onPlanPublished,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const mobileUrl = getMobileKioskUrl();
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(mobileUrl)}`;
  const lastPublished = localStorage.getItem('aiims_last_cloud_publish');

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    setPublishError(null);

    const res = await publishPlanToCloud(plan);
    setIsPublishing(false);

    if (res.success) {
      setPublishSuccess(true);
      if (onPlanPublished) onPlanPublished();
      setTimeout(() => setPublishSuccess(false), 4000);
    } else {
      setPublishError(res.error || 'Failed to sync to cloud. Please check internet connection.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AIIMS Kalyani Convocation - Guest Seat Finder QR Code</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px 20px; color: #0f172a; }
            .card { max-width: 500px; margin: 0 auto; border: 3px solid #0284c7; border-radius: 24px; padding: 30px; }
            h1 { font-size: 24px; font-weight: 900; margin: 0 0 4px; color: #0369a1; }
            h2 { font-size: 15px; font-weight: 700; margin: 0 0 16px; color: #475569; }
            img { width: 260px; height: 260px; margin: 16px auto; border-radius: 12px; border: 1px solid #cbd5e1; }
            .instructions { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 16px; line-height: 1.5; }
            .gate-badge { display: inline-block; background: #ecfdf5; color: #065f46; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; border: 1px solid #a7f3d0; margin-top: 12px; }
            .url { font-family: monospace; font-size: 12px; color: #64748b; margin-top: 16px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>AIIMS KALYANI</h1>
            <h2>${plan.answers.eventTitle || 'Convocation Seating Arrangement'}</h2>
            <div class="gate-badge">📍 Scan with Mobile to Find Your Seat</div>
            <br />
            <img src="${qrCodeUrl}" alt="Seat Tracker QR Code" />
            <div class="instructions">
              Point your smartphone camera at this QR code.<br/>
              Type your name or roll number to see your reserved seat, row & entry gate.
            </div>
            <div class="url">${mobileUrl}</div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Live Online Seating & Mobile Sync</h3>
              <p className="text-xs text-blue-100 font-medium">Apply seating data online so anyone can search on mobile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Status Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cloud Status: Ready</span>
              </div>
              <p className="text-xs text-slate-500">
                Current Plan: <strong className="text-slate-800">{plan.attendees.length} guests</strong> • <strong className="text-slate-800">{plan.seats.length} seats</strong>
              </p>
              {lastPublished && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Last published: {new Date(lastPublished).toLocaleTimeString()} ({new Date(lastPublished).toLocaleDateString()})
                </p>
              )}
            </div>

            {/* One-Click Publish Button */}
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : publishSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Published Online ✓</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish to Online Kiosk</span>
                </>
              )}
            </button>
          </div>

          {publishSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Live seating plan updated successfully! Anyone opening /seattracker on mobile can now find their seat.</span>
            </div>
          )}

          {publishError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-3.5 text-xs font-bold">
              {publishError}
            </div>
          )}

          {/* QR Code & Mobile Share Card */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-gradient-to-b from-white to-slate-50 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <h4 className="font-extrabold text-sm text-slate-900">Mobile Guest Access (/seattracker)</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Display or print this QR Code at <strong>Gate-1</strong> and <strong>Gate-2</strong>. Arriving attendees scan the code on their mobile cameras to immediately search their name and view their assigned seat with walking directions.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="Seat Tracker QR Code"
                className="w-36 h-36 rounded-lg border border-slate-200 shadow-xs shrink-0"
              />
              <div className="flex-1 space-y-2.5 text-xs w-full">
                <div>
                  <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                    Direct Mobile URL:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={mobileUrl}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-700 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handlePrintQr}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Print QR Flyer for Gates</span>
                  </button>

                  <a
                    href={mobileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Preview Mobile Tracker</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
