import React from 'react';
import { 
  FileText, 
  X, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Layers, 
  Clock, 
  Sparkles, 
  Database,
  Server
} from 'lucide-react';
import { SYSTEM_DESIGN_WRITEUP } from '../services/systemDesignDoc';
import { generateProjectZip } from '../services/exportZip';

interface SystemDesignModalProps {
  onClose: () => void;
}

export const SystemDesignModal: React.FC<SystemDesignModalProps> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SYSTEM_DESIGN_WRITEUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">System Design Write-Up & Architecture</h3>
              <p className="text-xs text-slate-400">Concurrency Locks, Seat Hold TTL, Waitlist Cascade & Database Schema</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            <button
              onClick={() => generateProjectZip()}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
          
          {/* Quick Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Atomic Concurrency
              </span>
              <p className="font-bold text-white text-xs">Mutex Key Lock Leases</p>
              <p className="text-[11px] text-slate-400">
                Exclusive key leases <code className="text-indigo-300">lock:event:ID:seat:ID</code> preventing 2 users from simultaneously acquiring the same seat.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Deterministic TTL
              </span>
              <p className="font-bold text-white text-xs">10-Minute Cart Release</p>
              <p className="text-[11px] text-slate-400">
                Scheduled background sweeper freeing abandoned holds with zero inventory hoarding.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                FIFO Waitlist Cascade
              </span>
              <p className="font-bold text-white text-xs">Cancellation Reallocation</p>
              <p className="text-[11px] text-slate-400">
                Automated 10-minute claim windows with failover escalation to next in queue.
              </p>
            </div>
          </div>

          {/* Formatted Markdown Output */}
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
            {SYSTEM_DESIGN_WRITEUP}
          </div>

        </div>

      </div>
    </div>
  );
};
