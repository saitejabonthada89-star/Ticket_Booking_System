import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Ticket, 
  Lock,
  ArrowRight,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { SeatHold, User, Booking, EventShow } from '../types';
import { TicketEngine } from '../services/ticketEngine';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  hold: SeatHold;
  event: EventShow;
  currentUser: User;
  onClose: () => void;
  onAbandonHold: (holdId: string) => void;
  onBookingSuccess: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  hold,
  event,
  currentUser,
  onClose,
  onAbandonHold,
  onBookingSuccess,
}) => {
  const [customerName, setCustomerName] = useState(currentUser.name);
  const [customerEmail, setCustomerEmail] = useState(currentUser.email);
  const [customerPhone, setCustomerPhone] = useState('+1 (555) 234-5678');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'upi'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
  const [isExpired, setIsExpired] = useState(false);

  // Live TTL countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = hold.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeRemaining('00:00');
        setIsExpired(true);
        setErrorMessage('Your 10-minute hold has expired and seats were released.');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeRemaining(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [hold.expiresAt]);

  const subtotal = hold.totalAmount;
  const convenienceFee = Math.round(subtotal * 0.08 * 100) / 100;
  const grandTotal = Math.round((subtotal + convenienceFee) * 100) / 100;

  const handlePayAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Please fill in your name and email address.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Simulate fast payment authorization
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = await TicketEngine.confirmBooking(hold.eventId, hold.seatIds, currentUser, {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });

      if (result.success && result.booking) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        onBookingSuccess(result.booking);
      } else {
        setErrorMessage(result.error || 'Failed to finalize booking.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAbandon = () => {
    onAbandonHold(hold.holdId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Top Header with Live TTL Countdown Warning */}
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Express Checkout</h3>
              <p className="text-xs text-slate-400">Atomic hold lock secured</p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${
            isExpired 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
          }`}>
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{isExpired ? 'EXPIRED' : `${timeRemaining} Remaining`}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-4 flex items-center gap-3 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handlePayAndConfirm} className="p-6 space-y-6">
          
          {/* Order Summary Box */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-display font-bold text-white text-base">{event.title}</h4>
                <p className="text-xs text-slate-400">{event.venueName}</p>
                <p className="text-xs text-indigo-400 font-medium mt-1">
                  📅 {new Date(event.dateTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-lg font-mono font-bold border border-slate-700">
                {hold.seatIds.length} {hold.seatIds.length === 1 ? 'Seat' : 'Seats'}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Locked Seats:</span>
              <span className="font-mono font-bold text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                {hold.seatIds.join(', ')}
              </span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Ticket Recipient & Delivery
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Email (QR Ticket Sent Here)</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Payment Method
            </h5>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card', label: 'Credit Card', icon: CreditCard },
                { id: 'apple_pay', label: 'Apple Pay', icon: Wallet },
                { id: 'upi', label: 'Instant Pay', icon: Sparkles },
              ].map(opt => {
                const Icon = opt.icon;
                const active = paymentMethod === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {paymentMethod === 'card' && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">CVC</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Seat Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Convenience & Tech Fee (8%)</span>
              <span>${convenienceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800/80">
              <span>Total Amount</span>
              <span className="text-indigo-400 font-display text-base">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions: Abandon vs Confirm */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              id="btn-abandon-hold"
              onClick={handleAbandon}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-colors"
            >
              Abandon & Release Seats
            </button>

            <button
              type="submit"
              id="btn-confirm-payment"
              disabled={isProcessing || isExpired}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing & Minting QR...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ${grandTotal.toFixed(2)} & Get QR Ticket</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
