import React, { useState, useEffect, useCallback } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  EventBrowser 
} from './components/EventBrowser';
import { 
  SeatMap 
} from './components/SeatMap';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  BookingSuccessModal 
} from './components/BookingSuccessModal';
import { 
  MyBookings 
} from './components/MyBookings';
import { 
  WaitlistHub 
} from './components/WaitlistHub';
import { 
  OrganiserDashboard 
} from './components/OrganiserDashboard';
import { 
  AdminPanel 
} from './components/AdminPanel';
import { 
  GateScannerModal 
} from './components/GateScannerModal';
import { 
  SimulatedEmailInbox 
} from './components/SimulatedEmailInbox';
import { 
  SystemDesignModal 
} from './components/SystemDesignModal';
import { 
  JoinWaitlistModal 
} from './components/JoinWaitlistModal';

import { 
  User, 
  EventShow, 
  Venue, 
  Booking, 
  WaitlistEntry, 
  SeatHold, 
  SystemMetrics,
  EmailNotification 
} from './types';
import { 
  AppStorage 
} from './services/storage';
import { 
  TicketEngine 
} from './services/ticketEngine';

export default function App() {
  // Global State
  const [users, setUsers] = useState<User[]>(() => AppStorage.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => AppStorage.getActiveUser());
  const [venues, setVenues] = useState<Venue[]>(() => AppStorage.getVenues());
  const [events, setEvents] = useState<EventShow[]>(() => AppStorage.getEvents());
  const [bookings, setBookings] = useState<Booking[]>(() => AppStorage.getBookings());
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>(() => AppStorage.getWaitlists());
  const [emails, setEmails] = useState<EmailNotification[]>(() => AppStorage.getEmails());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>(() => AppStorage.getMetrics());
  
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<string>('explore');
  const [selectedEvent, setSelectedEvent] = useState<EventShow | null>(null);

  // Active Hold State
  const [activeHold, setActiveHold] = useState<SeatHold | null>(null);

  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [showEmailInbox, setShowEmailInbox] = useState<boolean>(false);
  const [showSystemDesign, setShowSystemDesign] = useState<boolean>(false);
  const [showGateScanner, setShowGateScanner] = useState<boolean>(false);
  const [waitlistModalEvent, setWaitlistModalEvent] = useState<{ event: EventShow; categoryId?: string } | null>(null);

  // Synchronize state from storage
  const refreshStorageData = useCallback(() => {
    setEvents(AppStorage.getEvents());
    setBookings(AppStorage.getBookings());
    setWaitlists(AppStorage.getWaitlists());
    setEmails(AppStorage.getEmails());
    setSystemMetrics(AppStorage.getMetrics());

    // Check if current user has an active valid hold
    const holds = AppStorage.getHolds();
    const myActiveHold = holds.find(h => h.userId === currentUser.id && h.expiresAt > Date.now());
    setActiveHold(myActiveHold || null);
  }, [currentUser.id]);

  // Periodic TTL Background Sweeper Worker
  useEffect(() => {
    refreshStorageData();

    const interval = setInterval(() => {
      const { releasedHoldsCount, expiredOffersCount } = TicketEngine.processTTLAndAutoRelease();
      if (releasedHoldsCount > 0 || expiredOffersCount > 0) {
        refreshStorageData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshStorageData]);

  // User Switch handler
  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    AppStorage.setActiveUser(user);
    // Find active hold for new user
    const holds = AppStorage.getHolds();
    const myHold = holds.find(h => h.userId === user.id && h.expiresAt > Date.now());
    setActiveHold(myHold || null);
  };

  // Event Selection for Visual Seat Map
  const handleSelectEvent = (event: EventShow) => {
    setSelectedEvent(event);
    setActiveTab('seatmap');
  };

  // Proceed from Seat Map to Checkout
  const handleProceedToCheckout = (hold: SeatHold) => {
    setActiveHold(hold);
    setShowCheckoutModal(true);
    refreshStorageData();
  };

  // Release Hold on Abandonment
  const handleReleaseHold = (holdId?: string) => {
    const idToRelease = holdId || activeHold?.holdId;
    if (idToRelease) {
      TicketEngine.releaseHold(idToRelease);
      setActiveHold(null);
      setShowCheckoutModal(false);
      refreshStorageData();
    }
  };

  // Booking confirmed successfully
  const handleBookingSuccess = (booking: Booking) => {
    setShowCheckoutModal(false);
    setActiveHold(null);
    setSuccessBooking(booking);
    refreshStorageData();
  };

  // Claiming Waitlist Offer from Waitlist Hub or Email
  const handleClaimWaitlistOffer = async (entry: WaitlistEntry | any) => {
    const eventId = entry.eventId || entry.metadata?.eventId;
    const seatIds = entry.offeredSeatIds || entry.metadata?.seatIds || ['A1'];
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    // Convert waitlist offer to an active hold
    const holdRes = await TicketEngine.holdSeats(eventId, seatIds, currentUser, 600);
    if (holdRes.success && holdRes.hold) {
      setActiveHold(holdRes.hold);
      setSelectedEvent(targetEvent);
      setShowCheckoutModal(true);
      refreshStorageData();
    }
  };

  // Create Event by Organiser
  const handleCreateEvent = (newEvent: EventShow) => {
    const updatedEvents = [newEvent, ...events];
    AppStorage.saveEvents(updatedEvents);
    setEvents(updatedEvents);
    setActiveTab('explore');
  };

  const unreadEmailCount = emails.filter(e => !e.read).length;
  const currentVenue = selectedEvent 
    ? (venues.find(v => v.id === selectedEvent.venueId) || venues[0]) 
    : venues[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Universal Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        users={users}
        activeHold={activeHold}
        onOpenCheckout={() => setShowCheckoutModal(true)}
        onReleaseHold={handleReleaseHold}
        unreadEmailCount={unreadEmailCount}
        onOpenEmailInbox={() => setShowEmailInbox(true)}
        onOpenSystemDesign={() => setShowSystemDesign(true)}
        onOpenGateScanner={() => setShowGateScanner(true)}
      />

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Explore Events Screen */}
        {activeTab === 'explore' && (
          <EventBrowser
            events={events}
            onSelectEvent={handleSelectEvent}
            onQuickJoinWaitlist={(evt) => setWaitlistModalEvent({ event: evt })}
            currentUser={currentUser}
          />
        )}

        {/* Visual Seat Map Screen */}
        {activeTab === 'seatmap' && selectedEvent && (
          <SeatMap
            event={selectedEvent}
            venue={currentVenue}
            currentUser={currentUser}
            onBack={() => setActiveTab('explore')}
            onProceedToCheckout={handleProceedToCheckout}
            onOpenWaitlistModal={(evt, catId) => setWaitlistModalEvent({ event: evt, categoryId: catId })}
            currentActiveHold={activeHold}
          />
        )}

        {/* My Bookings & QR Ticket Passes */}
        {activeTab === 'bookings' && (
          <MyBookings
            bookings={bookings}
            currentUser={currentUser}
            onRefresh={refreshStorageData}
            onViewTicketPass={(bk) => setSuccessBooking(bk)}
            onOpenEmailInbox={() => setShowEmailInbox(true)}
          />
        )}

        {/* Waitlist Hub & Time-Limited Offers */}
        {activeTab === 'waitlists' && (
          <WaitlistHub
            waitlists={waitlists}
            currentUser={currentUser}
            events={events}
            onClaimOffer={handleClaimWaitlistOffer}
            onRefresh={refreshStorageData}
          />
        )}

        {/* Organiser Dashboard */}
        {activeTab === 'organiser' && (
          <OrganiserDashboard
            events={events}
            venues={venues}
            currentUser={currentUser}
            bookings={bookings}
            waitlists={waitlists}
            onCreateEvent={handleCreateEvent}
          />
        )}

        {/* System Admin & Chaos Simulator */}
        {activeTab === 'admin' && (
          <AdminPanel
            venues={venues}
            events={events}
            currentUser={currentUser}
            systemMetrics={systemMetrics}
            onRefreshData={refreshStorageData}
            onOpenGateScanner={() => setShowGateScanner(true)}
          />
        )}

      </main>

      {/* Checkout Modal with TTL Timer */}
      {showCheckoutModal && activeHold && selectedEvent && (
        <CheckoutModal
          hold={activeHold}
          event={selectedEvent}
          currentUser={currentUser}
          onClose={() => setShowCheckoutModal(false)}
          onAbandonHold={handleReleaseHold}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Booking Confirmed & QR Ticket Modal */}
      {successBooking && (
        <BookingSuccessModal
          booking={successBooking}
          onClose={() => setSuccessBooking(null)}
          onViewEmail={() => {
            setSuccessBooking(null);
            setShowEmailInbox(true);
          }}
          onViewMyBookings={() => {
            setSuccessBooking(null);
            setActiveTab('bookings');
          }}
        />
      )}

      {/* Simulated Email Inbox Modal */}
      {showEmailInbox && (
        <SimulatedEmailInbox
          onClose={() => setShowEmailInbox(false)}
          currentUser={currentUser}
          onClaimWaitlistFromEmail={handleClaimWaitlistOffer}
        />
      )}

      {/* System Design Write-Up Modal */}
      {showSystemDesign && (
        <SystemDesignModal
          onClose={() => setShowSystemDesign(false)}
        />
      )}

      {/* Gate QR Ticket Scanner Modal */}
      {showGateScanner && (
        <GateScannerModal
          onClose={() => setShowGateScanner(false)}
          recentBookings={bookings}
          onTicketValidated={refreshStorageData}
        />
      )}

      {/* Join Waitlist Modal */}
      {waitlistModalEvent && (
        <JoinWaitlistModal
          event={waitlistModalEvent.event}
          initialCategoryId={waitlistModalEvent.categoryId}
          currentUser={currentUser}
          onClose={() => setWaitlistModalEvent(null)}
          onSuccess={() => {
            setWaitlistModalEvent(null);
            refreshStorageData();
            setActiveTab('waitlists');
          }}
        />
      )}

      {/* Global Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 OmniTicket Platform. High-Demand Seat Engine, Concurrency Mutex & Waitlist Cascade.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSystemDesign(true)} className="hover:text-slate-300 transition-colors">
              System Design Spec (800 words)
            </button>
            <span>•</span>
            <button onClick={() => setShowGateScanner(true)} className="hover:text-slate-300 transition-colors">
              Gate QR Scanner
            </button>
            <span>•</span>
            <button onClick={() => setShowEmailInbox(true)} className="hover:text-slate-300 transition-colors">
              Simulated Inbox ({unreadEmailCount})
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
