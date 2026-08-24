import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Ticket, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { WaitlistEntry, User, EventShow } from '../types';
import { AppStorage } from '../services/storage';
import { TicketEngine } from '../services/ticketEngine';

interface WaitlistHubProps {
  waitlists: WaitlistEntry[];
  currentUser: User;
  events: EventShow[];
  onClaimOffer: (entry: WaitlistEntry) => void;
  onRefresh: () => void;
}

export const WaitlistHub: React.FC<WaitlistHubProps> = ({
  waitlists,
  currentUser,
  events,
  onClaimOffer,
  onRefresh,
}) => {
  const [now, setNow] = useState(Date.now());

  // Update countdown clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      // Process auto-release and cascade check
      TicketEngine.processTTLAndAutoRelease();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter for user waitlists (or all if admin)
  const userEntries = currentUser.role === 'admin'
    ? waitlists
    : waitlists.filter(w => w.userId === currentUser.id);

  const activeOffers = userEntries.filter(w => w.status === 'offered');
  const waitingEntries = userEntries.filter(w => w.status === 'waiting');
  const pastEntries = userEntries.filter(w => w.status === 'claimed' || w.status === 'expired' || w.status === 'cancelled');

  const formatTimeLeft = (expiresAt?: number) => {
    if (!expiresAt) return '00:00';
    const diff = expiresAt - now;
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Automated Seat Reallocation Engine</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
            Priority Waitlists & Time-Limited Offers
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            When high-demand shows sell out, joining a waitlist guarantees first-in-line access. When any booking is cancelled, the system automatically assigns the seat with a 10-minute claim countdown.
          </p>
        </div>
      </div>

      {/* Active Time-Limited Offers (Action Required!) */}
      {activeOffers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <h3 className="font-display font-bold text-lg text-white">
              ⚡ Action Required: Time-Limited Seat Offers ({activeOffers.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOffers.map(offer => {
              const timeLeft = formatTimeLeft(offer.offerExpiresAt);
              const isExpired = timeLeft === 'Expired';

              return (
                <div
                  key={offer.id}
                  id={`waitlist-offer-${offer.id}`}
                  className="bg-gradient-to-br from-purple-900/40 via-slate-900 to-indigo-950/40 border-2 border-purple-500 rounded-3xl p-6 space-y-4 shadow-xl shadow-purple-950/50 animate-pulse-border"
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-purple-500/30">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                        Priority Seat Allocated
                      </span>
                      <h4 className="font-display font-bold text-lg text-white mt-1">
                        {offer.eventTitle}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Claim Window</span>
                      <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${
                        isExpired 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {timeLeft}
                      </span>
                    </div>
                  </div>

                  {/* Seat Specs */}
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Allocated Seat(s):</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {offer.offeredSeatIds?.join(', ') || 'Best Available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="font-semibold text-purple-300">{offer.categoryName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Venue:</span>
                      <span className="text-slate-200">{offer.venueName}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * If not claimed before the countdown expires, this seat will automatically cascade to the next person in line.
                  </p>

                  <button
                    id={`btn-claim-offer-${offer.id}`}
                    onClick={() => onClaimOffer(offer)}
                    disabled={isExpired}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <span>Claim & Complete Checkout Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting In Line (Queue) */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white">
          Active Waitlist Positions ({waitingEntries.length})
        </h3>

        {waitingEntries.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 text-xs text-slate-400">
            You have no active queues. When a sold-out show has openings, join its waitlist to be automatically notified!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {waitingEntries.map(entry => {
              // Calculate real-time position
              const sameQueue = waitlists
                .filter(w => w.eventId === entry.eventId && w.categoryId === entry.categoryId && w.status === 'waiting')
                .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
              const position = sameQueue.findIndex(w => w.id === entry.id) + 1;

              return (
                <div
                  key={entry.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                        {entry.categoryName}
                      </span>
                      <h4 className="font-display font-bold text-sm text-white line-clamp-1 mt-0.5">
                        {entry.eventTitle}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Queue Pos</span>
                      <span className="font-display font-black text-base text-indigo-300">
                        #{position > 0 ? position : 1}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="truncate">{entry.venueName}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Joined: {new Date(entry.joinedAt).toLocaleDateString()}</span>
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Awaiting Cancellation
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Logs */}
      {pastEntries.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="font-display font-bold text-sm text-slate-400">
            Waitlist History & Resolution
          </h4>

          <div className="space-y-2">
            {pastEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{entry.eventTitle}</span>
                  <span className="text-slate-400 ml-2">({entry.categoryName})</span>
                </div>

                <div>
                  {entry.status === 'claimed' && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                      Claimed & Booked
                    </span>
                  )}
                  {entry.status === 'expired' && (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-medium">
                      Window Lapsed • Cascaded
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
