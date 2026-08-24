import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  Sparkles, 
  Flame, 
  ChevronRight, 
  Film, 
  Music, 
  Layers, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { EventShow, EventCategory, User } from '../types';

interface EventBrowserProps {
  events: EventShow[];
  onSelectEvent: (event: EventShow) => void;
  onQuickJoinWaitlist: (event: EventShow) => void;
  currentUser: User;
}

export const EventBrowser: React.FC<EventBrowserProps> = ({
  events,
  onSelectEvent,
  onQuickJoinWaitlist,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'sold_out'>('all');

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Type filter
      if (selectedType !== 'all' && event.type !== selectedType) {
        return false;
      }
      // Availability filter
      if (availabilityFilter === 'available' && event.isSoldOut) {
        return false;
      }
      if (availabilityFilter === 'sold_out' && !event.isSoldOut) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchVenue = event.venueName.toLowerCase().includes(q);
        const matchGenre = event.genre.toLowerCase().includes(q);
        const matchAddress = event.venueAddress.toLowerCase().includes(q);
        return matchTitle || matchVenue || matchGenre || matchAddress;
      }
      return true;
    });
  }, [events, selectedType, searchQuery, availabilityFilter]);

  const featuredEvent = events[0];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Showcase Spotlight */}
      {featuredEvent && (
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <img
              src={featuredEvent.backdropUrl}
              alt={featuredEvent.title}
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-4 tracking-wide uppercase">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>High-Demand Feature Screening</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-none mb-4">
              {featuredEvent.title}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base line-clamp-3 mb-6 leading-relaxed">
              {featuredEvent.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-8">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{featuredEvent.venueName}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{new Date(featuredEvent.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{featuredEvent.durationMinutes} mins</span>
              </div>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold px-2.5 py-1 rounded-md text-[11px]">
                {featuredEvent.rating}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-hero-select-seats"
                onClick={() => onSelectEvent(featuredEvent)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Select Seats from Map</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {featuredEvent.tags && featuredEvent.tags.map(tag => (
                <span key={tag} className="text-xs text-slate-400 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Shows', icon: Layers },
              { id: 'movie', label: 'Movies & IMAX', icon: Film },
              { id: 'concert', label: 'Concerts & Symphony', icon: Music },
            ].map(tab => {
              const Icon = tab.icon;
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`filter-tab-${tab.id}`}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-events"
              type="text"
              placeholder="Search movie, artist, concert or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>

        {/* Availability Filter Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium mr-1">Status:</span>
          {(['all', 'available', 'sold_out'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setAvailabilityFilter(filter)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                availabilityFilter === filter
                  ? 'bg-slate-800 text-indigo-400 border border-indigo-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'all' && 'All Listings'}
              {filter === 'available' && '🟢 Available Seats'}
              {filter === 'sold_out' && '🔴 Sold Out (Waitlist Ready)'}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => {
          const seatList = Object.values(event.seats) as import('../types').Seat[];
          const totalSeats = seatList.length;
          const availableCount = seatList.filter(s => s.status === 'available').length;
          const heldCount = seatList.filter(s => s.status === 'held').length;
          const bookedCount = seatList.filter(s => s.status === 'booked').length;
          const prices = Object.values(event.categoryPricing) as number[];
          const minPrice = prices.length > 0 ? Math.min(...prices) : 15;

          return (
            <div
              key={event.id}
              id={`event-card-${event.id}`}
              className="group bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col"
            >
              {/* Poster Image Frame */}
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                <img
                  src={event.posterUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Event Type & Rating Tag */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="bg-slate-950/80 backdrop-blur-md border border-slate-700 text-indigo-300 text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                    {event.type}
                  </span>
                  <span className="bg-slate-950/80 backdrop-blur-md border border-slate-700 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    {event.rating}
                  </span>
                </div>

                {/* Sold Out / Availability Banner */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  {event.isSoldOut ? (
                    <span className="bg-rose-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg shadow-rose-500/30 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Sold Out • Waitlist Active
                    </span>
                  ) : (
                    <span className="bg-emerald-500/90 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      {availableCount} Seats Available
                    </span>
                  )}

                  <span className="text-white font-display font-bold text-sm bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700">
                    From ${minPrice}
                  </span>
                </div>
              </div>

              {/* Event Content Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {event.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span className="truncate">{event.venueName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>{new Date(event.dateTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Occupancy Mini Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Occupancy</span>
                    <span className="font-semibold text-slate-200">{Math.round(((bookedCount + heldCount) / totalSeats) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(bookedCount / totalSeats) * 100}%` }}
                      className="bg-slate-600 h-full"
                      title="Booked"
                    />
                    <div
                      style={{ width: `${(heldCount / totalSeats) * 100}%` }}
                      className="bg-amber-500 h-full animate-pulse"
                      title="Held"
                    />
                    <div
                      style={{ width: `${(availableCount / totalSeats) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title="Available"
                    />
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2">
                  {event.isSoldOut ? (
                    <button
                      id={`btn-join-waitlist-${event.id}`}
                      onClick={() => onQuickJoinWaitlist(event)}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Join Priority Waitlist Queue
                    </button>
                  ) : (
                    <button
                      id={`btn-view-seats-${event.id}`}
                      onClick={() => onSelectEvent(event)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-98"
                    >
                      <span>View Visual Seat Map</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white">No Shows Match Your Filter</h3>
          <p className="text-slate-400 text-xs mt-1">Try clearing your search query or adjusting your filters.</p>
        </div>
      )}

    </div>
  );
};
