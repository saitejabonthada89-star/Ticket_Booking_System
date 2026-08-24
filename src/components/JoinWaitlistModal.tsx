import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Layers,
  MapPin,
  Calendar
} from 'lucide-react';
import { EventShow, User, Venue } from '../types';
import { TicketEngine } from '../services/ticketEngine';
import { AppStorage } from '../services/storage';

interface JoinWaitlistModalProps {
  event: EventShow;
  initialCategoryId?: string;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinWaitlistModal: React.FC<JoinWaitlistModalProps> = ({
  event,
  initialCategoryId,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const venues = AppStorage.getVenues();
  const venue = venues.find(v => v.id === event.venueId);
  const categories = venue?.categories || [];

  const [selectedCatId, setSelectedCatId] = useState<string>(
    initialCategoryId || categories[0]?.id || 'cat_standard'
  );
  const [userName, setUserName] = useState(currentUser.name);
  const [userEmail, setUserEmail] = useState(currentUser.email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ position: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const userForWaitlist: User = {
      ...currentUser,
      name: userName,
      email: userEmail,
    };

    const res = TicketEngine.joinWaitlist(event.id, selectedCatId, userForWaitlist);
    setIsSubmitting(false);

    if (res.success && res.position) {
      setResultMessage({ position: res.position });
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Failed to join waitlist.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Priority Waitlist Queue</h3>
              <p className="text-xs text-slate-400">Automated seat reallocation on cancellation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultMessage ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-display font-bold text-xl text-white">You're in Queue: #{resultMessage.position}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                When an attendee cancels their ticket, our system will automatically reserve the seat and send an instant notification to <strong>{userEmail}</strong> with a 10-minute claim window.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Done & View Waitlist Hub
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Event Specs */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <p className="font-bold text-white text-sm">{event.title}</p>
              <p className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{event.venueName}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Seat Tier / Category
              </label>
              <div className="space-y-2">
                {categories.map(cat => {
                  const active = selectedCatId === cat.id;
                  const price = event.categoryPricing[cat.id] ?? cat.basePrice;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        active
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="font-bold">{cat.name}</p>
                          <p className="text-[11px] text-slate-400">{cat.description}</p>
                        </div>
                      </div>
                      <span className="font-bold text-amber-300 font-mono">${price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Email for Priority Offer</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 mt-4 active:scale-98 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Join Priority Waitlist Queue</span>
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
