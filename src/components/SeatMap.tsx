import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Info, 
  ShieldCheck, 
  AlertTriangle, 
  Accessibility, 
  Check, 
  Flame, 
  Users,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { EventShow, Seat, User, Venue, SeatHold } from '../types';
import { TicketEngine } from '../services/ticketEngine';
import { AppStorage } from '../services/storage';

interface SeatMapProps {
  event: EventShow;
  venue: Venue;
  currentUser: User;
  onBack: () => void;
  onProceedToCheckout: (hold: SeatHold) => void;
  onOpenWaitlistModal: (event: EventShow, categoryId?: string) => void;
  currentActiveHold: SeatHold | null;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  event,
  venue,
  currentUser,
  onBack,
  onProceedToCheckout,
  onOpenWaitlistModal,
  currentActiveHold,
}) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(
    currentActiveHold && currentActiveHold.eventId === event.id ? currentActiveHold.seatIds : []
  );
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group seats by row
  const rowsMap = useMemo(() => {
    const map: Record<string, Seat[]> = {};
    (Object.values(event.seats) as Seat[]).forEach(seat => {
      if (!map[seat.row]) {
        map[seat.row] = [];
      }
      map[seat.row].push(seat);
    });

    // Sort rows alphabetically and seats within rows by col
    const sortedKeys = Object.keys(map).sort();
    sortedKeys.forEach(row => {
      map[row].sort((a, b) => a.col - b.col);
    });

    return { rows: sortedKeys, map };
  }, [event.seats]);

  // Handle seat click
  const handleToggleSeat = (seat: Seat) => {
    setErrorMessage(null);

    // If seat is booked, ignore
    if (seat.status === 'booked') return;

    // If held by someone else, ignore
    if (seat.status === 'held' && seat.heldByUserId !== currentUser.id && seat.heldUntil && seat.heldUntil > Date.now()) {
      return;
    }

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(prev => prev.filter(id => id !== seat.id));
    } else {
      // Max 8 seats per booking
      if (selectedSeatIds.length >= 8) {
        setErrorMessage('You can select a maximum of 8 seats per transaction.');
        return;
      }
      setSelectedSeatIds(prev => [...prev, seat.id]);
    }
  };

  // Quick auto selector for best available seats
  const handleAutoSelect = (count: number, catId?: string) => {
    setErrorMessage(null);
    const availableSeats: Seat[] = [];

    rowsMap.rows.forEach(rowKey => {
      rowsMap.map[rowKey].forEach(seat => {
        if (seat.status === 'available') {
          if (!catId || seat.categoryId === catId) {
            availableSeats.push(seat);
          }
        }
      });
    });

    if (availableSeats.length < count) {
      setErrorMessage(`Only ${availableSeats.length} seat(s) available in this category.`);
      return;
    }

    const picked = availableSeats.slice(0, count).map(s => s.id);
    setSelectedSeatIds(picked);
  };

  // Calculate pricing breakdown
  const selectedSeatsList = useMemo(() => {
    return selectedSeatIds.map(id => event.seats[id]).filter(Boolean);
  }, [selectedSeatIds, event.seats]);

  const subtotal = useMemo(() => {
    return selectedSeatsList.reduce((sum, seat) => sum + seat.price, 0);
  }, [selectedSeatsList]);

  // Request atomic hold with TTL
  const handleHoldAndProceed = async () => {
    if (selectedSeatIds.length === 0) return;
    setIsHolding(true);
    setErrorMessage(null);

    try {
      const result = await TicketEngine.holdSeats(event.id, selectedSeatIds, currentUser);

      if (result.success && result.hold) {
        onProceedToCheckout(result.hold);
      } else {
        setErrorMessage(result.error || 'Failed to hold selected seats due to high contention.');
        // Refresh local view
        if (result.conflictingSeats) {
          setSelectedSeatIds(prev => prev.filter(id => !result.conflictingSeats?.includes(id)));
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during seat hold.');
    } finally {
      setIsHolding(false);
    }
  };

  // Category counts and availability
  const categoryStats = useMemo(() => {
    const seatsList = Object.values(event.seats) as Seat[];
    return venue.categories.map(cat => {
      const allInCat = seatsList.filter(s => s.categoryId === cat.id);
      const availableInCat = allInCat.filter(s => s.status === 'available');
      const price = event.categoryPricing[cat.id] ?? cat.basePrice;
      return {
        ...cat,
        price,
        total: allInCat.length,
        available: availableInCat.length,
        isSoldOut: availableInCat.length === 0,
      };
    });
  }, [venue.categories, event.seats, event.categoryPricing]);

  return (
    <div className="space-y-6 pb-28">
      
      {/* Top Header Navigation */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {event.type}
              </span>
              <span className="text-xs text-slate-400">
                {venue.name}
              </span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
              {event.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Hold TTL: <strong>10 Mins</strong></span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Collision Lock</span>
          </div>
        </div>
      </div>

      {/* Error / Collision Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/40 p-4 rounded-xl flex items-start gap-3 text-xs text-rose-300 animate-shake">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-200">Seat Collision or Selection Error</p>
            <p>{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Category Filter & Quick Auto Selection Pills */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Tier Category Legends */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategoryId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterCategoryId === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            All Tiers
          </button>

          {categoryStats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                filterCategoryId === cat.id
                  ? 'bg-slate-800 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.name} (${cat.price})</span>
              {cat.isSoldOut ? (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                  Sold Out
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  {cat.available} left
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick Pick Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Quick Pick:</span>
          {[1, 2, 4].map(num => (
            <button
              key={num}
              onClick={() => handleAutoSelect(num, filterCategoryId === 'all' ? undefined : filterCategoryId)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-colors"
            >
              {num} {num === 1 ? 'Seat' : 'Seats'}
            </button>
          ))}
        </div>

      </div>

      {/* Main Interactive Seat Visual Map Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-x-auto">
        
        {/* Cinema Screen or Concert Stage Header */}
        <div className="max-w-2xl mx-auto mb-12 text-center">
          <div className="h-3 w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-80 screen-curve shadow-[0_10px_25px_rgba(99,102,241,0.5)]" />
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
              {venue.type === 'cinema' ? 'IMAX 70mm Laser Curved Screen' : 'Main Stage / Acoustic Focal Point'}
            </span>
          </div>
        </div>

        {/* Seat Grid Layout */}
        <div className="min-w-[640px] flex flex-col items-center gap-3">
          {rowsMap.rows.map(rowKey => {
            const seatsInRow = rowsMap.map[rowKey];

            return (
              <div key={rowKey} className="flex items-center gap-2 sm:gap-3">
                
                {/* Row Label (Left) */}
                <span className="w-5 text-xs font-mono font-bold text-slate-500 text-center">
                  {rowKey}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {seatsInRow.map((seat, idx) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isHeldByMe = seat.status === 'held' && seat.heldByUserId === currentUser.id;
                    const isHeldByOther = seat.status === 'held' && seat.heldByUserId !== currentUser.id;
                    const isBooked = seat.status === 'booked' || seat.status === 'blocked';
                    const isFilteredOut = filterCategoryId !== 'all' && seat.categoryId !== filterCategoryId;

                    // Color assignment based on category
                    const cat = venue.categories.find(c => c.id === seat.categoryId);
                    const catColor = cat?.color || '#3b82f6';

                    let seatButtonClass = 'cursor-pointer transition-all duration-200 transform hover:scale-110 active:scale-95';
                    let bgStyle: React.CSSProperties = {};

                    if (isBooked) {
                      seatButtonClass = 'bg-slate-800/60 border border-slate-700/50 text-slate-600 cursor-not-allowed opacity-40';
                    } else if (isHeldByOther) {
                      seatButtonClass = 'bg-amber-500/20 border border-amber-500 text-amber-300 cursor-not-allowed animate-pulse';
                    } else if (isSelected || isHeldByMe) {
                      seatButtonClass = 'bg-indigo-600 text-white font-bold border-2 border-white shadow-lg shadow-indigo-500/50 scale-105';
                    } else {
                      // Available
                      bgStyle = {
                        backgroundColor: `${catColor}15`,
                        borderColor: `${catColor}60`,
                        color: '#f8fafc',
                      };
                      seatButtonClass += ' hover:border-white border';
                    }

                    if (isFilteredOut && !isSelected) {
                      seatButtonClass += ' opacity-20';
                    }

                    return (
                      <React.Fragment key={seat.id}>
                        {/* Aisle gap separator */}
                        {venue.seatLayout.find(s => s.id === seat.id)?.isAisle && idx > 0 && (
                          <div className="w-6 sm:w-8" />
                        )}

                        <button
                          id={`seat-btn-${seat.id}`}
                          onClick={() => handleToggleSeat(seat)}
                          disabled={isBooked || isHeldByOther}
                          style={bgStyle}
                          title={`${seat.id} • ${seat.categoryName} • $${seat.price} (${seat.status})`}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold select-none ${seatButtonClass}`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : isHeldByOther ? (
                            <Clock className="w-3 h-3 text-amber-400" />
                          ) : seat.isAccessible ? (
                            <Accessibility className="w-3 h-3 text-sky-300" />
                          ) : (
                            seat.col
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Row Label (Right) */}
                <span className="w-5 text-xs font-mono font-bold text-slate-500 text-center">
                  {rowKey}
                </span>

              </div>
            );
          })}
        </div>

        {/* Legend Status Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-400/60" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 border-2 border-white flex items-center justify-center text-white">
              <Check className="w-3 h-3" />
            </div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-300">
              <Clock className="w-3 h-3" />
            </div>
            <span>Held (Auto-releases on TTL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-800/60 border border-slate-700/50 opacity-40" />
            <span>Booked / Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-sky-500/20 border border-sky-400/50 flex items-center justify-center">
              <Accessibility className="w-3 h-3 text-sky-300" />
            </div>
            <span>Accessible Seating</span>
          </div>
        </div>

      </div>

      {/* Sold Out Category Waitlist Callout */}
      {categoryStats.some(c => c.isSoldOut) && (
        <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display font-bold text-white text-sm">
                Specific Seat Tier Sold Out? Join the Priority Waitlist
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                When any customer cancels their booking, our automated engine instantly assigns the freed seat to the next person in line with a 10-minute offer window.
              </p>
            </div>
          </div>
          <button
            id="btn-open-waitlist-modal"
            onClick={() => onOpenWaitlistModal(event)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 whitespace-nowrap active:scale-95"
          >
            Join Priority Waitlist
          </button>
        </div>
      )}

      {/* Floating Bottom Selection Checkout Tray */}
      {selectedSeatIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-30 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/80 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Selected Seats summary */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'} Selected
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs font-mono font-bold text-white">
                  {selectedSeatIds.join(', ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clicking Proceed locks these seats under an atomic 10-minute hold
              </p>
            </div>

            {/* Price & Checkout Action */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase block">Subtotal</span>
                <span className="font-display font-black text-xl text-white">${subtotal.toFixed(2)}</span>
              </div>

              <button
                id="btn-hold-and-proceed"
                onClick={handleHoldAndProceed}
                disabled={isHolding}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/40 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isHolding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Acquiring Lock...</span>
                  </>
                ) : (
                  <>
                    <span>Lock & Checkout</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
