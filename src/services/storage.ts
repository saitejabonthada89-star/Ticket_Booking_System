import { Venue, EventShow, User, Booking, WaitlistEntry, EmailNotification, SystemMetrics, SeatHold } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_customer_1',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_customer_2',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_organiser_1',
    name: 'Marcus Vance (Luna Live)',
    email: 'marcus@lunalive.events',
    role: 'organiser',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_admin_1',
    name: 'Elena Rostova (System Admin)',
    email: 'admin@omniticket.io',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_VENUES: Venue[] = [
  {
    id: 'venue_imax_grand',
    name: 'Grand Dolby IMAX Auditorium',
    city: 'San Francisco, CA',
    address: '750 Howard St, Downtown',
    type: 'cinema',
    rows: 6,
    cols: 10,
    totalCapacity: 60,
    categories: [
      { id: 'cat_vip', name: 'VIP Recliner', color: '#f59e0b', basePrice: 28, description: 'Motorized leather recliners with personal tray table' },
      { id: 'cat_premium', name: 'Premium Dolby', color: '#8b5cf6', basePrice: 22, description: 'Optimal central viewing angle with extra legroom' },
      { id: 'cat_standard', name: 'Standard', color: '#3b82f6', basePrice: 16, description: 'Standard plush cinema seating' },
    ],
    seatLayout: generateVenueLayout(6, 10, [
      { row: 'A', catId: 'cat_vip' },
      { row: 'B', catId: 'cat_vip' },
      { row: 'C', catId: 'cat_premium' },
      { row: 'D', catId: 'cat_premium' },
      { row: 'E', catId: 'cat_standard' },
      { row: 'F', catId: 'cat_standard' },
    ]),
  },
  {
    id: 'venue_metropolitan_arena',
    name: 'Horizon Symphony & Arena Hall',
    city: 'Los Angeles, CA',
    address: '1111 S Figueroa St, Arena District',
    type: 'concert_hall',
    rows: 7,
    cols: 12,
    totalCapacity: 84,
    categories: [
      { id: 'cat_pit_vip', name: 'VIP Front Stage', color: '#ec4899', basePrice: 150, description: 'Direct stage proximity with acoustic center' },
      { id: 'cat_gold', name: 'Gold Tier Orchestra', color: '#f59e0b', basePrice: 95, description: 'Orchestra center floor seating' },
      { id: 'cat_silver', name: 'Silver Tier Mezzanine', color: '#06b6d4', basePrice: 65, description: 'Elevated panoramic audio acoustics' },
    ],
    seatLayout: generateVenueLayout(7, 12, [
      { row: 'A', catId: 'cat_pit_vip' },
      { row: 'B', catId: 'cat_pit_vip' },
      { row: 'C', catId: 'cat_gold' },
      { row: 'D', catId: 'cat_gold' },
      { row: 'E', catId: 'cat_silver' },
      { row: 'F', catId: 'cat_silver' },
      { row: 'G', catId: 'cat_silver' },
    ]),
  },
];

function generateVenueLayout(rows: number, cols: number, rowCatMap: { row: string; catId: string }[]) {
  const layout = [];
  const rowLetters = 'ABCDEFGH'.split('');
  for (let r = 0; r < rows; r++) {
    const rowChar = rowLetters[r];
    const mapEntry = rowCatMap.find(m => m.row === rowChar);
    const catId = mapEntry ? mapEntry.catId : 'cat_standard';
    for (let c = 1; c <= cols; c++) {
      const isAisle = (cols === 10 && (c === 3 || c === 8)) || (cols === 12 && (c === 4 || c === 9));
      const isAccessible = r === rows - 1 && (c === 1 || c === cols);
      layout.push({
        id: `${rowChar}${c}`,
        row: rowChar,
        col: c,
        categoryId: catId,
        isAisle,
        isAccessible,
      });
    }
  }
  return layout;
}

export function generateEventSeats(venue: Venue, customPrices?: Record<string, number>, presetOccupancy: 'empty' | 'partial' | 'sold_out' = 'partial') {
  const seats: Record<string, import('../types').Seat> = {};
  const catPriceMap = customPrices || venue.categories.reduce((acc, cat) => {
    acc[cat.id] = cat.basePrice;
    return acc;
  }, {} as Record<string, number>);

  venue.seatLayout.forEach(slot => {
    const cat = venue.categories.find(c => c.id === slot.categoryId) || venue.categories[0];
    const price = catPriceMap[cat.id] ?? cat.basePrice;
    let status: import('../types').SeatStatus = 'available';

    if (presetOccupancy === 'sold_out') {
      status = 'booked';
    } else if (presetOccupancy === 'partial') {
      // Create a realistic mix of booked, held, and available seats
      const hash = (slot.row.charCodeAt(0) * 31 + slot.col) % 10;
      if (hash < 4) {
        status = 'booked';
      }
    }

    seats[slot.id] = {
      id: slot.id,
      row: slot.row,
      col: slot.col,
      categoryId: cat.id,
      categoryName: cat.name,
      price,
      status,
      isAccessible: slot.isAccessible,
    };
  });

  return seats;
}

export const INITIAL_EVENTS: EventShow[] = [
  {
    id: 'evt_dune_2',
    title: 'Dune: Part Two (IMAX 70mm Experience)',
    type: 'movie',
    genre: 'Sci-Fi / Adventure / Epic',
    rating: 'PG-13',
    durationMinutes: 166,
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family in glorious full-format IMAX presentation.',
    venueId: 'venue_imax_grand',
    venueName: 'Grand Dolby IMAX Auditorium',
    venueAddress: '750 Howard St, Downtown, San Francisco, CA',
    dateTime: '2026-08-28T19:30:00.000Z',
    categoryPricing: {
      cat_vip: 32,
      cat_premium: 24,
      cat_standard: 18,
    },
    seats: generateEventSeats(INITIAL_VENUES[0], { cat_vip: 32, cat_premium: 24, cat_standard: 18 }, 'partial'),
    isSoldOut: false,
    organiserId: 'user_organiser_1',
    organiserName: 'Luna Live Productions',
    status: 'active',
    tags: ['IMAX 70mm', 'Dolby Atmos', 'Laser 4K', 'High Demand'],
  },
  {
    id: 'evt_taylor_swift',
    title: 'Taylor Swift: The Eras Tour (Grand Concert Special)',
    type: 'concert',
    genre: 'Pop / Stadium Tour / Live',
    rating: 'All Ages',
    durationMinutes: 195,
    posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    description: 'A once-in-a-lifetime retrospective journey through all 10 eras of her legendary musical career with high-octane stadium pyrotechnics.',
    venueId: 'venue_metropolitan_arena',
    venueName: 'Horizon Symphony & Arena Hall',
    venueAddress: '1111 S Figueroa St, Arena District, Los Angeles, CA',
    dateTime: '2026-08-29T20:00:00.000Z',
    categoryPricing: {
      cat_pit_vip: 190,
      cat_gold: 120,
      cat_silver: 80,
    },
    seats: generateEventSeats(INITIAL_VENUES[1], { cat_pit_vip: 190, cat_gold: 120, cat_silver: 80 }, 'sold_out'),
    isSoldOut: true, // Perfect for testing waitlist join and auto-assignment!
    organiserId: 'user_organiser_1',
    organiserName: 'Luna Live Productions',
    status: 'active',
    tags: ['Sold Out', 'Waitlist Active', 'Exclusive Stage', 'VIP Pit'],
  },
  {
    id: 'evt_hans_zimmer',
    title: 'Hans Zimmer Live: World of Symphonic Cinema',
    type: 'concert',
    genre: 'Orchestral / Film Score / Epic',
    rating: 'All Ages',
    durationMinutes: 150,
    posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&auto=format&fit=crop&q=80',
    description: 'Oscar-winning maestro Hans Zimmer conducts a 100-piece orchestra and choir performing the thunderous themes of Interstellar, Inception, Gladiator, and Dune.',
    venueId: 'venue_metropolitan_arena',
    venueName: 'Horizon Symphony & Arena Hall',
    venueAddress: '1111 S Figueroa St, Arena District, Los Angeles, CA',
    dateTime: '2026-09-02T19:00:00.000Z',
    categoryPricing: {
      cat_pit_vip: 160,
      cat_gold: 105,
      cat_silver: 70,
    },
    seats: generateEventSeats(INITIAL_VENUES[1], { cat_pit_vip: 160, cat_gold: 105, cat_silver: 70 }, 'partial'),
    isSoldOut: false,
    organiserId: 'user_organiser_1',
    organiserName: 'Luna Live Productions',
    status: 'active',
    tags: ['Live Orchestra', 'Immersive Surround', 'Concert Hall'],
  },
  {
    id: 'evt_oppenheimer',
    title: 'Oppenheimer (70mm Master Screening + Q&A)',
    type: 'movie',
    genre: 'Historical Drama / Thriller',
    rating: 'R',
    durationMinutes: 180,
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb, shown in genuine 70mm celluloid projection.',
    venueId: 'venue_imax_grand',
    venueName: 'Grand Dolby IMAX Auditorium',
    venueAddress: '750 Howard St, Downtown, San Francisco, CA',
    dateTime: '2026-09-05T18:00:00.000Z',
    categoryPricing: {
      cat_vip: 30,
      cat_premium: 22,
      cat_standard: 17,
    },
    seats: generateEventSeats(INITIAL_VENUES[0], { cat_vip: 30, cat_premium: 22, cat_standard: 17 }, 'partial'),
    isSoldOut: false,
    organiserId: 'user_organiser_1',
    organiserName: 'Luna Live Productions',
    status: 'active',
    tags: ['70mm Film', 'Director Cut', 'Dolby Cinema'],
  },
];

const STORAGE_KEYS = {
  USERS: 'omniticket_users_v2',
  ACTIVE_USER: 'omniticket_active_user_v2',
  VENUES: 'omniticket_venues_v2',
  EVENTS: 'omniticket_events_v2',
  HOLDS: 'omniticket_holds_v2',
  BOOKINGS: 'omniticket_bookings_v2',
  WAITLISTS: 'omniticket_waitlists_v2',
  EMAILS: 'omniticket_emails_v2',
  METRICS: 'omniticket_metrics_v2',
  TTL_CONFIG: 'omniticket_ttl_config_v2',
};

export interface TTLConfig {
  holdDurationSeconds: number; // default 600 (10 mins)
  waitlistOfferDurationSeconds: number; // default 600 (10 mins)
}

export const DEFAULT_TTL_CONFIG: TTLConfig = {
  holdDurationSeconds: 600, // 10 minutes
  waitlistOfferDurationSeconds: 600, // 10 minutes
};

export class AppStorage {
  static getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  }

  static getActiveUser(): User {
    const users = this.getUsers();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    const found = users.find(u => u.id === activeId);
    if (found) return found;
    this.setActiveUser(users[0]);
    return users[0];
  }

  static setActiveUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, user.id);
  }

  static getVenues(): Venue[] {
    const data = localStorage.getItem(STORAGE_KEYS.VENUES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.VENUES, JSON.stringify(INITIAL_VENUES));
      return INITIAL_VENUES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_VENUES;
    }
  }

  static saveVenues(venues: Venue[]): void {
    localStorage.setItem(STORAGE_KEYS.VENUES, JSON.stringify(venues));
  }

  static getEvents(): EventShow[] {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_EVENTS;
    }
  }

  static saveEvents(events: EventShow[]): void {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  static getHolds(): SeatHold[] {
    const data = localStorage.getItem(STORAGE_KEYS.HOLDS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveHolds(holds: SeatHold[]): void {
    localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds));
  }

  static getBookings(): Booking[] {
    const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveBookings(bookings: Booking[]): void {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  static getWaitlists(): WaitlistEntry[] {
    const data = localStorage.getItem(STORAGE_KEYS.WAITLISTS);
    if (!data) {
      // Initialize with sample waitlist entry for the sold-out Taylor Swift event
      const sampleWaitlist: WaitlistEntry[] = [
        {
          id: 'wl_sample_1',
          eventId: 'evt_taylor_swift',
          eventTitle: 'Taylor Swift: The Eras Tour (Grand Concert Special)',
          eventDate: '2026-08-29T20:00:00.000Z',
          venueName: 'Horizon Symphony & Arena Hall',
          categoryId: 'cat_pit_vip',
          categoryName: 'VIP Front Stage',
          userId: 'user_customer_2',
          userName: 'Sarah Chen',
          userEmail: 'sarah.chen@example.com',
          joinedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'waiting',
          history: [{ action: 'Joined Priority Queue', timestamp: new Date(Date.now() - 3600000).toISOString() }],
        },
      ];
      localStorage.setItem(STORAGE_KEYS.WAITLISTS, JSON.stringify(sampleWaitlist));
      return sampleWaitlist;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveWaitlists(entries: WaitlistEntry[]): void {
    localStorage.setItem(STORAGE_KEYS.WAITLISTS, JSON.stringify(entries));
  }

  static getEmails(): EmailNotification[] {
    const data = localStorage.getItem(STORAGE_KEYS.EMAILS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveEmails(emails: EmailNotification[]): void {
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(emails));
  }

  static addEmail(email: EmailNotification): void {
    const emails = this.getEmails();
    emails.unshift(email);
    this.saveEmails(emails);
  }

  static getMetrics(): SystemMetrics {
    const data = localStorage.getItem(STORAGE_KEYS.METRICS);
    if (!data) {
      const initial: SystemMetrics = {
        totalBookings: 24,
        totalRevenue: 3450,
        concurrencyCollisionsPrevented: 0,
        autoReleasedHoldsCount: 0,
        waitlistReallocationsCount: 0,
        activeHoldsCount: 0,
      };
      localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        concurrencyCollisionsPrevented: 0,
        autoReleasedHoldsCount: 0,
        waitlistReallocationsCount: 0,
        activeHoldsCount: 0,
      };
    }
  }

  static updateMetrics(updater: (prev: SystemMetrics) => SystemMetrics): void {
    const current = this.getMetrics();
    const updated = updater(current);
    localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(updated));
  }

  static getTTLConfig(): TTLConfig {
    const data = localStorage.getItem(STORAGE_KEYS.TTL_CONFIG);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TTL_CONFIG, JSON.stringify(DEFAULT_TTL_CONFIG));
      return DEFAULT_TTL_CONFIG;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_TTL_CONFIG;
    }
  }

  static saveTTLConfig(config: TTLConfig): void {
    localStorage.setItem(STORAGE_KEYS.TTL_CONFIG, JSON.stringify(config));
  }

  static resetToDefaults(): void {
    localStorage.clear();
    this.getUsers();
    this.getVenues();
    this.getEvents();
    this.getWaitlists();
    this.getMetrics();
    this.getTTLConfig();
  }
}
