import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  Mail, 
  MapPin, 
  Calendar, 
  Ticket, 
  Sparkles, 
  X, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Booking } from '../types';

interface BookingSuccessModalProps {
  booking: Booking;
  onClose: () => void;
  onViewEmail: () => void;
  onViewMyBookings: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  booking,
  onClose,
  onViewEmail,
  onViewMyBookings,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTicket = () => {
    const element = document.createElement('a');
    element.href = booking.qrCodeDataUrl;
    element.download = `Ticket_${booking.bookingReference}.png`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-scale-up">
        
        {/* Top Success Badge */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-lg">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-display font-black text-2xl tracking-tight">Booking Confirmed!</h3>
          <p className="text-xs text-emerald-100 mt-1">Your seats are secured & QR code ticket generated</p>
        </div>

        {/* Printable Ticket Pass Body */}
        <div id="printable-ticket" className="p-6 space-y-6">
          
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 relative overflow-hidden shadow-inner ticket-notch-left ticket-notch-right">
            
            {/* Event Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Official E-Ticket</span>
                <h4 className="font-display font-bold text-lg text-white mt-0.5">{booking.eventTitle}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{booking.venueName}</span>
                </p>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Booking Ref</span>
                <span className="font-mono font-bold text-sm text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {booking.bookingReference}
                </span>
              </div>
            </div>

            {/* Date and Seat Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Date & Time</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {new Date(booking.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-slate-400">
                  {new Date(booking.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Assigned Seats</span>
                <span className="font-mono font-bold text-amber-300 text-sm block mt-0.5">
                  {booking.seats.map(s => s.seatId).join(', ')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {booking.seats.map(s => s.categoryName).join(' • ')}
                </span>
              </div>
            </div>

            {/* High-Res QR Code Verification Frame */}
            <div className="pt-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-indigo-500/30 mb-2">
                <img
                  src={booking.qrCodeDataUrl}
                  alt="Entry QR Code"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <p className="text-[11px] font-mono text-slate-400 tracking-wider">
                SCAN AT GATE FOR DIRECT ADMISSION
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Anti-Tamper Ticket</span>
              </div>
            </div>

          </div>

          {/* Email Sent Callout Notification */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-300">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Email with QR pass sent to <strong>{booking.customerEmail}</strong></span>
            </div>
            <button
              onClick={onViewEmail}
              className="font-bold underline text-indigo-400 hover:text-white whitespace-nowrap"
            >
              View in Inbox
            </button>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ticket</span>
            </button>

            <button
              onClick={handleDownloadTicket}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save QR Image</span>
            </button>

            <button
              onClick={onViewMyBookings}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              <span>Go to My Bookings</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
