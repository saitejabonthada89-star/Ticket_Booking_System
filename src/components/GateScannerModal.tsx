import React, { useState } from 'react';
import { 
  ScanLine, 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Ticket, 
  MapPin, 
  Calendar, 
  Search, 
  ShieldCheck, 
  Sparkles,
  Camera
} from 'lucide-react';
import { Booking } from '../types';
import { TicketEngine } from '../services/ticketEngine';
import { AppStorage } from '../services/storage';

interface GateScannerModalProps {
  onClose: () => void;
  recentBookings: Booking[];
  onTicketValidated: () => void;
}

export const GateScannerModal: React.FC<GateScannerModalProps> = ({
  onClose,
  recentBookings,
  onTicketValidated,
}) => {
  const [scanQuery, setScanQuery] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    status: 'valid' | 'already_used' | 'cancelled' | 'not_found';
    booking?: Booking;
    message: string;
  } | null>(null);

  const handleExecuteValidation = (queryToValidate: string) => {
    if (!queryToValidate.trim()) return;
    const result = TicketEngine.validateTicketPass(queryToValidate);
    setValidationResult(result);
    onTicketValidated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-scale-up">
        
        {/* Header */}
        <div className="bg-emerald-950/80 border-b border-slate-800 p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Gate QR Ticket Scanner</h3>
              <p className="text-xs text-emerald-300">Venue Entry Verification & Check-In</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Visual Scanner HUD Frame */}
          <div className="relative aspect-[16/9] bg-slate-950 rounded-2xl border-2 border-dashed border-emerald-500/40 flex flex-col items-center justify-center overflow-hidden shadow-inner p-4">
            
            {/* Animated Laser line */}
            <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse" />

            <div className="w-28 h-28 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center relative bg-emerald-500/5">
              <Camera className="w-10 h-10 text-emerald-400/50" />
              <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
            </div>

            <p className="text-xs text-slate-400 mt-3 text-center">
              Scan optical ticket QR code or enter booking reference below
            </p>
          </div>

          {/* Manual Input / Query Form */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Booking Reference or Encoded QR Payload
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. OMNI-8291-TX"
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteValidation(scanQuery)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                id="btn-validate-pass"
                onClick={() => handleExecuteValidation(scanQuery)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 whitespace-nowrap active:scale-95"
              >
                Verify Pass
              </button>
            </div>
          </div>

          {/* Validation Result Display */}
          {validationResult && (
            <div className={`p-4 rounded-2xl border space-y-3 animate-slide-down ${
              validationResult.status === 'valid'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : validationResult.status === 'already_used'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                {validationResult.status === 'valid' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                ) : validationResult.status === 'already_used' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                )}

                <div>
                  <h4 className="font-display font-bold text-sm text-white">
                    {validationResult.status === 'valid' && 'ACCESS GRANTED • ADMIT ATTENDEE'}
                    {validationResult.status === 'already_used' && 'ACCESS DENIED • DUPLICATE ENTRY'}
                    {validationResult.status === 'cancelled' && 'ACCESS DENIED • TICKET CANCELLED'}
                    {validationResult.status === 'not_found' && 'ACCESS DENIED • INVALID TICKET'}
                  </h4>
                  <p className="text-xs mt-0.5">{validationResult.message}</p>
                </div>
              </div>

              {validationResult.booking && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1 font-sans">
                  <p><strong>Event:</strong> {validationResult.booking.eventTitle}</p>
                  <p><strong>Attendee:</strong> {validationResult.booking.customerName}</p>
                  <p><strong>Seats:</strong> <span className="text-amber-300 font-mono font-bold">{validationResult.booking.seats.map(s => s.seatId).join(', ')}</span></p>
                </div>
              )}
            </div>
          )}

          {/* Quick Test Presets from Bookings */}
          {recentBookings.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold block">Quick Test Passes from Recent Bookings:</span>
              <div className="flex flex-wrap gap-2">
                {recentBookings.slice(0, 4).map(bk => (
                  <button
                    key={bk.id}
                    onClick={() => {
                      setScanQuery(bk.bookingReference);
                      handleExecuteValidation(bk.bookingReference);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
                  >
                    {bk.bookingReference} ({bk.status})
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
