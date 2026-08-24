import QRCode from 'qrcode';
import { AppStorage, TTLConfig } from './storage';
import { Booking, EventShow, SeatHold, User, WaitlistEntry, EmailNotification, Seat } from '../types';

// Mutex simulator for concurrency control
class ConcurrencyMutex {
  private static locks: Set<string> = new Set();

  static async acquire(lockKey: string): Promise<boolean> {
    if (this.locks.has(lockKey)) {
      return false; // Lock collision!
    }
    this.locks.add(lockKey);
    return true;
  }

  static release(lockKey: string): void {
    this.locks.delete(lockKey);
  }
}

export interface HoldSeatsResult {
  success: boolean;
  hold?: SeatHold;
  error?: string;
  conflictingSeats?: string[];
  ttlSeconds?: number;
}

export interface ConfirmBookingResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export class TicketEngine {
  /**
   * Acquire atomic lock and hold seats with TTL
   */
  static async holdSeats(
    eventId: string,
    seatIds: string[],
    user: User,
    customTTLSeconds?: number
  ): Promise<HoldSeatsResult> {
    if (!seatIds || seatIds.length === 0) {
      return { success: false, error: 'No seats selected.' };
    }

    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    const ttlConfig = AppStorage.getTTLConfig();
    const ttlSeconds = customTTLSeconds || ttlConfig.holdDurationSeconds;
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // Check concurrency locks for each seat
    const lockKeys = seatIds.map(sId => `${eventId}_seat_${sId}`);
    const acquiredLocks: string[] = [];

    for (const key of lockKeys) {
      const locked = await ConcurrencyMutex.acquire(key);
      if (!locked) {
        // Concurrency collision occurred! Release previously acquired locks
        acquiredLocks.forEach(k => ConcurrencyMutex.release(k));
        AppStorage.updateMetrics(m => ({ ...m, concurrencyCollisionsPrevented: m.concurrencyCollisionsPrevented + 1 }));
        return {
          success: false,
          error: 'Concurrency conflict: Another customer attempted to select one of these seats simultaneously. Please try again.',
        };
      }
      acquiredLocks.push(key);
    }

    try {
      // First verify that NONE of the seats are currently booked or actively held by someone else
      const conflictingSeats: string[] = [];
      let totalAmount = 0;

      for (const seatId of seatIds) {
        const seat = event.seats[seatId];
        if (!seat) {
          conflictingSeats.push(seatId);
          continue;
        }

        // If held, check if hold expired
        if (seat.status === 'held') {
          if (seat.heldUntil && seat.heldUntil > now && seat.heldByUserId !== user.id) {
            conflictingSeats.push(seatId);
          }
        } else if (seat.status === 'booked' || seat.status === 'blocked') {
          conflictingSeats.push(seatId);
        } else {
          totalAmount += seat.price;
        }
      }

      if (conflictingSeats.length > 0) {
        AppStorage.updateMetrics(m => ({ ...m, concurrencyCollisionsPrevented: m.concurrencyCollisionsPrevented + 1 }));
        return {
          success: false,
          error: `The following seat(s) are no longer available: ${conflictingSeats.join(', ')}`,
          conflictingSeats,
        };
      }

      // Generate Hold Record
      const holdId = 'hold_' + Math.random().toString(36).substring(2, 9);
      const newHold: SeatHold = {
        holdId,
        eventId,
        eventTitle: event.title,
        seatIds,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        createdAt: now,
        expiresAt,
        totalAmount,
      };

      // Update seat statuses in event
      seatIds.forEach(seatId => {
        event.seats[seatId] = {
          ...event.seats[seatId],
          status: 'held',
          heldByUserId: user.id,
          heldByUserName: user.name,
          heldUntil: expiresAt,
          holdId,
        };
      });

      // Save updated event and hold list
      AppStorage.saveEvents(events);

      // Clean out any existing active holds for this user on this event
      const currentHolds = AppStorage.getHolds().filter(h => !(h.userId === user.id && h.eventId === eventId));
      currentHolds.push(newHold);
      AppStorage.saveHolds(currentHolds);

      AppStorage.updateMetrics(m => ({ ...m, activeHoldsCount: currentHolds.length }));

      return {
        success: true,
        hold: newHold,
        ttlSeconds,
      };
    } finally {
      // Release mutexes
      acquiredLocks.forEach(k => ConcurrencyMutex.release(k));
    }
  }

  /**
   * Release an active seat hold manually or on checkout abandonment
   */
  static releaseHold(holdId: string): boolean {
    const holds = AppStorage.getHolds();
    const hold = holds.find(h => h.holdId === holdId);
    if (!hold) return false;

    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === hold.eventId);
    if (event) {
      hold.seatIds.forEach(sId => {
        if (event.seats[sId] && event.seats[sId].holdId === holdId) {
          event.seats[sId] = {
            ...event.seats[sId],
            status: 'available',
            heldByUserId: undefined,
            heldByUserName: undefined,
            heldUntil: undefined,
            holdId: undefined,
          };
        }
      });
      event.isSoldOut = false;
      AppStorage.saveEvents(events);
    }

    const remainingHolds = holds.filter(h => h.holdId !== holdId);
    AppStorage.saveHolds(remainingHolds);
    AppStorage.updateMetrics(m => ({ ...m, activeHoldsCount: remainingHolds.length }));

    return true;
  }

  /**
   * Periodic TTL Cleanup Worker
   * Auto-releases expired seat holds and handles waitlist offer timeouts
   */
  static processTTLAndAutoRelease(): { releasedHoldsCount: number; expiredOffersCount: number } {
    const now = Date.now();
    let releasedHoldsCount = 0;
    let expiredOffersCount = 0;

    // 1. Process Expired Seat Holds
    const holds = AppStorage.getHolds();
    const events = AppStorage.getEvents();
    const validHolds: SeatHold[] = [];

    for (const hold of holds) {
      if (now > hold.expiresAt) {
        // Hold has expired! Auto-release seats
        const event = events.find(e => e.id === hold.eventId);
        if (event) {
          hold.seatIds.forEach(sId => {
            if (event.seats[sId] && event.seats[sId].status === 'held' && event.seats[sId].holdId === hold.holdId) {
              event.seats[sId] = {
                ...event.seats[sId],
                status: 'available',
                heldByUserId: undefined,
                heldByUserName: undefined,
                heldUntil: undefined,
                holdId: undefined,
              };
            }
          });
          event.isSoldOut = false;
        }

        // Notify customer that their hold expired
        AppStorage.addEmail({
          id: 'email_' + Math.random().toString(36).substring(2, 9),
          toEmail: hold.userEmail,
          toName: hold.userName,
          subject: `⏰ Seat Hold Expired: ${hold.eventTitle}`,
          type: 'hold_expired',
          contentHtml: `
            <p>Hi ${hold.userName},</p>
            <p>Your 10-minute hold for <strong>${hold.seatIds.join(', ')}</strong> at <strong>${hold.eventTitle}</strong> has expired and the seats have been released back to other customers.</p>
            <p>If you still wish to attend, please visit the event page to select and secure new seats.</p>
          `,
          previewText: `Your hold for ${hold.seatIds.join(', ')} at ${hold.eventTitle} has expired.`,
          sentAt: new Date().toISOString(),
          read: false,
        });

        releasedHoldsCount++;
      } else {
        validHolds.push(hold);
      }
    }

    if (releasedHoldsCount > 0) {
      AppStorage.saveEvents(events);
      AppStorage.saveHolds(validHolds);
      AppStorage.updateMetrics(m => ({
        ...m,
        autoReleasedHoldsCount: m.autoReleasedHoldsCount + releasedHoldsCount,
        activeHoldsCount: validHolds.length,
      }));
    }

    // 2. Process Expired Waitlist Offers (Cascade auto-assignment!)
    const waitlists = AppStorage.getWaitlists();
    let waitlistUpdated = false;

    for (const entry of waitlists) {
      if (entry.status === 'offered' && entry.offerExpiresAt && now > entry.offerExpiresAt) {
        entry.status = 'expired';
        entry.history = entry.history || [];
        entry.history.push({
          action: 'Offer Expired (Unclaimed)',
          timestamp: new Date().toISOString(),
          note: 'Time-limited window lapsed. Cascading offer to next waitlisted customer.',
        });

        expiredOffersCount++;
        waitlistUpdated = true;

        // Cascade offer to the NEXT customer on the waitlist for this category!
        if (entry.offeredSeatIds && entry.offeredSeatIds.length > 0) {
          this.reallocateSeatsToNextWaitlist(entry.eventId, entry.categoryId, entry.offeredSeatIds);
        }
      }
    }

    if (waitlistUpdated) {
      AppStorage.saveWaitlists(waitlists);
    }

    return { releasedHoldsCount, expiredOffersCount };
  }

  /**
   * Finalize and confirm booking, generating verifiable QR code & email delivery
   */
  static async confirmBooking(
    eventId: string,
    seatIds: string[],
    user: User,
    customerDetails: { name: string; email: string; phone: string }
  ): Promise<ConfirmBookingResult> {
    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    const now = Date.now();

    // Verify seats are held by this user or available
    for (const seatId of seatIds) {
      const seat = event.seats[seatId];
      if (!seat) {
        return { success: false, error: `Seat ${seatId} not found.` };
      }
      if (seat.status === 'booked') {
        return { success: false, error: `Seat ${seatId} is already booked.` };
      }
      if (seat.status === 'held' && seat.heldByUserId !== user.id && seat.heldUntil && seat.heldUntil > now) {
        return { success: false, error: `Seat ${seatId} is currently held by another customer.` };
      }
    }

    // Generate unique booking reference
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    const bookingReference = `OMNI-${randomCode}-${suffix}`;
    const bookingId = 'bk_' + Math.random().toString(36).substring(2, 10);

    // Calculate totals
    const seatItems = seatIds.map(sId => ({
      seatId: sId,
      categoryName: event.seats[sId].categoryName,
      price: event.seats[sId].price,
    }));
    const subtotal = seatItems.reduce((sum, item) => sum + item.price, 0);
    const convenienceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + convenienceFee) * 100) / 100;

    // Generate High-Res QR Code Data URL
    const qrPayload = JSON.stringify({
      ref: bookingReference,
      eventId: event.id,
      title: event.title,
      seats: seatIds,
      email: customerDetails.email,
      timestamp: new Date().toISOString(),
      securityHash: Math.random().toString(36).substring(2, 12),
    });

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch {
      // Fallback
      qrCodeDataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23eee"/><text x="20" y="100" fill="%23000">QR Code Ticket</text></svg>';
    }

    // Update Seat Statuses in Event
    seatIds.forEach(sId => {
      event.seats[sId] = {
        ...event.seats[sId],
        status: 'booked',
        bookingId,
        heldByUserId: undefined,
        heldByUserName: undefined,
        heldUntil: undefined,
        holdId: undefined,
      };
    });

    // Check if event is now sold out
    const availableSeatsCount = Object.values(event.seats).filter(s => s.status === 'available').length;
    if (availableSeatsCount === 0) {
      event.isSoldOut = true;
    }

    AppStorage.saveEvents(events);

    // Remove any active hold
    const holds = AppStorage.getHolds().filter(h => !(h.eventId === eventId && h.userId === user.id));
    AppStorage.saveHolds(holds);

    // Create Booking Object
    const newBooking: Booking = {
      id: bookingId,
      bookingReference,
      eventId: event.id,
      eventTitle: event.title,
      eventPoster: event.posterUrl,
      eventDate: event.dateTime,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      seats: seatItems,
      userId: user.id,
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      customerPhone: customerDetails.phone,
      subtotal,
      convenienceFee,
      totalAmount,
      status: 'confirmed',
      qrCodeDataUrl,
      createdAt: new Date().toISOString(),
    };

    const bookings = AppStorage.getBookings();
    bookings.unshift(newBooking);
    AppStorage.saveBookings(bookings);

    // Update System Metrics
    AppStorage.updateMetrics(m => ({
      ...m,
      totalBookings: m.totalBookings + 1,
      totalRevenue: m.totalRevenue + totalAmount,
      activeHoldsCount: holds.length,
    }));

    // Dispatch Confirmation Email with QR Code
    AppStorage.addEmail({
      id: 'email_' + Math.random().toString(36).substring(2, 9),
      toEmail: customerDetails.email,
      toName: customerDetails.name,
      subject: `🎟️ Booking Confirmed: ${event.title} [Ref: ${bookingReference}]`,
      type: 'booking_confirmation',
      contentHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Your Ticket Booking is Confirmed!</h2>
          <p>Hi <strong>${customerDetails.name}</strong>, thank you for booking with OmniTicket.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #0f172a;">${event.title}</h3>
            <p style="margin: 4px 0; color: #475569;">📍 ${event.venueName} - ${event.venueAddress}</p>
            <p style="margin: 4px 0; color: #475569;">📅 ${new Date(event.dateTime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <p style="margin: 4px 0; color: #0f172a; font-weight: bold;">💺 Seats: ${seatIds.join(', ')} (${seatItems.map(s => s.categoryName).join(', ')})</p>
            <p style="margin: 4px 0; color: #059669; font-weight: bold;">💰 Total Paid: $${totalAmount.toFixed(2)}</p>
          </div>
          <div style="text-align: center; padding: 20px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Scan this QR code at the venue gate for instant entry</p>
            <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;" />
            <p style="font-family: monospace; font-size: 16px; font-weight: bold; margin-top: 8px; color: #334155;">REF: ${bookingReference}</p>
          </div>
        </div>
      `,
      previewText: `Your booking for ${event.title} is confirmed! Reference: ${bookingReference}.`,
      sentAt: new Date().toISOString(),
      read: false,
      qrCodeDataUrl,
      bookingReference,
    });

    return {
      success: true,
      booking: newBooking,
    };
  }

  /**
   * Cancel an existing booking and initiate the Waitlist Reallocation Cascade
   */
  static cancelBooking(bookingId: string, user: User): { success: boolean; error?: string; reallocatedCount?: number } {
    const bookings = AppStorage.getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (booking.status !== 'confirmed') {
      return { success: false, error: 'Only confirmed bookings can be cancelled.' };
    }

    // Check permissions (customer who booked or admin)
    if (user.role !== 'admin' && booking.userId !== user.id) {
      return { success: false, error: 'Unauthorized to cancel this booking.' };
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date().toISOString();
    AppStorage.saveBookings(bookings);

    // Release seats in event
    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === booking.eventId);
    if (!event) {
      return { success: false, error: 'Associated event not found.' };
    }

    const cancelledSeatIds = booking.seats.map(s => s.seatId);
    const categorySeatsMap: Record<string, string[]> = {};

    cancelledSeatIds.forEach(sId => {
      if (event.seats[sId]) {
        const catId = event.seats[sId].categoryId;
        event.seats[sId] = {
          ...event.seats[sId],
          status: 'available',
          bookingId: undefined,
          heldByUserId: undefined,
          heldByUserName: undefined,
          heldUntil: undefined,
          holdId: undefined,
        };
        categorySeatsMap[catId] = categorySeatsMap[catId] || [];
        categorySeatsMap[catId].push(sId);
      }
    });

    event.isSoldOut = false;
    AppStorage.saveEvents(events);

    // Send Cancellation & Refund Email
    AppStorage.addEmail({
      id: 'email_' + Math.random().toString(36).substring(2, 9),
      toEmail: booking.customerEmail,
      toName: booking.customerName,
      subject: `❌ Booking Cancelled & Refund Initiated: ${booking.eventTitle}`,
      type: 'cancellation_refund',
      contentHtml: `
        <p>Hi ${booking.customerName},</p>
        <p>Your booking <strong>${booking.bookingReference}</strong> for <strong>${booking.eventTitle}</strong> has been cancelled.</p>
        <p>A full refund of <strong>$${booking.totalAmount.toFixed(2)}</strong> has been initiated back to your original payment method.</p>
        <p>Your released seat(s) <strong>${cancelledSeatIds.join(', ')}</strong> have been passed to the next customer in the waitlist.</p>
      `,
      previewText: `Your booking ${booking.bookingReference} has been cancelled and refunded.`,
      sentAt: new Date().toISOString(),
      read: false,
    });

    // TRIGGER WAITLIST AUTO-ALLOCATION CASCADE!
    let totalReallocated = 0;
    for (const [catId, seatIdsList] of Object.entries(categorySeatsMap)) {
      const reallocated = this.reallocateSeatsToNextWaitlist(event.id, catId, seatIdsList);
      totalReallocated += reallocated;
    }

    return {
      success: true,
      reallocatedCount: totalReallocated,
    };
  }

  /**
   * Reallocate freed seats to the top candidate in the Waitlist Queue
   */
  static reallocateSeatsToNextWaitlist(eventId: string, categoryId: string, seatIds: string[]): number {
    if (!seatIds || seatIds.length === 0) return 0;

    const waitlists = AppStorage.getWaitlists();
    // Filter active waiting candidates for this event & category sorted by joinedAt (FIFO)
    const eligibleQueue = waitlists
      .filter(w => w.eventId === eventId && w.categoryId === categoryId && w.status === 'waiting')
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

    if (eligibleQueue.length === 0) {
      return 0; // No waiting candidate, seats remain available to public
    }

    const nextCandidate = eligibleQueue[0];
    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return 0;

    const ttlConfig = AppStorage.getTTLConfig();
    const offerDurationSeconds = ttlConfig.waitlistOfferDurationSeconds || 600; // 10 minutes
    const offerExpiresAt = Date.now() + offerDurationSeconds * 1000;
    const offerToken = 'wlo_' + Math.random().toString(36).substring(2, 12);

    // Pick seats for candidate (up to available)
    const allocatedSeatIds = seatIds.slice(0, 2); // Offer up to 2 seats

    // Place priority lock on seats for this waitlisted candidate
    allocatedSeatIds.forEach(sId => {
      if (event.seats[sId]) {
        event.seats[sId] = {
          ...event.seats[sId],
          status: 'held',
          heldByUserId: nextCandidate.userId,
          heldByUserName: nextCandidate.userName,
          heldUntil: offerExpiresAt,
          holdId: offerToken,
        };
      }
    });
    AppStorage.saveEvents(events);

    // Update Waitlist Entry
    nextCandidate.status = 'offered';
    nextCandidate.offeredSeatIds = allocatedSeatIds;
    nextCandidate.offerExpiresAt = offerExpiresAt;
    nextCandidate.offerToken = offerToken;
    nextCandidate.history = nextCandidate.history || [];
    nextCandidate.history.push({
      action: 'Time-Limited Offer Assigned',
      timestamp: new Date().toISOString(),
      note: `Assigned seat(s) ${allocatedSeatIds.join(', ')}. 10-minute countdown active until ${new Date(offerExpiresAt).toLocaleTimeString()}`,
    });
    AppStorage.saveWaitlists(waitlists);

    // Update system metrics
    AppStorage.updateMetrics(m => ({
      ...m,
      waitlistReallocationsCount: m.waitlistReallocationsCount + 1,
    }));

    // Send Time-Limited Offer Email Notification
    AppStorage.addEmail({
      id: 'email_' + Math.random().toString(36).substring(2, 9),
      toEmail: nextCandidate.userEmail,
      toName: nextCandidate.userName,
      subject: `⚡ Great News! Waitlist Seat Assigned for ${event.title}`,
      type: 'waitlist_offer',
      contentHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #8b5cf6; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-top: 0;">🎉 A Seat Just Opened for You!</h2>
          <p>Hi <strong>${nextCandidate.userName}</strong>,</p>
          <p>A booking cancellation occurred for <strong>${event.title}</strong>, and as the next person in line, seat(s) <strong>${allocatedSeatIds.join(', ')}</strong> (${nextCandidate.categoryName}) have been reserved exclusively for you.</p>
          <div style="background-color: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #5b21b6; font-weight: bold;">⏳ Time-Limited Window: 10 Minutes</p>
            <p style="margin: 4px 0 0 0; color: #6d28d9; font-size: 14px;">This offer expires at <strong>${new Date(offerExpiresAt).toLocaleTimeString()}</strong>. If unclaimed, the seat will automatically be transferred to the next person in the waitlist.</p>
          </div>
          <p>Click below to complete your booking right away:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="#claim-waitlist-${offerToken}" style="background-color: #7c3aed; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Complete Booking Now</a>
          </div>
        </div>
      `,
      previewText: `Great news! A seat for ${event.title} is now reserved for you. 10 minutes to claim.`,
      sentAt: new Date().toISOString(),
      read: false,
      offerExpiresAt,
      metadata: {
        eventId,
        categoryId,
        seatIds: allocatedSeatIds,
        offerToken,
      },
    });

    return 1;
  }

  /**
   * Join category-specific priority waitlist for sold-out events
   */
  static joinWaitlist(
    eventId: string,
    categoryId: string,
    user: User
  ): { success: boolean; entry?: WaitlistEntry; position?: number; error?: string } {
    const events = AppStorage.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    const venues = AppStorage.getVenues();
    const venue = venues.find(v => v.id === event.venueId);
    const category = venue?.categories.find(c => c.id === categoryId);
    const categoryName = category?.name || 'Standard';

    const waitlists = AppStorage.getWaitlists();

    // Check if user is already waiting on this event + category
    const existing = waitlists.find(
      w => w.eventId === eventId && w.categoryId === categoryId && w.userId === user.id && (w.status === 'waiting' || w.status === 'offered')
    );
    if (existing) {
      return { success: false, error: 'You are already in the waitlist for this category.' };
    }

    const entryId = 'wl_' + Math.random().toString(36).substring(2, 9);
    const newEntry: WaitlistEntry = {
      id: entryId,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.dateTime,
      venueName: event.venueName,
      categoryId,
      categoryName,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      joinedAt: new Date().toISOString(),
      status: 'waiting',
      history: [
        {
          action: 'Joined Priority Queue',
          timestamp: new Date().toISOString(),
          note: 'Waiting for cancellation auto-assignment.',
        },
      ],
    };

    waitlists.push(newEntry);
    AppStorage.saveWaitlists(waitlists);

    // Calculate queue position
    const queuePosition = waitlists.filter(w => w.eventId === eventId && w.categoryId === categoryId && w.status === 'waiting').length;

    // Send Waitlist Confirmation Email
    AppStorage.addEmail({
      id: 'email_' + Math.random().toString(36).substring(2, 9),
      toEmail: user.email,
      toName: user.name,
      subject: `📋 Waitlist Confirmed: #${queuePosition} in Queue for ${event.title}`,
      type: 'waitlist_joined',
      contentHtml: `
        <p>Hi ${user.name},</p>
        <p>You have joined the priority waitlist for <strong>${event.title}</strong> (${categoryName} category).</p>
        <p>Your current queue position is <strong>#${queuePosition}</strong>.</p>
        <p>When any attendee cancels their ticket, our system will automatically lock the seat for you and send an instant notification with a 10-minute claim window.</p>
      `,
      previewText: `You are #${queuePosition} in line for ${event.title} (${categoryName}).`,
      sentAt: new Date().toISOString(),
      read: false,
    });

    return {
      success: true,
      entry: newEntry,
      position: queuePosition,
    };
  }

  /**
   * Validate QR code ticket at venue gate
   */
  static validateTicketPass(inputQuery: string): {
    valid: boolean;
    status: 'valid' | 'already_used' | 'cancelled' | 'not_found';
    booking?: Booking;
    message: string;
  } {
    const bookings = AppStorage.getBookings();
    let query = inputQuery.trim();

    // Check if query is JSON from QR code
    try {
      if (query.startsWith('{')) {
        const parsed = JSON.parse(query);
        if (parsed.ref) query = parsed.ref;
      }
    } catch {
      // Keep query as is
    }

    const booking = bookings.find(
      b => b.bookingReference.toLowerCase() === query.toLowerCase() || b.id.toLowerCase() === query.toLowerCase()
    );

    if (!booking) {
      return {
        valid: false,
        status: 'not_found',
        message: 'Invalid ticket pass. No booking record exists with this reference.',
      };
    }

    if (booking.status === 'cancelled') {
      return {
        valid: false,
        status: 'cancelled',
        booking,
        message: `TICKET CANCELLED: This booking was cancelled and refunded on ${new Date(booking.cancelledAt || '').toLocaleDateString()}. Entry denied.`,
      };
    }

    if (booking.status === 'used') {
      return {
        valid: false,
        status: 'already_used',
        booking,
        message: `DUPLICATE ENTRY DETECTED: This ticket was already checked in at ${new Date(booking.checkedInAt || '').toLocaleTimeString()}. Entry denied.`,
      };
    }

    // Mark ticket as checked in / used
    booking.status = 'used';
    booking.checkedInAt = new Date().toISOString();
    AppStorage.saveBookings(bookings);

    return {
      valid: true,
      status: 'valid',
      booking,
      message: `TICKET VERIFIED: Welcome ${booking.customerName}! Admitted for ${booking.seats.map(s => s.seatId).join(', ')}.`,
    };
  }
}
