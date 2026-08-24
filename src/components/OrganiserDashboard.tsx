import React, { useState } from 'react';
import { 
  DollarSign, 
  Ticket, 
  Users, 
  Layers, 
  Plus, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  Clock,
  X,
  Building
} from 'lucide-react';
import { EventShow, Venue, User, Booking, WaitlistEntry } from '../types';
import { generateEventSeats } from '../services/storage';

interface OrganiserDashboardProps {
  events: EventShow[];
  venues: Venue[];
  currentUser: User;
  bookings: Booking[];
  waitlists: WaitlistEntry[];
  onCreateEvent: (event: EventShow) => void;
}

export const OrganiserDashboard: React.FC<OrganiserDashboardProps> = ({
  events,
  venues,
  currentUser,
  bookings,
  waitlists,
  onCreateEvent,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventForRoster, setSelectedEventForRoster] = useState<EventShow | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<EventShow['type']>('movie');
  const [newGenre, setNewGenre] = useState('Sci-Fi / Action');
  const [newRating, setNewRating] = useState('PG-13');
  const [newDuration, setNewDuration] = useState(150);
  const [newVenueId, setNewVenueId] = useState(venues[0]?.id || '');
  const [newDateTime, setNewDateTime] = useState('2026-09-12T19:30');
  const [newPosterUrl, setNewPosterUrl] = useState('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');
  const [newDescription, setNewDescription] = useState('');
  const [categoryPrices, setCategoryPrices] = useState<Record<string, number>>({});

  const selectedVenue = venues.find(v => v.id === newVenueId) || venues[0];

  // Initialize category prices when venue changes
  React.useEffect(() => {
    if (selectedVenue) {
      const defaultPrices: Record<string, number> = {};
      selectedVenue.categories.forEach(cat => {
        defaultPrices[cat.id] = cat.basePrice;
      });
      setCategoryPrices(defaultPrices);
    }
  }, [selectedVenue]);

  // Compute Organiser Metrics
  const organiserEvents = currentUser.role === 'admin'
    ? events
    : events.filter(e => e.organiserId === currentUser.id || currentUser.role === 'organiser');

  let totalTicketsSold = 0;
  let totalRevenue = 0;
  let totalSeatsCapacity = 0;

  organiserEvents.forEach(evt => {
    const seatsList = Object.values(evt.seats) as import('../types').Seat[];
    const booked = seatsList.filter(s => s.status === 'booked');
    totalTicketsSold += booked.length;
    totalSeatsCapacity += seatsList.length;
    booked.forEach(s => {
      totalRevenue += s.price;
    });
  });

  const overallOccupancy = totalSeatsCapacity > 0 ? Math.round((totalTicketsSold / totalSeatsCapacity) * 100) : 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedVenue) return;

    const eventId = 'evt_' + Math.random().toString(36).substring(2, 9);
    const newEvent: EventShow = {
      id: eventId,
      title: newTitle,
      type: newType,
      genre: newGenre,
      rating: newRating,
      durationMinutes: Number(newDuration),
      posterUrl: newPosterUrl,
      backdropUrl: newPosterUrl,
      description: newDescription || `${newTitle} live presentation at ${selectedVenue.name}.`,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      venueAddress: selectedVenue.address,
      dateTime: new Date(newDateTime).toISOString(),
      categoryPricing: categoryPrices,
      seats: generateEventSeats(selectedVenue, categoryPrices, 'empty'),
      isSoldOut: false,
      organiserId: currentUser.id,
      organiserName: currentUser.name,
      status: 'active',
      tags: ['New Listing', 'Direct Booking'],
    };

    onCreateEvent(newEvent);
    setShowCreateModal(false);
    // Reset
    setNewTitle('');
    setNewDescription('');
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display font-bold text-2xl text-white">Organiser Hub & Show Manager</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time occupancy tracking, tiered category pricing, and ticket sales ledger
          </p>
        </div>

        <button
          id="btn-create-event-modal"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Event / Show</span>
        </button>
      </div>

      {/* Analytics KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Ticket Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">${totalRevenue.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Live Gross Sales
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tickets Sold</span>
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">{totalTicketsSold}</p>
          <span className="text-[11px] text-slate-400">Out of {totalSeatsCapacity} total seats</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Average Occupancy</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">{overallOccupancy}%</p>
          <span className="text-[11px] text-amber-400 font-semibold">Seat Fill Rate</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Waitlists</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">
            {waitlists.filter(w => w.status === 'waiting').length}
          </p>
          <span className="text-[11px] text-purple-400 font-semibold">In FIFO Queues</span>
        </div>

      </div>

      {/* Event Shows Table / Cards */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white">
          Active Events & Performance ({organiserEvents.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {organiserEvents.map(event => {
            const seats = Object.values(event.seats) as import('../types').Seat[];
            const total = seats.length;
            const booked = seats.filter(s => s.status === 'booked').length;
            const held = seats.filter(s => s.status === 'held').length;
            const available = seats.filter(s => s.status === 'available').length;
            const occupancy = Math.round(((booked + held) / total) * 100);

            // Compute revenue for this event
            const revenue = seats
              .filter(s => s.status === 'booked')
              .reduce((sum, s) => sum + s.price, 0);

            return (
              <div
                key={event.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {event.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {event.venueName}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-lg text-white mt-1">
                      {event.title}
                    </h4>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Revenue</span>
                    <span className="font-display font-bold text-base text-emerald-400">${revenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Occupancy: {occupancy}%</span>
                    <span>{booked} Booked • {held} Held • {available} Avail</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(booked / total) * 100}%` }} className="bg-indigo-500 h-full" />
                    <div style={{ width: `${(held / total) * 100}%` }} className="bg-amber-500 h-full animate-pulse" />
                    <div style={{ width: `${(available / total) * 100}%` }} className="bg-emerald-500/40 h-full" />
                  </div>
                </div>

                {/* Tier Pricing Overview */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(event.categoryPricing).map(([catId, price]) => (
                    <span key={catId} className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300">
                      <span className="capitalize">{catId.replace('cat_', '').replace('_', ' ')}</span>: <strong>${price}</strong>
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    📅 {new Date(event.dateTime).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>

                  <button
                    onClick={() => setSelectedEventForRoster(event)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Attendee Roster</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="bg-indigo-950/80 p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white">Create New Event / Movie Listing</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Interstellar (IMAX 70mm Special)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    <option value="movie">Movie</option>
                    <option value="concert">Concert</option>
                    <option value="play">Theater Play</option>
                    <option value="comedy">Standup Comedy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Venue</label>
                  <select
                    value={newVenueId}
                    onChange={(e) => setNewVenueId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.totalCapacity} seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Genre</label>
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Tier Pricing Configuration */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Per-Category Tier Pricing ($ USD)
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedVenue.categories.map(cat => (
                    <div key={cat.id}>
                      <label className="block text-[11px] text-slate-300 font-medium mb-1">
                        {cat.name}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={categoryPrices[cat.id] ?? cat.basePrice}
                        onChange={(e) => setCategoryPrices({
                          ...categoryPrices,
                          [cat.id]: Number(e.target.value)
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Publish Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendee Roster Modal */}
      {selectedEventForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h4 className="font-display font-bold text-lg text-white">Attendee Roster</h4>
                <p className="text-xs text-slate-400">{selectedEventForRoster.title}</p>
              </div>
              <button onClick={() => setSelectedEventForRoster(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {bookings.filter(b => b.eventId === selectedEventForRoster.id).length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">No bookings yet for this event.</p>
              ) : (
                bookings
                  .filter(b => b.eventId === selectedEventForRoster.id)
                  .map(bk => (
                    <div key={bk.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{bk.customerName} ({bk.customerEmail})</p>
                        <p className="text-slate-400">Seats: {bk.seats.map(s => s.seatId).join(', ')} • Ref: {bk.bookingReference}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        bk.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        bk.status === 'used' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {bk.status.toUpperCase()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
