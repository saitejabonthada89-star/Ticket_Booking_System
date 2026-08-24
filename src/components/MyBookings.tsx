import React, { useState } from 'react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  RefreshCw, 
  Download, 
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { Booking, User } from '../types';
import { TicketEngine } from '../services/ticketEngine';
import { AppStorage } from '../services/storage';

interface MyBookingsProps {
  bookings: Booking[];
  currentUser: User;
  onRefresh: () => void;
  onViewTicketPass: (booking: Booking) => void;
  onOpenEmailInbox: () => void;
}

export const MyBookings: React.FC<MyBookingsProps> = ({
  bookings,
  currentUser,
  onRefresh,
  onViewTicketPass,
  onOpenEmailInbox,
}) => {
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [confirmCancelModalBooking, setConfirmCancelModalBooking] = useState<Booking | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  // Filter bookings for current user (or all if admin)
  const userBookings = currentUser.role === 'admin' 
    ? bookings 
    : bookings.filter(b => b.userId === currentUser.id);

  const handleExecuteCancel = (booking: Booking) => {
    setCancellingBookingId(booking.id);
    setCancelFeedback(null);

    const result = TicketEngine.cancelBooking(booking.id, currentUser);
    setCancellingBookingId(null);
    setConfirmCancelModalBooking(null);

    if (result.success) {
      setCancelFeedback(
        result.reallocatedCount && result.reallocatedCount > 0
          ? `Booking ${booking.bookingReference} cancelled. ${result.reallocatedCount} seat(s) automatically assigned to the next candidate on the waitlist with a 10-minute offer!`
          : `Booking ${booking.bookingReference} cancelled and refunded. Seats released back to the event pool.`
      );
      onRefresh();
    } else {
      alert(result.error || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display font-bold text-2xl text-white">My Confirmed Tickets</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            View active admissions, gate QR passes, and cancellation management
          </p>
        </div>

        <button
          onClick={onOpenEmailInbox}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <span>Simulated Email Pass Inbox</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cancellation Feedback Toast */}
      {cancelFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-xl flex items-start gap-3 text-xs text-emerald-300 animate-slide-down">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-emerald-200">Waitlist Cascade Triggered</p>
            <p>{cancelFeedback}</p>
          </div>
          <button onClick={() => setCancelFeedback(null)} className="text-emerald-400 hover:text-white font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Booking Cards Grid */}
      {userBookings.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white">No Active Bookings Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You haven't reserved any show tickets yet. Browse upcoming movie screenings and concerts to select your seats!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userBookings.map(booking => {
            const isConfirmed = booking.status === 'confirmed';
            const isCancelled = booking.status === 'cancelled';
            const isUsed = booking.status === 'used';

            return (
              <div
                key={booking.id}
                id={`booking-card-${booking.id}`}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Status Bar */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      REF: {booking.bookingReference}
                    </span>

                    {isConfirmed && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Confirmed & Valid
                      </span>
                    )}

                    {isUsed && (
                      <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Admitted at Gate
                      </span>
                    )}

                    {isCancelled && (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Cancelled & Reallocated
                      </span>
                    )}
                  </div>

                  {/* Event & Seat Specs */}
                  <div className="pt-3 flex gap-4">
                    <img
                      src={booking.eventPoster}
                      alt={booking.eventTitle}
                      className="w-20 h-28 object-cover rounded-xl border border-slate-800 flex-shrink-0"
                    />

                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-display font-bold text-base text-white line-clamp-1">
                        {booking.eventTitle}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <span className="truncate">{booking.venueName}</span>
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>{new Date(booking.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </p>
                      
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Seats</span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {booking.seats.map(s => s.seatId).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Paid</span>
                    <span className="text-sm font-bold text-white">${booking.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <button
                        id={`btn-cancel-booking-${booking.id}`}
                        onClick={() => setConfirmCancelModalBooking(booking)}
                        disabled={cancellingBookingId === booking.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-colors"
                      >
                        Cancel & Release
                      </button>
                    )}

                    <button
                      id={`btn-view-pass-${booking.id}`}
                      onClick={() => onViewTicketPass(booking)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View QR Pass</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      {confirmCancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-display font-bold text-lg text-white">Cancel Booking & Trigger Waitlist?</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Cancelling this booking (Ref: <strong>{confirmCancelModalBooking.bookingReference}</strong>) will initiate an immediate 100% refund of <strong>${confirmCancelModalBooking.totalAmount.toFixed(2)}</strong>.
              </p>
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                ⚡ <strong>Automated Waitlist Reallocation:</strong> Seat(s) <strong>{confirmCancelModalBooking.seats.map(s => s.seatId).join(', ')}</strong> will immediately be offered to the next waitlisted customer with a 10-minute claim timer.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Keep Booking
              </button>
              <button
                id="btn-confirm-cancel-execute"
                onClick={() => handleExecuteCancel(confirmCancelModalBooking)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30"
              >
                Confirm Cancellation & Reallocate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
