export type UserRole = 'customer' | 'organiser' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export type EventCategory = 'movie' | 'concert' | 'play' | 'comedy';

export interface SeatCategory {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  description: string;
  perks?: string[];
}

export type SeatStatus = 'available' | 'held' | 'booked' | 'blocked';

export interface Seat {
  id: string; // e.g. "A1", "C4"
  row: string; // e.g. "A"
  col: number; // e.g. 1
  categoryId: string;
  categoryName: string;
  price: number;
  status: SeatStatus;
  heldByUserId?: string;
  heldByUserName?: string;
  heldUntil?: number; // Unix timestamp ms
  holdId?: string;
  bookingId?: string;
  isAccessible?: boolean;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  type: 'cinema' | 'concert_hall' | 'stadium' | 'theater';
  rows: number;
  cols: number;
  categories: SeatCategory[];
  totalCapacity: number;
  seatLayout: Array<{
    id: string;
    row: string;
    col: number;
    categoryId: string;
    isAisle?: boolean;
    isAccessible?: boolean;
  }>;
}

export interface EventShow {
  id: string;
  title: string;
  type: EventCategory;
  genre: string;
  rating: string;
  durationMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  description: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  dateTime: string; // ISO String e.g. "2026-08-28T19:30:00.000Z"
  categoryPricing: Record<string, number>; // categoryId -> price
  seats: Record<string, Seat>;
  isSoldOut: boolean;
  organiserId: string;
  organiserName: string;
  status: 'active' | 'completed' | 'cancelled';
  tags?: string[];
}

export interface SeatHold {
  holdId: string;
  eventId: string;
  eventTitle: string;
  seatIds: string[];
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: number;
  expiresAt: number; // Unix timestamp ms
  totalAmount: number;
}

export interface BookingSeatItem {
  seatId: string;
  categoryName: string;
  price: number;
}

export interface Booking {
  id: string;
  bookingReference: string; // e.g. "OMNI-8291-TX"
  eventId: string;
  eventTitle: string;
  eventPoster: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  seats: BookingSeatItem[];
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: number;
  convenienceFee: number;
  totalAmount: number;
  status: 'confirmed' | 'cancelled' | 'used';
  qrCodeDataUrl: string;
  createdAt: string;
  cancelledAt?: string;
  checkedInAt?: string;
}

export type WaitlistStatus = 'waiting' | 'offered' | 'expired' | 'claimed' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  categoryId: string;
  categoryName: string;
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  status: WaitlistStatus;
  offeredSeatIds?: string[];
  offerExpiresAt?: number; // Unix timestamp ms
  offerToken?: string;
  claimedBookingId?: string;
  history?: Array<{
    action: string;
    timestamp: string;
    note?: string;
  }>;
}

export interface EmailNotification {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  type: 'booking_confirmation' | 'waitlist_offer' | 'hold_expired' | 'cancellation_refund' | 'waitlist_joined';
  contentHtml: string;
  previewText: string;
  sentAt: string;
  read: boolean;
  qrCodeDataUrl?: string;
  bookingReference?: string;
  actionUrl?: string;
  offerExpiresAt?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  totalBookings: number;
  totalRevenue: number;
  concurrencyCollisionsPrevented: number;
  autoReleasedHoldsCount: number;
  waitlistReallocationsCount: number;
  activeHoldsCount: number;
}
